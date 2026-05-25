import { ReactNode } from "react";

interface AsciiBorderProps {
  children: ReactNode;
  className?: string;
  /** Optional title rendered top-left, like `[ TITLE ]`. */
  title?: string;
}

/**
 * Wraps content in ASCII-art border characters (+, -, |). Renders the
 * border as text so it scales with font-size. Used inside terminal
 * panels for nested call-outs.
 */
export default function AsciiBorder({
  children,
  className = "",
  title,
}: AsciiBorderProps) {
  return (
    <div
      className={`bg-[#050505] p-3 font-[family-name:var(--font-mono)] text-[var(--color-matrix)] ${className}`}
      style={{
        border: "1px solid var(--color-matrix)",
      }}
    >
      <div className="mb-2 flex items-center justify-between text-[10px]">
        <span>
          {title ? `[ ${title} ]` : "+"}
        </span>
        <span>+</span>
      </div>
      <div className="text-sm leading-relaxed">{children}</div>
      <div className="mt-2 flex items-center justify-between text-[10px]">
        <span>+</span>
        <span>+</span>
      </div>
    </div>
  );
}
