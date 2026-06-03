import { NextRequest, NextResponse } from "next/server";
import {
  streamChatCompletion,
  type ChatMessage,
  type ChatUsage,
  type VeniceError,
} from "@/lib/venice";
import { systemPromptFor, type LabPhase } from "@/lib/labPrompts";
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
 *   phase: "summarize" | "map" | "contracts",
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
  const phase: LabPhase = body.phase ?? "summarize";
  if (!["summarize", "map", "contracts", "review"].includes(phase)) {
    return NextResponse.json({ error: "invalid phase" }, { status: 400 });
  }
  const heavyPhase = phase === "contracts" || phase === "review";

  const turns = Array.isArray(body.messages) ? body.messages : [];

  const systemContent =
    systemPromptFor(phase) +
    (body.eipContext
      ? `\n\n--- EIP MATERIAL PROVIDED BY THE USER ---\n${body.eipContext}\n--- END EIP MATERIAL ---`
      : "");

  const messages: ChatMessage[] = [
    { role: "system", content: systemContent },
    ...turns.filter((m) => m.role === "user" || m.role === "assistant"),
  ];

  // Contracts/review phases emit multiple full files — give them real
  // room, but never exceed the model's own max-completion limit.
  const desired = heavyPhase ? 32000 : 4096;
  const cap =
    body.maxCompletionTokens && body.maxCompletionTokens > 0
      ? body.maxCompletionTokens
      : desired;
  const maxTokens = Math.min(desired, cap);

  const apiKey = body.apiKey;
  const model = body.model;
  const stripThinking = body.stripThinking ?? true;
  const baseUrl = provider.baseUrl;
  const providerId = provider.id;

  // Stream NDJSON: one JSON object per line.
  //   {"delta":"..."}                  incremental text
  //   {"usage":{...},"finishReason":"stop","truncated":false}  final
  //   {"error":"..."}                  failure
  // Rough token estimate for when the provider's stream omits usage
  // (Venice streaming doesn't reliably return a usage chunk).
  const promptChars = messages.reduce((n, m) => n + m.content.length, 0);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      let usage: ChatUsage | null = null;
      let finishReason: string | null = null;
      let outChars = 0;
      try {
        for await (const ev of streamChatCompletion(
          apiKey,
          { model, messages, maxTokens, temperature: heavyPhase ? 0.2 : 0.4, stripThinking },
          baseUrl,
        )) {
          if (ev.delta) {
            outChars += ev.delta.length;
            send({ delta: ev.delta });
          }
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
        send({ error: e.message ?? "chat failed" });
      } finally {
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
