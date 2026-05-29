/**
 * Auto-detect EIP / forum / repo links inside free-form input.
 *
 * Used by the Lab's EIP input box so a user can paste hundreds of
 * lines of EIP text AND/OR drop a few links, and we classify what
 * they gave us. No character limit anywhere.
 */

export type LinkKind = "eip" | "forum" | "repo" | "other";

export interface DetectedLink {
  url: string;
  kind: LinkKind;
  /** For EIP links, the EIP number if we can parse it. */
  eipNumber?: string;
}

const URL_RE = /\bhttps?:\/\/[^\s<>"')]+/gi;

export function classifyUrl(url: string): DetectedLink {
  let host = "";
  let path = "";
  try {
    const u = new URL(url);
    host = u.hostname.toLowerCase();
    path = u.pathname;
  } catch {
    return { url, kind: "other" };
  }

  // EIP canonical pages
  if (host === "eips.ethereum.org") {
    const m = path.match(/eip-(\d+)/i);
    return { url, kind: "eip", eipNumber: m?.[1] };
  }

  // EIP markdown in the ethereum/EIPs repo
  if (host.includes("github.com") && /\/EIPs?\//i.test(url)) {
    const m = url.match(/eip-(\d+)/i);
    return { url, kind: "eip", eipNumber: m?.[1] };
  }

  // Ethereum Magicians + ethresear.ch discussion forums
  if (
    host.includes("ethereum-magicians.org") ||
    host.includes("ethresear.ch")
  ) {
    return { url, kind: "forum" };
  }

  // Code repos
  if (
    host.includes("github.com") ||
    host.includes("gitlab.com") ||
    host.includes("codeberg.org")
  ) {
    return { url, kind: "repo" };
  }

  return { url, kind: "other" };
}

export function detectLinks(text: string): DetectedLink[] {
  const matches = text.match(URL_RE) ?? [];
  const seen = new Set<string>();
  const out: DetectedLink[] = [];
  for (const raw of matches) {
    // Strip trailing punctuation that commonly clings to pasted URLs
    const url = raw.replace(/[.,;:]+$/, "");
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(classifyUrl(url));
  }
  return out;
}

/** True if the input is essentially just a link (or links), no prose. */
export function isLinkOnly(text: string): boolean {
  const stripped = text.replace(URL_RE, "").trim();
  return stripped.length === 0 && (text.match(URL_RE)?.length ?? 0) > 0;
}
