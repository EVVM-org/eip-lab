import { ReactNode } from "react";

interface WindowFrameProps {
  /** Small header label (e.g. "~/eiplab/provider"). */
  title: string;
  children: ReactNode;
  className?: string;
  /** Accent used for the header dot. */
  accent?: "pink" | "cyan" | "purple" | "mint";
  /** Show three muted header dots on the right. */
  controls?: boolean;
  /** Subtle accent ring around the card. */
  glow?: boolean;
  /** No padding around children — children manage their own. */
  flush?: boolean;
}

const ACCENT_DOT: Record<NonNullable<WindowFrameProps["accent"]>, string> = {
  pink: "var(--color-vp-pink)",
  cyan: "var(--color-vp-cyan)",
  purple: "var(--color-vp-purple)",
  mint: "var(--color-accent)",
};

/**
 * Minimalist card with a quiet header row (small mono label + accent dot).
 * Flat surface, subtle border, rounded corners — no bevel, no glow.
 */
export default function WindowFrame({
  title,
  children,
  className = "",
  accent = "pink",
  controls = true,
  glow = false,
  flush = false,
}: WindowFrameProps) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-[10px] border bg-[var(--color-bg-card)] ${
        glow
          ? "border-[var(--color-border-strong)] shadow-[0_0_0_1px_rgba(52,211,153,0.14)]"
          : "border-[var(--color-border)]"
      } ${className}`}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
        <span className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-text-muted)]">
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{ background: ACCENT_DOT[accent] }}
          />
          {title}
        </span>
        {controls && (
          <div className="flex items-center gap-1.5" aria-hidden>
            <span className="size-1.5 rounded-full bg-[var(--color-border-strong)]" />
            <span className="size-1.5 rounded-full bg-[var(--color-border-strong)]" />
            <span className="size-1.5 rounded-full bg-[var(--color-border-strong)]" />
          </div>
        )}
      </div>

      {/* Body */}
      <div
        className={`min-h-0 flex-1 overflow-hidden text-[var(--color-text)] ${
          flush ? "" : "p-5"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
