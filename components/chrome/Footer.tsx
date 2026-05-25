import { SITE, DOCS } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="mt-32 border-t border-[var(--color-border)] bg-[rgba(10,0,20,0.6)]">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="font-[family-name:var(--font-vt323)] text-2xl">
              <span className="text-[var(--color-neon-pink)]">EIP</span>
              <span className="text-[var(--color-neon-cyan)]">Lab</span>
            </div>
            <p className="mt-3 max-w-md text-sm text-[var(--color-text-muted)]">
              An AI-agent skill for prototyping EIPs on scaffold-evvm.
              Solidity + per-contract justification, in afternoons not weeks.
            </p>
          </div>

          <div>
            <h4 className="mb-3 font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider text-[var(--color-text-dim)]">
              Project
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href={SITE.skillRepo} target="_blank" rel="noreferrer">
                  Skill repo
                </a>
              </li>
              <li>
                <a href={SITE.scaffoldEvvm} target="_blank" rel="noreferrer">
                  scaffold-evvm
                </a>
              </li>
              <li>
                <a href={DOCS.evvmInfo} target="_blank" rel="noreferrer">
                  evvm.info
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider text-[var(--color-text-dim)]">
              Reference
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href={DOCS.scaffoldEvvm} target="_blank" rel="noreferrer">
                  Testing interface
                </a>
              </li>
              <li>
                <a href={DOCS.howToMakeService} target="_blank" rel="noreferrer">
                  Make a service
                </a>
              </li>
              <li>
                <a href={DOCS.eipIndex} target="_blank" rel="noreferrer">
                  EIP index ↗
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-text-dim)] md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} MATE Labs Inc. ·{" "}
            <a href={DOCS.license} target="_blank" rel="noreferrer">
              EVVM Noncommercial License v1.0
            </a>
          </p>
          <p className="text-[var(--color-phosphor)]">
            <span className="cursor-blink">_</span> running on the edge
          </p>
        </div>
      </div>
    </footer>
  );
}
