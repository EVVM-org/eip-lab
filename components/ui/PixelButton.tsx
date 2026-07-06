import Link from "next/link";
import { ReactNode } from "react";

type Variant = "primary" | "secondary" | "phosphor" | "ghost";

interface PixelButtonProps {
  href?: string;
  external?: boolean;
  children: ReactNode;
  variant?: Variant;
  className?: string;
  size?: "md" | "sm" | "lg";
  download?: boolean | string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  /** Kept for API compatibility; no longer renders brackets. */
  bracket?: boolean;
}

/**
 * Minimalist action button. Solid green for primary actions, a quiet
 * outline for secondary, plain text for ghost. Smooth 150ms hover, a
 * visible focus ring, rounded corners — no glow, no invert.
 */
const VARIANT: Record<Variant, string> = {
  // green "run" accent, dark text
  primary:
    "bg-[var(--color-accent)] text-[#07130d] hover:bg-[var(--color-accent-strong)] border border-transparent",
  phosphor:
    "bg-[var(--color-accent)] text-[#07130d] hover:bg-[var(--color-accent-strong)] border border-transparent",
  secondary:
    "bg-transparent text-[var(--color-text)] border border-[var(--color-border-strong)] hover:bg-white/[0.04] hover:border-[#3d475c]",
  ghost:
    "bg-transparent text-[var(--color-text-muted)] border border-transparent hover:text-[var(--color-text)] hover:bg-white/[0.04]",
};

const SIZE: Record<NonNullable<PixelButtonProps["size"]>, string> = {
  lg: "px-6 py-3 text-sm",
  md: "px-4 py-2.5 text-[13px]",
  sm: "px-3 py-1.5 text-xs",
};

export default function PixelButton({
  href,
  external,
  children,
  variant = "primary",
  size = "md",
  download,
  onClick,
  type = "button",
  disabled = false,
  className = "",
}: PixelButtonProps) {
  const base =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-deep)] disabled:cursor-not-allowed disabled:opacity-40";
  const classes = `${base} ${SIZE[size]} ${VARIANT[variant]} ${className}`;

  if (onClick !== undefined || type === "submit") {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={classes}
      >
        {children}
      </button>
    );
  }

  if (!href) return null;

  if (external || download !== undefined) {
    return (
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        {...(download !== undefined ? { download } : {})}
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
