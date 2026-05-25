import { ReactNode } from "react";

type GlowColor = "pink" | "cyan" | "purple" | "phosphor";

interface GlowTextProps {
  children: ReactNode;
  color?: GlowColor;
  display?: boolean;
  className?: string;
}

const COLOR_CLASSES: Record<GlowColor, string> = {
  pink: "text-[var(--color-neon-pink)] glow-pink",
  cyan: "text-[var(--color-neon-cyan)] glow-cyan",
  purple: "text-[var(--color-neon-purple)] glow-purple",
  phosphor: "text-[var(--color-phosphor)] glow-phosphor",
};

/**
 * Inline span with neon text glow. Set `display` to use the retro
 * VT323 display font for headline-style usage.
 */
export default function GlowText({
  children,
  color = "pink",
  display = false,
  className = "",
}: GlowTextProps) {
  const family = display ? "font-[family-name:var(--font-vt323)]" : "";
  return (
    <span className={`${COLOR_CLASSES[color]} ${family} ${className}`}>
      {children}
    </span>
  );
}
