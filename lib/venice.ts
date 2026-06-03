/**
 * Venice AI client — server-side only.
 *
 * Venice implements the OpenAI API spec, so this is a thin
 * OpenAI-compatible client. The user's API key is passed in per call
 * and NEVER persisted: it lives only for the duration of the request.
 *
 * Base URL: https://api.venice.ai/api/v1
 *   - GET  /models
 *   - POST /chat/completions
 */

const VENICE_BASE = "https://api.venice.ai/api/v1";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatResult {
  content: string;
  model: string;
  usage: ChatUsage | null;
  /** "stop" = complete; "length" = hit max_tokens (truncated). */
  finishReason: string | null;
}

export interface VeniceError {
  status: number;
  message: string;
}

/** Rich model info parsed from Venice's /models model_spec. */
export interface ModelInfo {
  id: string;
  contextTokens?: number;
  maxCompletionTokens?: number;
  optimizedForCode?: boolean;
  supportsReasoning?: boolean;
  /** USD per 1M input (prompt) tokens. */
  inputUsdPerMtok?: number;
  /** USD per 1M output (completion) tokens. */
  outputUsdPerMtok?: number;
}

interface RawModel {
  id: string;
  model_spec?: {
    availableContextTokens?: number;
    maxCompletionTokens?: number;
    optimizedForCode?: boolean;
    supportsReasoning?: boolean;
    pricing?: {
      input?: { usd?: number };
      output?: { usd?: number };
    };
  };
}

function parseModel(m: RawModel): ModelInfo {
  const s = m.model_spec ?? {};
  return {
    id: m.id,
    contextTokens: s.availableContextTokens,
    maxCompletionTokens: s.maxCompletionTokens,
    optimizedForCode: s.optimizedForCode,
    supportsReasoning: s.supportsReasoning,
    inputUsdPerMtok: s.pricing?.input?.usd,
    outputUsdPerMtok: s.pricing?.output?.usd,
  };
}

/**
 * List models available to this key, with capability + pricing parsed
 * from Venice's model_spec. Coder-optimized models are sorted first.
 */
