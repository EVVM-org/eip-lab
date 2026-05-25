"use client";

import WindowFrame from "@/components/ui/WindowFrame";
import ContractBadge from "./ContractBadge";
import DocsLink from "./DocsLink";
import type { LoadedContract } from "@/lib/demos";

interface CodeViewerProps {
  contract: LoadedContract;
}

/**
 * Renders Shiki-highlighted Solidity inside a Win98 window. HTML
 * comes pre-rendered from build time (lib/shiki.ts);
 * dangerouslySetInnerHTML is safe because input is trusted demo
 * content.
 */
export default function CodeViewer({ contract }: CodeViewerProps) {
  return (
    <WindowFrame
      title={contract.path}
      accent="purple"
      controls
      flush
      className="h-full"
    >
      <div className="flex h-full flex-col">
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-2">
            <ContractBadge type={contract.type} />
          </div>
          <div className="flex items-center gap-3 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">
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
    </WindowFrame>
  );
}
