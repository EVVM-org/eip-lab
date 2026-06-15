import type { Metadata } from "next";
import LabApp from "@/components/lab/LabApp";
import GlitchText from "@/components/ui/GlitchText";
import ExperimentalBanner from "@/components/ui/ExperimentalBanner";

export const metadata: Metadata = {
  title: "Launch — EVVM EIP Lab",
  description:
    "Bring an EIP and your own AI provider key. The Lab reads it, agrees with you on what it is, maps it onto the EVVM core, and hands back documented Solidity.",
};

export default function LabPage() {
  return (
    <>
      <header className="mx-auto max-w-7xl px-4 pt-8 pb-4">
        <div className="mb-2 flex items-center gap-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">
          <a href="/" className="hover:text-[var(--color-vp-cyan)]">
            ← home
          </a>
          <span>/</span>
          <span>launch</span>
        </div>
        <h1 className="text-4xl md:text-5xl">
          <GlitchText color="pink">EVVM EIP Lab</GlitchText>
        </h1>
        <p className="mt-3 max-w-3xl font-[family-name:var(--font-mono)] text-sm leading-relaxed text-[var(--color-text-muted)]">
          Bring an EIP — paste it or upload a .md/.txt — and your own
          provider key. The Lab researches it against the full EVVM stack,
          asks you up to 5 questions to find the happy path, then hands
          back documented Solidity. Three phases: upload → deep research →
          download .sol.
        </p>
        <ExperimentalBanner className="mt-4 max-w-3xl" />
      </header>
      <LabApp />
    </>
  );
}
