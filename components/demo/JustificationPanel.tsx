"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ContractBadge from "./ContractBadge";
import type { LoadedContract } from "@/lib/demos";
import { justificationMarkdownComponents } from "@/lib/markdown";

interface JustificationPanelProps {
  selectedContract: LoadedContract;
  fullJustificationMarkdown: string;
}

/**
 * Right panel. Shows:
 *   (top) The selected contract's manifest entry — type + why
 *   (below) The whole justification.md, scrollable
 */
export default function JustificationPanel({
  selectedContract,
  fullJustificationMarkdown,
}: JustificationPanelProps) {
  return (
    <div className="flex h-full flex-col panel border-glow-cyan overflow-hidden">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5">
        <div className="flex items-center justify-between">
          <span className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
            why this contract
          </span>
          <ContractBadge type={selectedContract.type} />
        </div>
      </div>

      <div className="overflow-auto">
        <section className="border-b border-[var(--color-border)] px-5 py-4">
          <h3 className="mb-2 font-[family-name:var(--font-mono)] text-sm font-semibold text-[var(--color-neon-pink)]">
            {selectedContract.basename}
          </h3>
          <p className="text-sm leading-relaxed text-[var(--color-text)]">
            {selectedContract.why}
          </p>
          {selectedContract.docsLink && (
            <p className="mt-3 text-xs text-[var(--color-text-muted)]">
              Canonical reference:{" "}
              <a
                href={selectedContract.docsLink}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--color-neon-cyan)]"
              >
                {selectedContract.docsLink}
              </a>
            </p>
          )}
        </section>

        <section className="px-5 py-4">
          <div className="prose-vaporwave">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={justificationMarkdownComponents}
            >
              {fullJustificationMarkdown}
            </ReactMarkdown>
          </div>
        </section>
      </div>
    </div>
  );
}
