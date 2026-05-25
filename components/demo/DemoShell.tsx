"use client";

import { useState } from "react";
import FileTree from "./FileTree";
import CodeViewer from "./CodeViewer";
import JustificationPanel from "./JustificationPanel";
import WindowFrame from "@/components/ui/WindowFrame";
import type { LoadedDemo } from "@/lib/demos";

interface DemoShellProps {
  demo: LoadedDemo;
}

type MobileTab = "files" | "code" | "why";

/**
 * 3-pane file explorer. Desktop: three windows side-by-side. Mobile:
 * tab switcher (files / code / why).
 */
export default function DemoShell({ demo }: DemoShellProps) {
  const [selectedPath, setSelectedPath] = useState(
    demo.contracts[0]?.path ?? "",
  );
  const [mobileTab, setMobileTab] = useState<MobileTab>("code");

  const selected =
    demo.contracts.find((c) => c.path === selectedPath) ?? demo.contracts[0];

  if (!selected) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center text-[var(--color-text-muted)]">
        no contracts in this demo.
      </div>
    );
  }

  function selectFile(path: string) {
    setSelectedPath(path);
    setMobileTab("code");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16">
      {/* Mobile tab switcher */}
      <div className="mb-4 flex gap-2 md:hidden">
        {(["files", "code", "why"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            className={`bevel-raised pixel-edge flex-1 px-3 py-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest ${
              mobileTab === tab
                ? "bevel-active text-[var(--color-vp-pink)]"
                : "text-[var(--color-win-black)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 3-pane grid (desktop) / tabbed view (mobile)
          Compact height: 600px so the layout doesn't dominate the
          viewport. Each pane scrolls independently inside its window. */}
      <div className="grid h-[600px] gap-3 md:grid-cols-[230px_1.1fr_1fr]">
        <div className={`${mobileTab === "files" ? "block" : "hidden"} md:block min-w-0`}>
          <WindowFrame
            title={`files · ${demo.contracts.length}`}
            accent="pink"
            controls={false}
            flush
            className="h-full"
          >
            <div className="h-full overflow-auto py-2">
              <FileTree
                contracts={demo.contracts}
                selectedPath={selected.path}
                onSelect={selectFile}
              />
            </div>
          </WindowFrame>
        </div>

        <div className={`${mobileTab === "code" ? "block" : "hidden"} md:block min-h-0 min-w-0`}>
          <CodeViewer contract={selected} />
        </div>

        <div className={`${mobileTab === "why" ? "block" : "hidden"} md:block min-h-0 min-w-0`}>
          <JustificationPanel
            selectedContract={selected}
            fullJustificationMarkdown={demo.justificationMarkdown}
          />
        </div>
      </div>
    </div>
  );
}