export async function listModels(
  apiKey: string,
  baseUrl: string = VENICE_BASE,
): Promise<ModelInfo[]> {
  const res = await fetch(`${baseUrl}/models`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw {
      status: res.status,
      message: text || `Model list failed (${res.status})`,
    } satisfies VeniceError;
  }

  const json = (await res.json()) as { data?: RawModel[] };
  const models = (json.data ?? [])
    .filter((m) => m.id)
    .map(parseModel);

  // Coder models first, then the rest, each alphabetical.
  return models.sort((a, b) => {
    const ac = a.optimizedForCode ? 0 : 1;
    const bc = b.optimizedForCode ? 0 : 1;
    if (ac !== bc) return ac - bc;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Run a chat completion. Non-streaming for simplicity (the EIP-lab
 * flow is turn-based, not token-streamed). Returns content + usage so
 * the caller can surface token counts for the cost-research data.
 */
export async function chatCompletion(
  apiKey: string,
  params: {
    model: string;
    messages: ChatMessage[];
    maxTokens?: number;
    temperature?: number;
    /** Append Venice's strip_thinking_response feature suffix. */
    stripThinking?: boolean;
  },
  baseUrl: string = VENICE_BASE,
): Promise<ChatResult> {
  // Venice feature-suffix system: parameters can be passed through the
  // model id. strip_thinking_response keeps reasoning-model <thinking>
  // blocks out of the content so they don't pollute the .sol output.
  const modelId = params.stripThinking
    ? `${params.model}:strip_thinking_response=true`
    : params.model;
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      messages: params.messages,
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature ?? 0.4,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw {
      status: res.status,
      message: text || `Chat completion failed (${res.status})`,
    } satisfies VeniceError;
  }

  const json = (await res.json()) as {
    choices?: Array<{
      message?: { content?: string };
      finish_reason?: string;
    }>;
    model?: string;
    usage?: ChatUsage;
  };

  return {
    content: json.choices?.[0]?.message?.content ?? "",
    model: json.model ?? params.model,
    usage: json.usage ?? null,
    finishReason: json.choices?.[0]?.finish_reason ?? null,
  };
}

export interface StreamEvent {
  /** Answer content — feeds the visible output and the generated files. */
  delta?: string;
  /** Reasoning/thinking content — shown as live progress, NOT put in files. */
  reasoning?: string;
  usage?: ChatUsage;
  finishReason?: string;
}

/**
 * Streaming chat completion. Yields content deltas as they arrive, plus
 * a final usage/finishReason. Streaming keeps the connection alive so
 * long generations don't look frozen and don't trip serverless timeouts.
 *
 * IMPORTANT — reasoning handling: we do NOT use Venice's
 * `strip_thinking_response=true`. On heavy-reasoning models that suffix
 * makes the API send *nothing at all* for the entire (multi-minute)
 * thinking window, which looks identical to a dead connection and trips
 * any stall ceiling. Instead we let the reasoning stream and separate it
 * here: a model's thinking arrives either as a `reasoning_content` delta
 * field or inline inside `<think>…</think>` tags in `content`. We surface
 * thinking as `{reasoning}` events (so the connection stays demonstrably
 * alive and the UI can show progress) and the real answer as `{delta}`
 * events (which become the files). The `stripThinking` flag is kept for
 * the API signature but no longer changes the request — separation is
 * always done locally so we never get a dead window.
 */
export async function* streamChatCompletion(
  apiKey: string,
  params: {
    model: string;
    messages: ChatMessage[];
    maxTokens?: number;
    temperature?: number;
    stripThinking?: boolean;
    /**
     * Output-length field name. Venice uses "max_tokens"; OpenAI's
     * reasoning models require "max_completion_tokens". Default
     * "max_tokens" for back-compat.
     */
    tokenParam?: "max_tokens" | "max_completion_tokens";
    /**
     * Whether to send a custom temperature. OpenAI reasoning models 400
     * on any non-default value, so the caller sets this false for OpenAI.
     * Default true.
     */
    sendTemperature?: boolean;
  },
  baseUrl: string = VENICE_BASE,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const modelId = params.model;

  const reqBody: Record<string, unknown> = {
    model: modelId,
    messages: params.messages,
    [params.tokenParam ?? "max_tokens"]: params.maxTokens ?? 4096,
    stream: true,
    stream_options: { include_usage: true },
  };
  if (params.sendTemperature ?? true) {
    reqBody.temperature = params.temperature ?? 0.4;
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reqBody),
    signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw {
      status: res.status,
      message: text || `Chat stream failed (${res.status})`,
    } satisfies VeniceError;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  // Stateful splitter for inline <think>…</think> tags in `content`.
  // Tags can be split across SSE chunks, so we keep a small carry tail
  // (never emitting the last few chars that could be a partial tag).
  const OPEN = "<think>";
  const CLOSE = "</think>";
  let inThink = false;
  let tagBuf = "";
  function splitThink(text: string, flush = false): StreamEvent[] {
    const out: StreamEvent[] = [];
    tagBuf += text;
    for (;;) {
      if (!inThink) {
        const i = tagBuf.indexOf(OPEN);
        if (i === -1) {
          const keep = flush ? 0 : OPEN.length - 1;
          const safe = tagBuf.length - keep;
          if (safe > 0) {
            out.push({ delta: tagBuf.slice(0, safe) });
            tagBuf = tagBuf.slice(safe);
          }
          break;
        }
        if (i > 0) out.push({ delta: tagBuf.slice(0, i) });
        tagBuf = tagBuf.slice(i + OPEN.length);
        inThink = true;
      } else {
        const j = tagBuf.indexOf(CLOSE);
        if (j === -1) {
          const keep = flush ? 0 : CLOSE.length - 1;
          const safe = tagBuf.length - keep;
          if (safe > 0) {
            out.push({ reasoning: tagBuf.slice(0, safe) });
            tagBuf = tagBuf.slice(safe);
          }
          break;
        }
        if (j > 0) out.push({ reasoning: tagBuf.slice(0, j) });
        tagBuf = tagBuf.slice(j + CLOSE.length);
        inThink = false;
      }
    }
    return out;
  }

  let done = false;
  while (!done) {
    const { done: rDone, value } = await reader.read();
    if (rDone) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const data = t.slice(5).trim();
      if (data === "[DONE]") {
        done = true;
        break;
      }
      try {
        const json = JSON.parse(data) as {
          choices?: Array<{
            delta?: { content?: string; reasoning_content?: string };
            finish_reason?: string;
          }>;
          usage?: ChatUsage;
        };
        const d = json.choices?.[0]?.delta;
        // Reasoning delivered as a dedicated field (DeepSeek-style).
        if (d?.reasoning_content) yield { reasoning: d.reasoning_content };
        // Answer content, with any inline <think> tags peeled off.
        if (d?.content) {
          for (const ev of splitThink(d.content)) yield ev;
        }
        const fr = json.choices?.[0]?.finish_reason;
        if (fr) yield { finishReason: fr };
        if (json.usage) yield { usage: json.usage };
      } catch {
        /* skip malformed SSE line */
      }
    }
  }
  // Flush any buffered tail (partial tag that never completed).
  for (const ev of splitThink("", true)) yield ev;
}
