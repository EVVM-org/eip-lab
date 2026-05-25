import Link from "next/link";
import { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type ButtonAsLink = {
  href: string;
  external?: boolean;
  children: ReactNode;
  variant?: Variant;
  className?: string;
};

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "border-[var(--color-neon-pink)] bg-[rgba(255,0,110,0.1)] text-[var(--color-neon-pink)] glow-pink border-glow-pink hover:bg-[rgba(255,0,110,0.22)]",
  secondary:
    "border-[var(--color-neon-cyan)] bg-[rgba(0,245,255,0.08)] text-[var(--color-neon-cyan)] glow-cyan hover:bg-[rgba(0,245,255,0.18)]",
  ghost:
    "border-[var(--color-border)] bg-transparent text-[var(--color-text-muted)] hover:border-[var(--color-neon-purple)] hover:text-[var(--color-text)]",
};

const BASE =
  "inline-flex items-center gap-2 rounded-sm border px-5 py-2.5 text-sm font-medium tracking-wide transition";

export default function Button({
  href,
  external,
  children,
  variant = "primary",
  className = "",
}: ButtonAsLink) {
  const classes = `${BASE} ${VARIANT_CLASSES[variant]} ${className}`;

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={classes}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
