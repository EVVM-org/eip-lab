import Link from "next/link";
import { SITE, DOCS } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="mx-auto mt-20 max-w-7xl px-4 pb-10">
      <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 text-sm leading-relaxed text-[var(--color-text-muted)]">
        <div className="grid gap-8 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <div className="text-lg font-semibold text-[var(--color-text)]">
              EVVM EIP Lab
            </div>
            <p className="mt-2 max-w-md">
              The lab for testing new EIPs on EVVM. Bring an EIP and your
              own AI key; get documented Solidity plus a per-contract
              justification back.
            </p>
          </div>
          <div>
            <div className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--color-text-dim)]">
              Project
            </div>
            <ul className="space-y-2">
              <li>
                <Link href="/lab">Launch Lab</Link>
              </li>
              <li>
                <a href={SITE.github} target="_blank" rel="noreferrer">
                  This repo ↗
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
            <div className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--color-text-dim)]">
              Reference
            </div>
            <ul className="space-y-2">
              <li>
                <a href={DOCS.eipIndex} target="_blank" rel="noreferrer">
                  EIP index ↗
                </a>
              </li>
              <li>
                <a href={DOCS.license} target="_blank" rel="noreferrer">
                  License ↗
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-[var(--color-border)] pt-5 text-xs text-[var(--color-text-dim)]">
          © {new Date().getFullYear()} Mate Labs Inc · EVVM-NONCOMMERCIAL-1.0
        </div>
      </div>
    </footer>
  );
}
