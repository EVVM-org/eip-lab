import { ReactNode } from "react";

interface GlitchTextProps {
  children: ReactNode;
  color?: "pink" | "cyan" | "purple" | "mint" | "matrix";
  /** Kept for API compatibility; no longer changes the font. */
  pixel?: boolean;
  /** Kept for API compatibility; no glitch animation in the minimal theme. */
  hover?: boolean;
  className?: string;
}

const COLOR: Record<NonNullable<GlitchTextProps["color"]>, string> = {
  pink: "text-[var(--color-vp-pink)]",
  cyan: "text-[var(--color-vp-cyan)]",
  purple: "text-[var(--color-vp-purple)]",
  mint: "text-[var(--color-accent)]",
  matrix: "text-[var(--color-accent)]",
};

/**
 * Accent-colored emphasis span for headline words. Clean and static in
 * the minimal theme — no glow, no glitch.
 */
export default function GlitchText({
  children,
  color = "pink",
  className = "",
}: GlitchTextProps) {
  return <span className={`${COLOR[color]} ${className}`}>{children}</span>;
}
