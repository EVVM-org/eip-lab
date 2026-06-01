/**
 * Parse the contracts-phase model output into named files.
 *
 * The contracts system prompt instructs the model to precede each
 * fenced code block with a line of the form:
 *
 *     FILE: contracts/Name.sol
 *     ```solidity
 *     ...
 *     ```
 *
 * This parser is tolerant: it pairs each `FILE:` marker with the next
 * fenced block. If the model omits markers entirely, it falls back to
 * extracting bare fenced solidity blocks and naming them sequentially.
 */

export interface LabFile {
  path: string;
  content: string;
  lang: "solidity" | "markdown" | "text";
}

const FILE_MARKER = /^[ \t>*-]*FILE:\s*(.+?)\s*$/im;
const FENCE = /```[a-zA-Z]*\n([\s\S]*?)```/g;

function langForPath(path: string): LabFile["lang"] {
  if (path.endsWith(".sol")) return "solidity";
  if (path.endsWith(".md")) return "markdown";
  return "text";
}

export function parseLabFiles(markdown: string): LabFile[] {
  const files: LabFile[] = [];

  // Strategy 1: split on FILE: markers, take the fenced block after each.
  const markerGlobal = /(^|\n)[ \t>*-]*FILE:\s*(.+?)\s*\n/gi;
  const segments: { path: string; from: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = markerGlobal.exec(markdown)) !== null) {
    segments.push({ path: m[2].trim(), from: m.index + m[0].length });
  }

  if (segments.length > 0) {
    for (let i = 0; i < segments.length; i++) {
      const start = segments[i].from;
      const end = i + 1 < segments.length ? segments[i + 1].from : markdown.length;
      const chunk = markdown.slice(start, end);
      const fence = /```[a-zA-Z]*\n([\s\S]*?)```/.exec(chunk);
      const content = fence ? fence[1] : chunk.trim();
      const path = sanitizePath(segments[i].path);
      if (content.trim()) {
        files.push({ path, content: content.replace(/\s+$/, "") + "\n", lang: langForPath(path) });
      }
    }
    return dedupeByPath(files);
  }

  // Strategy 2 (fallback): bare fenced blocks, named sequentially.
  let idx = 0;
  let fence: RegExpExecArray | null;
  FENCE.lastIndex = 0;
  while ((fence = FENCE.exec(markdown)) !== null) {
    const content = fence[1];
    if (!content.trim()) continue;
    const looksSolidity = /pragma solidity|contract\s+\w+|SPDX-License/.test(content);
    const path = looksSolidity
      ? `contracts/Contract${idx === 0 ? "" : idx}.sol`
      : `file${idx}.txt`;
    files.push({
      path,
      content: content.replace(/\s+$/, "") + "\n",
      lang: langForPath(path),
    });
    idx++;
  }

  return files;
}

/**
 * Dedupe files by path. When the same path appears more than once
 * (e.g. a "continue"/"keep going" turn re-emits a file), keep the
 * LONGER version — a regenerated full file beats a truncated stub,
 * and a complete file beats a partial one. Preserves first-seen order.
 */
function dedupeByPath(files: LabFile[]): LabFile[] {
  const byPath = new Map<string, LabFile>();
  for (const f of files) {
    const existing = byPath.get(f.path);
    if (!existing || f.content.length >= existing.content.length) {
      byPath.set(f.path, f);
    }
  }
  return Array.from(byPath.values());
}

function sanitizePath(raw: string): string {
  // Strip leading slashes and any path traversal; keep it inside the
  // experiment folder.
  let p = raw.replace(/^[./\\]+/, "").replace(/\.\.+/g, ".");
  // Backticks and quotes sometimes cling to the marker.
  p = p.replace(/[`'"]/g, "").trim();
  if (!p) p = "contracts/Unnamed.sol";
  return p;
}
