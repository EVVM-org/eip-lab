"use client";

import ContractBadge from "./ContractBadge";
import DocsLink from "./DocsLink";
import type { LoadedContract } from "@/lib/demos";

interface CodeViewerProps {
  contract: LoadedContract;
}

/**
 * Renders Shiki-highlighted Solidity inside a vaporwave panel chrome.
 * The HTML comes pre-rendered from build time (lib/shiki.ts);
 * dangerouslySetInnerHTML is safe because input is trusted demo content.
 */
export default function CodeViewer({ contract }: CodeViewerProps) {
  return (
    <div className="flex h-full flex-col panel border-glow-purple overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="font-[family-name:var(--font-mono)] text-sm text-[var(--color-text)]">
            {contract.path}
          </span>
          <ContractBadge type={contract.type} />
        </div>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">
          <span>{contract.lineCount} lines</span>
          {contract.docsLink && <DocsLink href={contract.docsLink} />}
        </div>
      </div>
      <div
        className="flex-1 overflow-auto p-4 text-sm leading-relaxed [&_.shiki-code]:!bg-transparent [&_pre]:!bg-transparent"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: contract.highlightedHtml }}
      />
    </div>
  );
}
