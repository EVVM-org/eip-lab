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

/** List models available to this key. Returns model id strings. */
export async function listModels(
  apiKey: string,
  baseUrl: string = VENICE_BASE,
): Promise<string[]> {
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

  const json = (await res.json()) as { data?: Array<{ id: string }> };
  return (json.data ?? []).map((m) => m.id).filter(Boolean);
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
  },
  baseUrl: string = VENICE_BASE,
): Promise<ChatResult> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
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
