"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Bottom bar styled as a row of MINIMIZED WINDOWS (terminal-flavored,
 * not a Windows Start menu). Each nav target is a minimized-window
 * chip: a little title-bar-colored tab you can "restore" by clicking.
 * A prominent Launch chip sits on the right with the system clock.
 */

interface MiniWin {
  href: string;
  title: string;
  accent: string; // css var
  external?: boolean;
}

const WINDOWS: MiniWin[] = [
  { href: "/", title: "~/eiplab", accent: "var(--color-vp-pink)" },
  { href: "/#how", title: "how_it_works", accent: "var(--color-vp-purple)" },
  { href: "/#demos", title: "examples", accent: "var(--color-vp-cyan)" },
  { href: "/#faq", title: "faq.txt", accent: "var(--color-vp-mint)" },
];

export default function Taskbar() {
  const [now, setNow] = useState("");

  useEffect(() => {
    const fmt = () => {
      const d = new Date();
      return [d.getHours(), d.getMinutes(), d.getSeconds()]
        .map((n) => n.toString().padStart(2, "0"))
        .join(":");
    };
    setNow(fmt());
    const id = setInterval(() => setNow(fmt()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bevel-raised">
      <div className="mx-auto flex max-w-[1600px] items-stretch gap-1.5 px-2 py-1.5">
        {/* Minimized-window chips */}
        <div className="flex flex-1 items-stretch gap-1.5 overflow-x-auto">
          {WINDOWS.map((w) => (
            <MiniWindow key={w.title} win={w} />
          ))}
        </div>

        {/* Launch chip — the highlighted action */}
        <Link
          href="/lab"
          className="pixel-edge flex shrink-0 items-center gap-2 border-2 border-[var(--color-matrix)] bg-[#07010f] px-3 py-1 font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest text-[var(--color-matrix)] glow-matrix hover:bg-[rgba(51,255,65,0.14)] hover:!filter-none"
        >
          <span className="size-1.5 bg-[var(--color-matrix)] pulse-glow" />
          launch lab
        </Link>

        {/* Clock tray */}
        <div className="bevel-sunken flex shrink-0 items-center px-2.5 py-1 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-win-black)] tabular-nums">
          {now || "--:--:--"}
        </div>
      </div>
    </div>
  );
}

function MiniWindow({ win }: { win: MiniWin }) {
  const inner = (
    <span className="flex items-center gap-2">
      {/* tiny title-bar swatch — the "minimized window" cue */}
      <span
        className="h-3 w-4 shrink-0 border border-black/40"
        style={{ background: win.accent }}
      />
      <span className="truncate font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-win-black)]">
        {win.title}
      </span>
    </span>
  );

  const cls =
    "bevel-raised hover:bevel-active flex min-w-[120px] max-w-[180px] items-center px-2 py-1 hover:!filter-none hover:!drop-shadow-none";

  if (win.external) {
    return (
      <a href={win.href} target="_blank" rel="noreferrer" className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={win.href} className={cls}>
      {inner}
    </Link>
  );
}
