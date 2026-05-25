/**
 * Tiny markdown section parser.
 *
 * Splits a markdown document by heading level (## or ###) into a
 * preamble (everything before the first matching heading) plus an
 * ordered list of {title, body} sections.
 *
 * Intentionally regex-based, not a full markdown parser. Sufficient
 * for the well-shaped justification.md documents the skill produces.
 */

export interface MarkdownSection {
  /** Heading text without the leading `## ` markers. */
  title: string;
  /** Markdown body of the section (no heading line). */
  body: string;
}

export interface SplitResult {
  /** Content before the first heading at the chosen level. */
  preamble: string;
  /** Ordered sections. */
  sections: MarkdownSection[];
}

function splitByLevel(markdown: string, level: 2 | 3): SplitResult {
  const headingPrefix = level === 2 ? "## " : "### ";
  const lines = markdown.split("\n");

  const preambleLines: string[] = [];
  const sections: MarkdownSection[] = [];
  let currentTitle: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith(headingPrefix)) {
      if (currentTitle !== null) {
        sections.push({
          title: currentTitle,
          body: currentLines.join("\n").trim(),
        });
      }
      currentTitle = line.slice(headingPrefix.length).trim();
      currentLines = [];
    } else {
      if (currentTitle === null) {
        preambleLines.push(line);
      } else {
        currentLines.push(line);
      }
    }
  }

  if (currentTitle !== null) {
    sections.push({
      title: currentTitle,
      body: currentLines.join("\n").trim(),
    });
  }

  return {
    preamble: preambleLines.join("\n").trim(),
    sections,
  };
}

export function splitByH2(markdown: string): SplitResult {
  return splitByLevel(markdown, 2);
}

export function splitByH3(markdown: string): SplitResult {
  return splitByLevel(markdown, 3);
}
