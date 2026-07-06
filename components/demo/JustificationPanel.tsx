"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import WindowFrame from "@/components/ui/WindowFrame";
import ContractBadge from "./ContractBadge";
import type { LoadedContract } from "@/lib/demos";
import { justificationMarkdownComponents } from "@/lib/markdown";
import { splitByH2, splitByH3 } from "@/lib/markdownSections";

interface JustificationPanelProps {
  selectedContract: LoadedContract;
  fullJustificationMarkdown: string;
}

/**
 * Right pane. Top: selected contract's manifest entry (type + why).
 * Below: justification.md split into cascade — each `##` is a
 * collapsible section. The "Contracts produced" section further
 * splits by `###` so each contract is its own nested cascade,
 * auto-opened when that contract is selected in the file tree.
 */
export default function JustificationPanel({
  selectedContract,
  fullJustificationMarkdown,
}: JustificationPanelProps) {
  const { sections } = useMemo(
    () => splitByH2(fullJustificationMarkdown),
    [fullJustificationMarkdown],
  );

  // Default-closed cascade. User expands sections as they want.
  // (When they open "Contracts produced" the selected contract auto-
  // opens inside via ContractsCascade.)

  return (
    <WindowFrame
      title="why this contract"
      accent="cyan"
      controls
      flush
      className="h-full"
    >
      <div className="flex h-full flex-col">
        <div
          className="flex items-center justify-between gap-3 border-b px-3 py-2"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">
            {selectedContract.basename}
          </span>
          <ContractBadge type={selectedContract.type} />
        </div>

        <div className="flex-1 overflow-auto">
          {/* Manifest "why" — always visible at the top */}
          <section
            className="border-b px-4 py-3"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            <p className="text-sm leading-relaxed text-[var(--color-text)]">
              {selectedContract.why}
            </p>
            {selectedContract.docsLink && (
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                canonical reference:{" "}
                <a
                  href={selectedContract.docsLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--color-vp-cyan)]"
                >
                  evvm.info ↗
                </a>
              </p>
            )}
          </section>

          {/* Cascade — each ## of justification.md as a collapsible row */}
          <div className="divide-y divide-[rgba(255,255,255,0.06)]">
            {sections.map((sec) => {
              const isContractsSection = /contracts? produced/i.test(sec.title);
              const subCount = isContractsSection
                ? splitByH3(sec.body).sections.length
                : null;
              return (
                <details key={sec.title} className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 hover:bg-[rgba(37,194,160,0.04)]">
                    <span className="text-xs text-[var(--color-vp-pink)] transition-transform group-open:rotate-90">
                      ▶
                    </span>
                    <span className="flex-1 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--color-vp-cyan)] glow-cyan">
                      {sec.title}
                    </span>
                    {subCount !== null && (
                      <span className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-text-dim)]">
                        {subCount} items
                      </span>
                    )}
                  </summary>
                  <div className="px-5 pb-4">
                    {isContractsSection ? (
                      <ContractsCascade
                        body={sec.body}
                        selectedBasename={selectedContract.basename}
                      />
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={justificationMarkdownComponents}
                      >
                        {sec.body}
                      </ReactMarkdown>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      </div>
    </WindowFrame>
  );
}

/**
 * The "Contracts produced" section gets further split by `###` so
 * each contract is its own collapsible row. The one matching the
 * currently selected file in the tree auto-opens.
 */
function ContractsCascade({
  body,
  selectedBasename,
}: {
  body: string;
  selectedBasename: string;
}) {
  const { preamble, sections } = useMemo(() => splitByH3(body), [body]);

  return (
    <div>
      {preamble && (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={justificationMarkdownComponents}
        >
          {preamble}
        </ReactMarkdown>
      )}

      <div className="mt-2 space-y-1">
        {sections.map((sub) => {
          const isOpen = sub.title
            .toLowerCase()
            .includes(selectedBasename.toLowerCase());
          return (
            <details
              key={sub.title}
              open={isOpen}
              className="group border border-[rgba(255,255,255,0.06)]"
            >
              <summary
                className={`flex cursor-pointer list-none items-center gap-2 px-3 py-2 font-[family-name:var(--font-mono)] text-xs ${
                  isOpen
                    ? "bg-[rgba(37,194,160,0.08)] text-[var(--color-vp-pink)]"
                    : "text-[var(--color-text-muted)] hover:bg-[rgba(37,194,160,0.05)]"
                }`}
              >
                <span className="transition-transform group-open:rotate-90">
                  ▶
                </span>
                <span className="truncate">{sub.title}</span>
              </summary>
              <div className="px-3 pb-3 pt-2">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={justificationMarkdownComponents}
                >
                  {sub.body}
                </ReactMarkdown>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
