"use client";

import { useState } from "react";
import FileTree from "./FileTree";
import CodeViewer from "./CodeViewer";
import JustificationPanel from "./JustificationPanel";
import SkillFooter from "./SkillFooter";
import type { LoadedDemo } from "@/lib/demos";

interface DemoShellProps {
  demo: LoadedDemo;
}

type MobileTab = "files" | "code" | "why";

/**
 * The 3-pane file explorer. Desktop = three columns side by side.
 * Mobile = tab switcher (files / code / why).
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
        No contracts in this demo.
      </div>
    );
  }

  function selectFile(path: string) {
    setSelectedPath(path);
    setMobileTab("code");
  }

  return (
    <div className="mx-auto max-w-7xl px-6 pb-16">
      {/* Mobile tab switcher */}
      <div className="mb-4 flex gap-2 md:hidden">
        {(["files", "code", "why"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            className={`flex-1 rounded-sm border px-3 py-2 text-xs uppercase tracking-widest ${
              mobileTab === tab
                ? "border-[var(--color-neon-pink)] bg-[rgba(255,0,110,0.1)] text-[var(--color-neon-pink)] glow-pink"
                : "border-[var(--color-border)] bg-[var(--color-bg-panel)] text-[var(--color-text-muted)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 3-pane grid (desktop) / tabbed view (mobile) */}
      <div className="grid h-[70vh] gap-4 md:grid-cols-[260px_1fr_400px]">
        <div
          className={`${
            mobileTab === "files" ? "block" : "hidden"
          } md:block panel border-glow-pink overflow-hidden`}
        >
          <div className="border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5">
            <span className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
              files · {demo.contracts.length}
            </span>
          </div>
          <div className="h-full overflow-auto py-2">
            <FileTree
              contracts={demo.contracts}
              selectedPath={selected.path}
              onSelect={selectFile}
            />
          </div>
        </div>

        <div className={`${mobileTab === "code" ? "block" : "hidden"} md:block`}>
          <CodeViewer contract={selected} />
        </div>

        <div className={`${mobileTab === "why" ? "block" : "hidden"} md:block`}>
          <JustificationPanel
            selectedContract={selected}
            fullJustificationMarkdown={demo.justificationMarkdown}
          />
        </div>
      </div>

      <SkillFooter />
    </div>
  );
}
