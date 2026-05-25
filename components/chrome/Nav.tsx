import Link from "next/link";
import { SITE } from "@/lib/constants";

export default function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[rgba(10,0,20,0.85)] backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-[family-name:var(--font-vt323)] text-3xl tracking-wide glow-pink hover:no-underline"
        >
          <span className="text-[var(--color-neon-pink)]">EIP</span>
          <span className="text-[var(--color-neon-cyan)]">Lab</span>
          <span className="cursor-blink ml-1 text-[var(--color-phosphor)]">
            _
          </span>
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          <Link
            href="/#how"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            How it works
          </Link>
          <Link
            href="/#demos"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            Demos
          </Link>
          <Link
            href="/#faq"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            FAQ
          </Link>
          <a
            href={SITE.skillRepo}
            target="_blank"
            rel="noreferrer"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            Skill ↗
          </a>
          <Link
            href="/#demos"
            className="rounded-sm border border-[var(--color-neon-pink)] bg-[rgba(255,0,110,0.08)] px-4 py-1.5 text-[var(--color-neon-pink)] glow-pink border-glow-pink hover:bg-[rgba(255,0,110,0.18)]"
          >
            Launch demo
          </Link>
        </nav>
      </div>
    </header>
  );
}
