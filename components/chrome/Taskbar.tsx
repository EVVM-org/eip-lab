"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SITE } from "@/lib/constants";

/**
 * Terminal-style bottom status bar. Win98-chunky chrome on the OUTSIDE
 * (raised bevel, gray base), terminal/HUD content on the INSIDE.
 *
 * NOT a Windows-style Start menu — this is closer to a tmux status
 * bar or a vintage Unix HUD.
 */
export default function Taskbar() {
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    function fmt() {
      const d = new Date();
      const hh = d.getHours().toString().padStart(2, "0");
      const mm = d.getMinutes().toString().padStart(2, "0");
      const ss = d.getSeconds().toString().padStart(2, "0");
      return `${hh}:${mm}:${ss}`;
    }
    setNow(fmt());
    const id = setInterval(() => setNow(fmt()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bevel-raised">
      <div className="mx-auto flex max-w-[1600px] items-stretch gap-2 px-2 py-1">

        {/* Brand chip — left */}
        <Link
          href="/"
          className="bevel-active flex items-center gap-2 px-3 py-1 font-[family-name:var(--font-press-start)] text-[10px] uppercase text-[var(--color-win-black)] hover:bevel-raised hover:!filter-none hover:!drop-shadow-none"
        >
          <span className="size-2 bg-[var(--color-vp-pink)]" />
          eiplab
        </Link>

        {/* Nav links — middle, hidden on mobile */}
        <nav className="hidden flex-1 items-center gap-1 md:flex">
          <TaskbarLink href="/#how" label="how_it_works" />
          <TaskbarLink href="/#demos" label="demos" />
          <TaskbarLink href="/#faq" label="faq" />
          <TaskbarLink
            href={SITE.skillRepo}
            label="skill ↗"
            external
          />
        </nav>

        {/* Status segment — right */}
        <div className="ml-auto flex items-center gap-2">
          <div className="bevel-sunken flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase text-[var(--color-win-black)]">
            <span className="size-1.5 bg-[var(--color-matrix)] pulse-glow" />
            <span className="font-[family-name:var(--font-mono)]">online</span>
          </div>
          <div className="bevel-sunken flex items-center px-2 py-1 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-win-black)] tabular-nums">
            {now || "--:--:--"}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskbarLink({
  href,
  label,
  external,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  const className =
    "bevel-raised hover:bevel-active px-3 py-1 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-win-black)] hover:!filter-none hover:!drop-shadow-none";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}
