/**
 * Theme tokens mirrored from globals.css for use in TS where CSS variables
 * are awkward (e.g., dynamic Tailwind class lookups).
 *
 * Source of truth for CSS is `app/globals.css` `@theme` block.
 */

export const COLORS = {
  bg: "#0a0014",
  bgCard: "#1a0a2e",
  bgPanel: "#15082a",
  bgElevated: "#200d3a",

  neonPink: "#ff006e",
  neonCyan: "#00f5ff",
  neonPurple: "#a855f7",
  phosphor: "#00ff41",
  amber: "#ffb000",

  text: "#f0e7ff",
  textMuted: "#8b7aa8",
  textDim: "#5a4779",

  border: "#2d1b4e",
  borderHover: "#a855f7",
  borderActive: "#ff006e",
} as const;

/**
 * Tailwind class lookup for accent-based theming.
 * Use these maps to keep the same accent referenced consistently
 * across borders, text, glows, and hover states.
 */
export const ACCENT_CLASSES = {
  "neon-pink": {
    text: "text-[var(--color-neon-pink)]",
    border: "border-[var(--color-neon-pink)]",
    glow: "glow-pink",
    borderGlow: "border-glow-pink",
    bgGhost: "bg-[rgba(255,0,110,0.08)]",
  },
  "neon-cyan": {
    text: "text-[var(--color-neon-cyan)]",
    border: "border-[var(--color-neon-cyan)]",
    glow: "glow-cyan",
    borderGlow: "border-glow-cyan",
    bgGhost: "bg-[rgba(0,245,255,0.08)]",
  },
  "neon-purple": {
    text: "text-[var(--color-neon-purple)]",
    border: "border-[var(--color-neon-purple)]",
    glow: "glow-purple",
    borderGlow: "border-glow-purple",
    bgGhost: "bg-[rgba(168,85,247,0.08)]",
  },
} as const;
