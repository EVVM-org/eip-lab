import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/eip/fetch
 * Body: { url: string }
 *
 * Fetches the plain text of an EIP or a discussion thread so the Lab
 * can include it as context. To avoid SSRF, only a small allowlist of
 * known-safe hosts is permitted; anything else is rejected and the
 * user is told to paste the text manually.
 */

const ALLOWED_HOSTS = [
  "eips.ethereum.org",
  "raw.githubusercontent.com",
  "ethereum-magicians.org",
  "ethresear.ch",
];

const MAX_BYTES = 600_000; // ~600 KB cap

export async function POST(req: NextRequest) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!body.url) {
    return NextResponse.json({ error: "missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(body.url);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  if (target.protocol !== "https:") {
    return NextResponse.json({ error: "https only" }, { status: 400 });
  }

  // Normalize ethereum/EIPs github blob → raw for clean markdown.
  if (
    target.hostname === "github.com" &&
    /\/EIPs\/blob\//i.test(target.pathname)
  ) {
    target = new URL(
      `https://raw.githubusercontent.com${target.pathname.replace("/blob/", "/")}`,
    );
  }

  if (!ALLOWED_HOSTS.includes(target.hostname.toLowerCase())) {
    return NextResponse.json(
      {
        error: `host not allowed: ${target.hostname}. Paste the content manually instead.`,
      },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(target.toString(), {
      headers: { "User-Agent": "EVVM-EIP-Lab/0.1" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `fetch failed (${res.status})` },
        { status: 502 },
      );
    }
    const reader = res.body?.getReader();
    if (!reader) {
      const text = await res.text();
      return NextResponse.json({ text: text.slice(0, MAX_BYTES) });
    }
    // Read with a byte cap.
    let received = 0;
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        received += value.length;
        chunks.push(value);
        if (received > MAX_BYTES) break;
      }
    }
    const buf = Buffer.concat(chunks).subarray(0, MAX_BYTES);
    return NextResponse.json({
      text: buf.toString("utf-8"),
      truncated: received > MAX_BYTES,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
