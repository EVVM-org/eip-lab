import { ReactNode } from "react";

interface TerminalProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

/**
 * A terminal-style container. Matches the vaporwave aesthetic with
 * traffic-light "buttons" replaced by neon dots and a phosphor-green
 * prompt line at the bottom.
 */
export default function Terminal({
  children,
  title = "eiplab",
  className = "",
}: TerminalProps) {
  return (
    <div
      className={`panel-elevated border-glow-purple overflow-hidden ${className}`}
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[var(--color-neon-pink)]" />
          <span className="size-2.5 rounded-full bg-[var(--color-amber)]" />
          <span className="size-2.5 rounded-full bg-[var(--color-phosphor)]" />
        </div>
        <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-widest text-[var(--color-text-dim)]">
          {title}
        </span>
        <span className="w-12" aria-hidden />
      </div>
      <div className="p-4 font-[family-name:var(--font-mono)] text-sm leading-relaxed text-[var(--color-text)]">
        {children}
      </div>
    </div>
  );
}
