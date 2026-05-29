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
  /** Render as a <button> instead of a link. */
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  /** Wrap the label in [ brackets ] terminal-style. */
  bracket?: boolean;
}

/**
 * Cyberpunk-terminal action button. High contrast by design:
 * near-black fill, 2px neon border in the accent color, accent text
 * with always-on glow. On hover the fill lifts toward the accent; on
 * active/press it fully inverts (accent fill, black text) like a
 * terminal keypress. No muddy gray bevel — that's reserved for window
 * chrome.
 */

const ACCENT: Record<
  Variant,
  { border: string; text: string; glow: string; hoverBg: string; activeBg: string }
> = {
  primary: {
    border: "border-[var(--color-vp-pink)]",
    text: "text-[var(--color-vp-pink)]",
    glow: "shadow-[0_0_10px_rgba(255,113,206,0.45),inset_0_0_10px_rgba(255,113,206,0.08)]",
    hoverBg: "hover:bg-[rgba(255,113,206,0.16)]",
    activeBg: "active:bg-[var(--color-vp-pink)] active:text-black",
  },
  secondary: {
    border: "border-[var(--color-vp-cyan)]",
    text: "text-[var(--color-vp-cyan)]",
    glow: "shadow-[0_0_10px_rgba(1,205,254,0.45),inset_0_0_10px_rgba(1,205,254,0.08)]",
    hoverBg: "hover:bg-[rgba(1,205,254,0.16)]",
    activeBg: "active:bg-[var(--color-vp-cyan)] active:text-black",
  },
  phosphor: {
    border: "border-[var(--color-matrix)]",
    text: "text-[var(--color-matrix)]",
    glow: "shadow-[0_0_10px_rgba(51,255,65,0.45),inset_0_0_10px_rgba(51,255,65,0.08)]",
    hoverBg: "hover:bg-[rgba(51,255,65,0.16)]",
    activeBg: "active:bg-[var(--color-matrix)] active:text-black",
  },
  ghost: {
    border: "border-[rgba(255,255,255,0.25)]",
    text: "text-[var(--color-text-muted)]",
    glow: "",
    hoverBg: "hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--color-text)] hover:border-[var(--color-vp-purple)]",
    activeBg: "active:bg-[rgba(255,255,255,0.12)]",
  },
};

const SIZE: Record<NonNullable<PixelButtonProps["size"]>, string> = {
  lg: "px-7 py-3.5 text-[14px]",
  md: "px-5 py-2.5 text-[13px]",
  sm: "px-3 py-1.5 text-[11px]",
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
  bracket = false,
  className = "",
}: PixelButtonProps) {
  const a = ACCENT[variant];
  const base =
    "pixel-edge inline-flex items-center justify-center gap-2 border-2 bg-[#07010f] font-[family-name:var(--font-mono)] font-bold uppercase tracking-wider transition-all duration-100 disabled:cursor-not-allowed disabled:opacity-40";
  const classes = `${base} ${SIZE[size]} ${a.border} ${a.text} ${a.glow} ${a.hoverBg} ${a.activeBg} ${className}`;

  const label = bracket ? <>[ {children} ]</> : children;

  if (onClick !== undefined || type === "submit") {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={classes}
      >
        {label}
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
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {label}
    </Link>
  );
}
