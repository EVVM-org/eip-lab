import { NextRequest, NextResponse } from "next/server";
import {
  chatCompletion,
  type ChatMessage,
  type VeniceError,
} from "@/lib/venice";
import { systemPromptFor, type LabPhase } from "@/lib/labPrompts";
import { PROVIDERS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  if (!["summarize", "map", "contracts"].includes(phase)) {
    return NextResponse.json({ error: "invalid phase" }, { status: 400 });
  }

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

  try {
    // Contracts phase emits multiple full files — give it real room,
    // but never exceed the model's own max-completion limit.
    const desired = phase === "contracts" ? 32000 : 4096;
    const cap = body.maxCompletionTokens && body.maxCompletionTokens > 0
      ? body.maxCompletionTokens
      : desired;
    const maxTokens = Math.min(desired, cap);

    const result = await chatCompletion(body.apiKey, {
      model: body.model,
      messages,
      maxTokens,
      temperature: phase === "contracts" ? 0.2 : 0.4,
      stripThinking: body.stripThinking ?? true,
    }, provider.baseUrl);

    // Research telemetry: counts only. No key, no content.
    if (result.usage) {
      console.log(
        `[lab/chat] provider=${provider.id} model=${result.model} phase=${phase} ` +
          `prompt_tokens=${result.usage.prompt_tokens} ` +
          `completion_tokens=${result.usage.completion_tokens} ` +
          `total_tokens=${result.usage.total_tokens}`,
      );
    }

    return NextResponse.json({
      content: result.content,
      model: result.model,
      usage: result.usage,
      truncated: result.finishReason === "length",
    });
  } catch (err) {
    const e = err as VeniceError;
    return NextResponse.json(
      { error: e.message ?? "chat failed" },
      { status: e.status && e.status >= 400 ? e.status : 502 },
    );
  }
}
