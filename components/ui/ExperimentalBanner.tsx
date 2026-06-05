/**
 * Experimental-phase notice. EVVM EIP Lab is an early, evolving research
 * product — output is documented Solidity that is NOT guaranteed to
 * compile or be production-safe. Shown on the landing page and /lab.
 */
export default function ExperimentalBanner({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      role="note"
      className={`pixel-edge flex flex-wrap items-center gap-x-3 gap-y-1 border-2 border-[var(--color-amber)] bg-[rgba(255,176,0,0.08)] px-3 py-2 font-[family-name:var(--font-mono)] text-[11px] leading-relaxed text-[var(--color-amber)] ${className}`}
    >
      <span className="font-bold uppercase tracking-widest">
        ⚠ experimental
      </span>
      <span className="text-[var(--color-text-muted)]">
        EVVM EIP Lab is in a very experimental phase. Output is documented
        Solidity for research and prototyping — it is NOT audited, not
        guaranteed to compile, and not production-ready. Expect rough edges
        and breaking changes.
      </span>
    </div>
  );
}
