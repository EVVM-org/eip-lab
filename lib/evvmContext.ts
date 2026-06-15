/**
 * EVVM stack reference loader (server-side).
 *
 * The deep-research flow grounds the model in how EVVM actually works —
 * what each core contract does and what would need to change to test an
 * EIP on it — by injecting the canonical EVVM docs bundle
 * (evvm.info/llms-full.txt) into the system context.
 *
 * The bundle is large, so it's fetched once and cached in module memory
 * (per warm serverless instance) with a TTL. On failure we fall back to
 * the last good copy, or empty string (the flow still runs, just less
 * grounded).
 */

const EVVM_LLMS_URL = "https://www.evvm.info/llms-full.txt";
const TTL_MS = 6 * 60 * 60 * 1000; // 6h
// Cap so a runaway-size doc can't blow the context. ~4 chars/token, so
// ~1.2M chars ≈ 300k tokens of EVVM reference — leaves room for the EIP
// and the conversation inside a 400k+ context window.
const MAX_CHARS = 1_200_000;

let cache: { text: string; at: number } | null = null;
let inflight: Promise<string> | null = null;

export async function getEvvmContext(): Promise<string> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.text;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch(EVVM_LLMS_URL, {
        headers: { Accept: "text/plain" },
      });
      if (!res.ok) throw new Error(`EVVM docs HTTP ${res.status}`);
      let text = await res.text();
      if (text.length > MAX_CHARS) {
        text =
          text.slice(0, MAX_CHARS) +
          "\n\n[... EVVM reference truncated for length ...]";
      }
      cache = { text, at: Date.now() };
      return text;
    } catch (err) {
      console.log(
        `[evvmContext] fetch failed: ${(err as Error).message ?? "unknown"}`,
      );
      return cache?.text ?? "";
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
