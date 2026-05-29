import { NextRequest, NextResponse } from "next/server";
import { listModels, type VeniceError } from "@/lib/venice";
import { PROVIDERS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/venice/models
 * Body: { providerId: string, apiKey: string }
 *
 * Proxies the provider's model-list endpoint using the user's key.
 * The key is read from the body, used once, and discarded — never
 * persisted, never logged.
 */
export async function POST(req: NextRequest) {
  let body: { providerId?: string; apiKey?: string };
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

  try {
    const models = await listModels(body.apiKey, provider.baseUrl);
    return NextResponse.json({
      models: models.length ? models : provider.fallbackModels,
    });
  } catch (err) {
    const e = err as VeniceError;
    // Fall back to the static list so the UI still works if the
    // provider's /models call is unavailable.
    return NextResponse.json(
      {
        models: provider.fallbackModels,
        warning: e.message ?? "model list unavailable; using fallback",
      },
      { status: 200 },
    );
  }
}
