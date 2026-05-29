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
