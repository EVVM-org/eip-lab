import { ReactNode } from "react";

type TagVariant =
  | "pink"
  | "cyan"
  | "purple"
  | "phosphor"
  | "amber"
  | "neutral";

interface TagProps {
  children: ReactNode;
  variant?: TagVariant;
  className?: string;
}

const VARIANT_CLASSES: Record<TagVariant, string> = {
  pink: "border-[var(--color-neon-pink)] text-[var(--color-neon-pink)] bg-[rgba(255,0,110,0.08)]",
  cyan: "border-[var(--color-neon-cyan)] text-[var(--color-neon-cyan)] bg-[rgba(0,245,255,0.08)]",
  purple:
    "border-[var(--color-neon-purple)] text-[var(--color-neon-purple)] bg-[rgba(168,85,247,0.08)]",
  phosphor:
    "border-[var(--color-phosphor)] text-[var(--color-phosphor)] bg-[rgba(0,255,65,0.08)]",
  amber:
    "border-[var(--color-amber)] text-[var(--color-amber)] bg-[rgba(255,176,0,0.08)]",
  neutral:
    "border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-bg-panel)]",
};

export default function Tag({
  children,
  variant = "neutral",
  className = "",
}: TagProps) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
