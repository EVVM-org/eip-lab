import { NextRequest, NextResponse } from "next/server";
import {
  streamChatCompletion,
  type ChatMessage,
  type ChatUsage,
  type VeniceError,
} from "@/lib/venice";
import { systemPromptFor, type LabPhase } from "@/lib/labPrompts";
import { getEvvmContext } from "@/lib/evvmContext";
import { PROVIDERS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The contracts phase can generate for minutes. Ask Vercel for the
// longest allowed function duration (capped to the plan limit:
// 60s on Hobby, up to 300s on Pro). Without this, long generations
// time out and return a non-JSON error page.
export const maxDuration = 300;

/**
 * POST /api/lab/chat
 * Body: {
 *   providerId: string,
 *   apiKey: string,        // user's key — used once, never stored
 *   model: string,
 *   phase: "research" | "contracts" | "review",
 *   messages: ChatMessage[],   // prior turns (user/assistant), no system
 *   eipContext?: string,       // pasted EIP text + fetched link content
 * }
 *
 * Prepends the phase-specific system prompt + EIP context, calls the
 * provider, and returns { content, model, usage }. The usage token
 * counts are returned for the cost-research data; we also console.log
 * them (counts + model + phase only — NEVER the key or message bodies).
 */
export async function POST(req: NextRequest) {
  let body: {
    providerId?: string;
    apiKey?: string;
    model?: string;
    phase?: LabPhase;
    messages?: ChatMessage[];
    eipContext?: string;
    maxCompletionTokens?: number;
    /** The selected model's context window (tokens) — for context budgeting. */
    contextTokens?: number;
    stripThinking?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const provider = PROVIDERS.find((p) => p.id === (body.providerId ?? ""));
  if (!provider || !provider.enabled) {
    return NextResponse.json(
      { error: "unknown or disabled provider" },
      { status: 400 },
    );
  }
  if (!body.apiKey || body.apiKey.length < 8) {
    return NextResponse.json({ error: "missing API key" }, { status: 400 });
  }
  if (!body.model) {
    return NextResponse.json({ error: "missing model" }, { status: 400 });
  }
  const phase: LabPhase = body.phase ?? "research";
  if (!["research", "contracts", "review"].includes(phase)) {
    return NextResponse.json({ error: "invalid phase" }, { status: 400 });
  }
  const heavyPhase = phase === "contracts" || phase === "review";
  // OpenAI's GPT-5 family are reasoning models: hidden reasoning tokens
  // are drawn from the completion budget, so a tight cap on the light
  // phases can be eaten by reasoning and return an empty/truncated answer.
  // sendTemperature=false is our reasoning-provider signal (OpenAI).
  const reasoningProvider = provider.sendTemperature === false;

  const turns = Array.isArray(body.messages) ? body.messages : [];

  // Output budget first (needed for context budgeting below). Contracts/
  // review emit multiple full files — give them room, but never exceed the
  // model's own max-completion limit. Reasoning providers get a higher
  // light-phase floor so hidden reasoning doesn't starve the answer.
  const desired = heavyPhase ? 32000 : reasoningProvider ? 16000 : 4096;
  const capTokens =
    body.maxCompletionTokens && body.maxCompletionTokens > 0
      ? body.maxCompletionTokens
      : desired;
  const maxTokens = Math.min(desired, capTokens);

  // Ground every phase in the full EVVM stack reference so the model
  // understands what each core contract does and what must change to test
  // the EIP. Fetched once and cached; empty string if unavailable.
  const fullEvvmDocs = await getEvvmContext();

  // ── Context budgeting (large-EIP safety) ──────────────────────────────
  // We inject ~290k tokens of EVVM docs PLUS the EIP. A large EIP can push a
  // 400k-context model past its window and hard-fail (400 context_length).
  // Budget the input so (EVVM docs + EIP) fits the model's window with room
  // for the output and the conversation. The EIP is the subject (keep as
  // much as possible); the EVVM reference is grounding (trim to fill the
  // remainder). On 1M-context models nothing is trimmed.
  const sysPromptText = systemPromptFor(phase);
  const CHARS_PER_TOKEN = 4;
  const toTokens = (chars: number) => Math.ceil(chars / CHARS_PER_TOKEN);
  const ctxWindow =
    body.contextTokens && body.contextTokens > 0
      ? body.contextTokens
      : 400_000;
  const turnsChars = turns.reduce((n, m) => n + m.content.length, 0);
  // Reserve the output budget plus a margin for prompt overhead and
  // tokenizer-estimate error.
  const reserveTokens = maxTokens + 12_000;
  const baseTokens = toTokens(sysPromptText.length + turnsChars);
  const availTokens = Math.max(
    4_000,
    ctxWindow - baseTokens - reserveTokens,
  );
  const availChars = availTokens * CHARS_PER_TOKEN;

  let eipMaterial = body.eipContext ?? "";
  let evvmDocs = fullEvvmDocs;
  let eipTrimmed = false;
  let docsTrimmed = false;

  // EIP first, but capped at 65% of the budget so a gigantic EIP can't zero
  // out the grounding when both are large. (If there are no docs, the EIP
  // may use the whole budget.)
  const eipCapChars = Math.floor(availChars * (evvmDocs ? 0.65 : 1));
  if (eipMaterial.length > eipCapChars) {
    eipMaterial =
      eipMaterial.slice(0, eipCapChars) +
      "\n\n[... EIP material truncated to fit the model's context window ...]";
    eipTrimmed = true;
  }
  // Docs take whatever budget remains after the EIP.
  const docsCapChars = Math.max(0, availChars - eipMaterial.length);
  if (evvmDocs.length > docsCapChars) {
    evvmDocs =
      docsCapChars > 2_000
        ? evvmDocs.slice(0, docsCapChars) +
          "\n\n[... EVVM reference truncated to fit the model's context window ...]"
        : "";
    docsTrimmed = true;
  }

  const systemContent =
    sysPromptText +
    (evvmDocs
      ? `\n\n--- EVVM STACK REFERENCE (evvm.info/llms-full.txt) ---\n${evvmDocs}\n--- END EVVM STACK REFERENCE ---`
      : "") +
    (eipMaterial
      ? `\n\n--- EIP MATERIAL PROVIDED BY THE USER ---\n${eipMaterial}\n--- END EIP MATERIAL ---`
      : "");

  const messages: ChatMessage[] = [
    { role: "system", content: systemContent },
    ...turns.filter((m) => m.role === "user" || m.role === "assistant"),
  ];

  // Non-fatal notice if we trimmed to fit (no silent caps).
  let contextNotice: string | null = null;
  if (eipTrimmed || docsTrimmed) {
    const parts: string[] = [];
    if (eipTrimmed) parts.push("the EIP");
    if (docsTrimmed) parts.push("the EVVM reference");
    contextNotice =
      `Large input: trimmed ${parts.join(" and ")} to fit the model's ` +
      `${Math.round(ctxWindow / 1000)}k context. For full grounding on a big EIP, ` +
      `use a 1M-context model (deepseek-v4-pro / claude-*).`;
    console.log(
      `[lab/chat] context budgeted ctx=${ctxWindow} eipTrimmed=${eipTrimmed} docsTrimmed=${docsTrimmed}`,
    );
  }

  const apiKey = body.apiKey;
  const model = body.model;
  const stripThinking = body.stripThinking ?? true;
  const baseUrl = provider.baseUrl;
  const providerId = provider.id;
  const tokenParam = provider.tokenParam;
  const sendTemperature = provider.sendTemperature;

  // Stream NDJSON: one JSON object per line.
  //   {"delta":"..."}                  incremental text
  //   {"usage":{...},"finishReason":"stop","truncated":false}  final
  //   {"error":"..."}                  failure
  // Rough token estimate for when the provider's stream omits usage
  // (Venice streaming doesn't reliably return a usage chunk).
  const promptChars = messages.reduce((n, m) => n + m.content.length, 0);

  const encoder = new TextEncoder();
  // Reasoning models (and Venice's strip_thinking_response) can stay
  // silent for a long time while the model thinks — no content deltas
  // flow during that window. The client's idle watchdog (45s) would
  // abort a perfectly healthy stream and surface a false "network error".
  // To keep the connection demonstrably alive WITHOUT defeating real
  // stall detection, the server emits a lightweight heartbeat every few
  // seconds — but only while the upstream provider is still within its
  // stall ceiling. If the provider genuinely hangs past the ceiling,
  // heartbeats stop and we abort the upstream fetch so the failure is
  // honest. If the serverless function itself dies, heartbeats also stop
  // and the client watchdog correctly fires.
  const HEARTBEAT_MS = 12_000;
  const PROVIDER_STALL_MS = 180_000; // no provider activity this long = real stall
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      // Surface a context-trim notice up front (non-fatal).
      if (contextNotice) send({ notice: contextNotice });
      let usage: ChatUsage | null = null;
      let finishReason: string | null = null;
      let outChars = 0;

      // Stall watchdog: abort the upstream fetch if the provider sends
      // nothing (not even thinking progress) for PROVIDER_STALL_MS.
      const upstream = new AbortController();
      let lastActivity = Date.now();
      let stalled = false;
      const heartbeat = setInterval(() => {
        if (Date.now() - lastActivity > PROVIDER_STALL_MS) {
          stalled = true;
          upstream.abort();
          return;
        }
        try {
          send({ heartbeat: 1 });
        } catch {
          /* controller closed */
        }
      }, HEARTBEAT_MS);

      try {
        for await (const ev of streamChatCompletion(
          apiKey,
          {
            model,
            messages,
            maxTokens,
            temperature: heavyPhase ? 0.2 : 0.4,
            stripThinking,
            tokenParam,
            sendTemperature,
          },
          baseUrl,
          upstream.signal,
        )) {
          lastActivity = Date.now();
          if (ev.delta) {
            outChars += ev.delta.length;
            send({ delta: ev.delta });
          }
          // Reasoning/thinking content: forward as a distinct event so
          // the client can show live progress. It feeds lastActivity
          // (above), so a long thinking window no longer looks like a
          // stall — but it is NOT part of the answer/files.
          if (ev.reasoning) send({ reasoning: ev.reasoning });
          if (ev.usage) usage = ev.usage;
          if (ev.finishReason) finishReason = ev.finishReason;
        }
        // Estimate usage if the provider didn't send it (~4 chars/token).
        let estimated = false;
        if (!usage) {
          estimated = true;
          usage = {
            prompt_tokens: Math.ceil(promptChars / 4),
            completion_tokens: Math.ceil(outChars / 4),
            total_tokens: Math.ceil((promptChars + outChars) / 4),
          };
        }
        if (usage) {
          // Research telemetry: counts only. No key, no content.
          console.log(
            `[lab/chat] provider=${providerId} model=${model} phase=${phase} ` +
              `prompt_tokens=${usage.prompt_tokens} ` +
              `completion_tokens=${usage.completion_tokens} ` +
              `total_tokens=${usage.total_tokens} estimated=${estimated}`,
          );
        }
        send({
          usage,
          estimated,
          finishReason,
          truncated: finishReason === "length",
        });
      } catch (err) {
        const e = err as VeniceError;
        send({
          error: stalled
            ? `Provider sent nothing for ${Math.round(PROVIDER_STALL_MS / 1000)}s — upstream stalled. Retry the step.`
            : (e.message ?? "chat failed"),
        });
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      // Disable proxy/CDN buffering so deltas flush immediately instead
      // of being held back (which can look like a stall or trip an idle
      // timeout mid-stream).
      "X-Accel-Buffering": "no",
    },
  });
}
