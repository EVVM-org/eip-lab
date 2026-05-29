import WindowFrame from "@/components/ui/WindowFrame";
import GlitchText from "@/components/ui/GlitchText";
import { DOCS, SITE } from "@/lib/constants";

interface QA {
  q: string;
  a: React.ReactNode;
}

const QAS: QA[] = [
  {
    q: "Can I run my own EIP?",
    a: (
      <>
        Yes — that&apos;s the whole point.{" "}
        <a href="/lab">Launch the Lab</a>, pick a provider, paste your API
        key, drop in an EIP (text or links), and walk the four phases.
        The examples below are pre-baked runs so you can see the output
        shape before you spend a token.
      </>
    ),
  },
  {
    q: "What does a run produce?",
    a: (
      <>
        Documented <code>.sol</code> files (modified core, new services,
        mocks) plus a per-contract justification, bundled into a
        downloadable package. No tests, no deploy scripts, no EIP draft —
        the deliverable is documented Solidity.
      </>
    ),
  },
  {
    q: "Whose API key is used, and is it safe?",
    a: (
      <>
        Yours. The Lab works with your own provider key (Venice AI to
        start). The key is sent per-request to our proxy, forwarded to the
        provider, and discarded — never written to our storage, never
        logged. We record only token counts (for EVVM&apos;s research on
        AI + EIP cost).
      </>
    ),
  },
  {
    q: "How should I test the contracts the Lab gives me?",
    a: (
      <>
        For local testing we recommend{" "}
        <a href={SITE.scaffoldEvvm} target="_blank" rel="noreferrer">
          scaffold-evvm
        </a>{" "}
        — it runs the full EVVM stack on Anvil or Hardhat Network, and the
        contracts drop straight into <code>experiments/</code>. See the{" "}
        <a href={DOCS.scaffoldEvvm} target="_blank" rel="noreferrer">
          scaffold-evvm docs
        </a>{" "}
        and{" "}
        <a href={DOCS.howToMakeService} target="_blank" rel="noreferrer">
          how to make an EVVM service
        </a>
        . The downloaded package includes a guide for this.
      </>
    ),
  },
  {
    q: "How does it handle EIPs that depend on other draft EIPs?",
    a: (
      <>
        The map phase does a dependency survey. For each required EIP you
        pick a strategy: vendor, mock, simulate, or defer. For draft EIPs
        without coverage, the Lab offers two paths — model the dependency
        first as a prerequisite, or mock the minimum surface.
      </>
    ),
  },
  {
    q: "What about really large EIPs?",
    a: (
      <>
        When more than ~5 distinct mocks are needed, the Lab proposes
        decomposing into sub-experiments instead of one tangled attempt.
        Each sub-experiment has its own clean dependency slice.
      </>
    ),
  },
  {
    q: "Why track token counts?",
    a: (
      <>
        EVVM is studying the cost and behavior of AI models on
        protocol-level work — for a research write-up and to make the
        economics of EIP prototyping transparent. The live meter shows
        your spend; we aggregate only anonymous counts.
      </>
    ),
  },
  {
    q: "Is it open source?",
    a: (
      <>
        Yes, under the{" "}
        <a href={DOCS.license} target="_blank" rel="noreferrer">
          EVVM Noncommercial License v1.0
        </a>
        . Free for research, personal, and noncommercial use. Commercial
        use requires a separate license — contact <code>g@evvm.org</code>.
      </>
    ),
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-4xl px-4 py-20">
      <header className="mb-10">
        <p className="mb-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">
          // questions
        </p>
        <h2 className="text-4xl leading-tight md:text-5xl">
          <GlitchText color="mint">faq.txt</GlitchText>
        </h2>
      </header>

      <WindowFrame title="~/eiplab/faq" accent="mint" flush>
        <div className="divide-y divide-[rgba(255,255,255,0.06)]">
          {QAS.map((qa, i) => (
            <details
              key={qa.q}
              className="group cursor-pointer px-5 py-4"
              open={i === 0}
            >
              <summary className="flex cursor-pointer list-none items-start gap-3 text-base font-medium text-[var(--color-text)] outline-none">
                <span className="text-[var(--color-vp-mint)] glow-mint transition-transform group-open:rotate-90">
                  ›
                </span>
                <span className="flex-1">{qa.q}</span>
              </summary>
              <div className="mt-3 pl-6 text-sm leading-relaxed text-[var(--color-text-muted)]">
                {qa.a}
              </div>
            </details>
          ))}
        </div>
      </WindowFrame>
    </section>
  );
}
