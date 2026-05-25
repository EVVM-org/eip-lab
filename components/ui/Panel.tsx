import { ReactNode } from "react";

interface PanelProps {
  children: ReactNode;
  className?: string;
  /** Add neon glow border. */
  glow?: "pink" | "cyan" | "purple";
  /** Render with a slightly elevated background. */
  elevated?: boolean;
  /** Optional small header label rendered in the top-left corner. */
  label?: string;
}

const GLOW_CLASSES = {
  pink: "border-glow-pink",
  cyan: "border-glow-cyan",
  purple: "border-glow-purple",
} as const;

const LABEL_GLOW = {
  pink: "glow-pink text-[var(--color-neon-pink)]",
  cyan: "glow-cyan text-[var(--color-neon-cyan)]",
  purple: "glow-purple text-[var(--color-neon-purple)]",
} as const;

export default function Panel({
  children,
  className = "",
  glow,
  elevated = false,
  label,
}: PanelProps) {
  const bg = elevated ? "panel-elevated" : "panel";
  const glowClass = glow ? GLOW_CLASSES[glow] : "";

  return (
    <div className={`relative ${bg} ${glowClass} ${className}`}>
      {label && (
        <span
          className={`absolute -top-2 left-3 bg-[var(--color-bg)] px-2 text-[10px] uppercase tracking-widest ${
            glow ? LABEL_GLOW[glow] : "text-[var(--color-text-dim)]"
          }`}
        >
          {label}
        </span>
      )}
      {children}
    </div>
  );
}
