import { ReactNode } from "react";

type TagVariant =
  | "pink"
  | "cyan"
  | "purple"
  | "phosphor"
  | "matrix"
  | "amber"
  | "neutral";

interface TagProps {
  children: ReactNode;
  variant?: TagVariant;
  className?: string;
}

const VARIANT: Record<TagVariant, string> = {
  pink: "border-[var(--color-vp-pink)] text-[var(--color-vp-pink)] bg-[rgba(37,194,160,0.08)]",
  cyan: "border-[var(--color-vp-cyan)] text-[var(--color-vp-cyan)] bg-[rgba(1,205,254,0.08)]",
  purple:
    "border-[var(--color-vp-purple)] text-[var(--color-vp-purple)] bg-[rgba(37,194,160,0.08)]",
  phosphor:
    "border-[var(--color-matrix)] text-[var(--color-matrix)] bg-[rgba(51,255,65,0.08)]",
  matrix:
    "border-[var(--color-matrix)] text-[var(--color-matrix)] bg-[rgba(51,255,65,0.08)]",
  amber:
    "border-[var(--color-amber)] text-[var(--color-amber)] bg-[rgba(255,176,0,0.08)]",
  neutral:
    "border-[rgba(255,255,255,0.18)] text-[var(--color-text-muted)] bg-[var(--color-bg-card)]",
};

export default function Tag({
  children,
  variant = "neutral",
  className = "",
}: TagProps) {
  return (
    <span
      className={`pixel-edge inline-flex items-center border px-2 py-0.5 font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest ${VARIANT[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
