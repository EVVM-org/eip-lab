import { ReactNode } from "react";

interface GlitchTextProps {
  children: ReactNode;
  color?: "pink" | "cyan" | "purple" | "mint" | "matrix";
  /** Use the chunky pixel display font (Press Start 2P) instead of VT323. */
  pixel?: boolean;
  /** Trigger the glitch animation on hover. */
  hover?: boolean;
  className?: string;
}

const COLOR: Record<NonNullable<GlitchTextProps["color"]>, string> = {
  pink: "text-[var(--color-vp-pink)] glow-pink",
  cyan: "text-[var(--color-vp-cyan)] glow-cyan",
  purple: "text-[var(--color-vp-purple)] glow-purple",
  mint: "text-[var(--color-vp-mint)] glow-mint",
  matrix: "text-[var(--color-matrix)] glow-matrix",
};

/**
 * Neon text with optional glitch-on-hover. Used for headline accents.
 */
export default function GlitchText({
  children,
  color = "pink",
  pixel = false,
  hover = false,
  className = "",
}: GlitchTextProps) {
  const font = pixel
    ? "font-[family-name:var(--font-press-start)]"
    : "font-[family-name:var(--font-vt323)]";
  const glitch = hover ? "glitch-hover" : "";
  return (
    <span className={`${COLOR[color]} ${font} ${glitch} ${className}`}>
      {children}
    </span>
  );
}
