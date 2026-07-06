"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Slim fixed bottom bar: section links on the left, a green "launch"
 * action and a live clock on the right. Minimal, quiet chrome.
 */

interface NavLink {
  href: string;
  title: string;
}

const LINKS: NavLink[] = [
  { href: "/", title: "home" },
  { href: "/#how", title: "how it works" },
  { href: "/#demos", title: "examples" },
  { href: "/#faq", title: "faq" },
];

export default function Taskbar() {
  const [now, setNow] = useState("");

  useEffect(() => {
    const fmt = () => {
      const d = new Date();
      return [d.getHours(), d.getMinutes()]
        .map((n) => n.toString().padStart(2, "0"))
        .join(":");
    };
    setNow(fmt());
    const id = setInterval(() => setNow(fmt()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg-deep)_85%,transparent)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5">
        <nav className="flex flex-1 items-center gap-4 overflow-x-auto">
          {LINKS.map((l) => (
            <Link
              key={l.title}
              href={l.href}
              className="shrink-0 text-[13px] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
            >
              {l.title}
            </Link>
          ))}
        </nav>

        <Link
          href="/lab"
          className="shrink-0 rounded-md bg-[var(--color-accent)] px-3.5 py-1.5 text-[13px] font-medium text-[#07130d] transition-colors hover:bg-[var(--color-accent-strong)]"
        >
          Launch Lab
        </Link>

        <span className="hidden shrink-0 font-[family-name:var(--font-mono)] text-xs tabular-nums text-[var(--color-text-dim)] sm:inline">
          {now || "--:--"}
        </span>
      </div>
    </div>
  );
}
