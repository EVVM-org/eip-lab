import Link from "next/link";
import { ReactNode } from "react";

type Variant = "primary" | "secondary" | "phosphor" | "ghost";

interface PixelButtonProps {
  href: string;
  external?: boolean;
  children: ReactNode;
  variant?: Variant;
  className?: string;
  /** Renders as a smaller chip-sized button (lower padding + smaller text). */
  size?: "md" | "sm";
  /** If set, adds a `download` attribute so the browser saves the file. */
  download?: boolean | string;
}

const VARIANT_TEXT: Record<Variant, string> = {
  primary: "text-[var(--color-vp-pink)] glow-pink",
  secondary: "text-[var(--color-vp-cyan)] glow-cyan",
  phosphor: "text-[var(--color-matrix)] glow-matrix",
  ghost: "text-[var(--color-win-black)]",
};

const VARIANT_BG: Record<Variant, string> = {
  primary: "bg-[#1a0014]",
  secondary: "bg-[#001a1a]",
  phosphor: "bg-[#000900]",
  ghost: "bg-[var(--color-win-gray)]",
};

const VARIANT_GLOW: Record<Variant, string> = {
  primary: "hover:border-glow-pink",
  secondary: "hover:border-glow-cyan",
  phosphor: "hover:border-glow-matrix",
  ghost: "",
};

const SIZE: Record<NonNullable<PixelButtonProps["size"]>, string> = {
  md: "px-5 py-2.5 text-[13px]",
  sm: "px-3 py-1.5 text-[11px]",
};

/**
 * Chunky 3D-bevel button. Win98 raised chrome with vaporwave/neon
 * interior. Active state (button press) flips the bevel to look pushed in.
 */
export default function PixelButton({
  href,
  external,
  children,
  variant = "primary",
  size = "md",
  download,
  className = "",
}: PixelButtonProps) {
  const base =
    "inline-flex items-center gap-2 bevel-raised active:bevel-active pixel-edge font-[family-name:var(--font-mono)] font-bold uppercase tracking-wider transition-all duration-75";
  const ghost = variant === "ghost";
  const classes = `${base} ${SIZE[size]} ${
    ghost ? "" : VARIANT_BG[variant]
  } ${VARIANT_TEXT[variant]} ${VARIANT_GLOW[variant]} ${className}`;

  // For external links AND for download links, render a plain <a> so the
  // browser can fetch the asset directly (Next.js <Link> is router-only).
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
