/**
 * Shiki setup — runs at build time during SSG, never on the client.
 * The highlighter is created once and reused across all contracts.
 *
 * Theme: dracula (clean readability, dark, matches our vaporwave-dark
 * panel chrome without competing for attention).
 */

import { createHighlighter, type Highlighter } from "shiki";

let highlighterPromise: Promise<Highlighter> | null = null;

export function getShikiHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["dracula"],
      langs: ["solidity", "typescript", "json", "bash", "diff"],
    });
  }
  return highlighterPromise;
}

export async function highlightCode(
  code: string,
  lang: "solidity" | "typescript" | "json" | "bash" | "diff" = "solidity",
): Promise<string> {
  const hl = await getShikiHighlighter();
  return hl.codeToHtml(code, {
    lang,
    theme: "dracula",
    transformers: [
      {
        pre(node) {
          // Strip Shiki's inline background so our panel chrome shows through
          if (typeof node.properties.style === "string") {
            node.properties.style = node.properties.style.replace(
              /background-color:[^;]*;?/,
              "",
            );
          }
          node.properties.class = `shiki-code ${node.properties.class ?? ""}`;
        },
      },
    ],
  });
}

export function languageFromFilename(filename: string): "solidity" | "json" | "typescript" | "bash" {
  if (filename.endsWith(".sol")) return "solidity";
  if (filename.endsWith(".json")) return "json";
  if (filename.endsWith(".ts") || filename.endsWith(".tsx")) return "typescript";
  if (filename.endsWith(".sh")) return "bash";
  return "solidity";
}
