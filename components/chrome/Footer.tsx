import { SITE, DOCS } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="mx-auto mt-20 max-w-7xl px-4 pb-8">
      <div
        className="p-5 font-[family-name:var(--font-mono)] text-xs leading-relaxed text-[var(--color-text-muted)]"
        style={{
          background: "rgba(13, 13, 21, 0.6)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="grid gap-6 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <div className="font-[family-name:var(--font-vt323)] text-2xl">
              <span className="text-[var(--color-vp-pink)] glow-pink">eip</span>
              <span className="text-[var(--color-vp-cyan)] glow-cyan">lab</span>
              <span className="cursor-blink ml-0.5 text-[var(--color-matrix)]">▊</span>
            </div>
            <p className="mt-2 max-w-md">
              An AI-agent skill for prototyping EIPs. Solidity contracts +
              per-contract justification, in afternoons not weeks.
            </p>
          </div>
          <div>
            <div className="mb-2 text-[var(--color-vp-pink)] uppercase tracking-widest">
              project
            </div>
            <ul className="space-y-1">
              <li>
                <a href={SITE.skillRepo} target="_blank" rel="noreferrer">
                  skill repo ↗
                </a>
              </li>
              <li>
                <a href={SITE.github} target="_blank" rel="noreferrer">
                  this repo ↗
                </a>
              </li>
              <li>
                <a href={DOCS.evvmInfo} target="_blank" rel="noreferrer">
                  evvm.info ↗
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="mb-2 text-[var(--color-vp-pink)] uppercase tracking-widest">
              reference
            </div>
            <ul className="space-y-1">
              <li>
                <a href={DOCS.eipIndex} target="_blank" rel="noreferrer">
                  EIP index ↗
                </a>
              </li>
              <li>
                <a href={DOCS.license} target="_blank" rel="noreferrer">
                  license ↗
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-1 border-t border-[rgba(255,255,255,0.08)] pt-4 text-[10px] uppercase tracking-widest md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} mate labs inc · EVVM-NONCOMMERCIAL-1.0</span>
          <span className="text-[var(--color-matrix)] glow-matrix">
            <span className="cursor-blink">_</span> running on the edge
          </span>
        </div>
      </div>
    </footer>
  );
}
