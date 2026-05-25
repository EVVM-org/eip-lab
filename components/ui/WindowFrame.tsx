import { ReactNode } from "react";

interface WindowFrameProps {
  /** Title bar text (left side, e.g. "~/eiplab/hero"). */
  title: string;
  children: ReactNode;
  className?: string;
  /** Color of the title bar gradient. Default: vaporwave pink→purple. */
  accent?: "pink" | "cyan" | "purple" | "mint";
  /** Show the [_][□][X] control buttons (right side). */
  controls?: boolean;
  /** Adds a neon glow around the whole window. */
  glow?: boolean;
  /** No padding around children — children manage their own. */
  flush?: boolean;
}

const ACCENT_GRADIENT: Record<NonNullable<WindowFrameProps["accent"]>, string> = {
  pink: "linear-gradient(90deg, var(--color-vp-pink) 0%, var(--color-vp-purple) 100%)",
  cyan: "linear-gradient(90deg, var(--color-vp-cyan) 0%, var(--color-vp-purple) 100%)",
  purple:
    "linear-gradient(90deg, var(--color-vp-purple) 0%, var(--color-vp-pink) 100%)",
  mint: "linear-gradient(90deg, var(--color-vp-mint) 0%, var(--color-vp-cyan) 100%)",
};

const ACCENT_GLOW: Record<NonNullable<WindowFrameProps["accent"]>, string> = {
  pink: "border-glow-pink",
  cyan: "border-glow-cyan",
  purple: "border-glow-purple",
  mint: "border-glow-matrix",
};

/**
 * Win98-style window with chunky 3D bevel chrome, vaporwave-tinted title
 * bar, and optional [_][□][X] controls. Body is dark for terminal/cyberpunk
 * content; chrome stays gray-Win98 for the contrast.
 */
export default function WindowFrame({
  title,
  children,
  className = "",
  accent = "pink",
  controls = true,
  glow = false,
  flush = false,
}: WindowFrameProps) {
  return (
    <div
      className={`win98-window pixel-edge p-1 ${
        glow ? ACCENT_GLOW[accent] : ""
      } ${className}`}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-2 py-1"
        style={{ background: ACCENT_GRADIENT[accent] }}
      >
        <span
          className="font-[family-name:var(--font-mono)] text-[12px] font-bold text-white"
          style={{ textShadow: "1px 1px 0 rgba(0,0,0,0.45)" }}
        >
          {title}
        </span>
        {controls && (
          <div className="flex items-center gap-0.5">
            <WindowControl label="_" />
            <WindowControl label="□" />
            <WindowControl label="X" />
          </div>
        )}
      </div>

      {/* Body */}
      <div
        className={`bg-[var(--color-bg-card)] ${
          flush ? "" : "p-5"
        } text-[var(--color-text)]`}
        style={{
          /* Inset bevel for the body (looks "recessed" inside the frame) */
          boxShadow:
            "inset 1px 1px 0 var(--color-win-gray-darker), inset -1px -1px 0 var(--color-win-white)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function WindowControl({ label }: { label: string }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden
      className="bevel-raised hover:bevel-active flex h-4 w-5 items-center justify-center font-[family-name:var(--font-mono)] text-[10px] leading-none text-[var(--color-win-black)]"
    >
      {label}
    </button>
  );
}
