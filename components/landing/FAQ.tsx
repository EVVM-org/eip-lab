import WindowFrame from "@/components/ui/WindowFrame";
import GlitchText from "@/components/ui/GlitchText";
import { DOCS, SITE } from "@/lib/constants";

interface QA {
  q: string;
  a: React.ReactNode;
}

const QAS: QA[] = [
  {
    q: "Can I run my own EIP through this site?",
    a: (
      <>
        Not on this site. EIPLab is an agent skill — you install it in your
        editor (Claude Code, Cursor, etc.) and ask your agent to prototype
        any EIP. This site is the marketing demo for what the skill
        produces.
      </>
    ),
  },
  {
    q: "What does the skill actually output?",
    a: (
      <>
        Per experiment: a folder containing the{" "}
        <code>.sol</code> files (modified core, new services, mocks), a{" "}
        <code>justification.md</code> document explaining each contract,
        and a <code>manifest.json</code> tracking dependencies and mock
        limitations. That&apos;s it.
      </>
    ),
  },
  {
    q: "What's the recommended way to actually use the contracts?",
    a: (
      <>
        Drop them into{" "}
        <a href={SITE.scaffoldEvvm} target="_blank" rel="noreferrer">
          scaffold-evvm
        </a>
        . It runs a full local EVVM stack on Anvil or Hardhat Network, the
        wizard handles deployment, and the contracts EIPLab produces fit
        straight into <code>experiments/eip-N-slug/</code>. See the{" "}
        <a href={DOCS.scaffoldEvvm} target="_blank" rel="noreferrer">
          scaffold-evvm docs
        </a>{" "}
        for setup.
      </>
    ),
  },
  {
    q: "How does it handle EIPs that depend on other draft EIPs?",
    a: (
      <>
        Phase 1.5 (the dependency survey) is the answer. For each required
        EIP, you pick one of four strategies: vendor, mock, simulate, or
        defer. The manifest records the choice. For draft EIPs without
        coverage, the agent offers two paths: model the dep first as a
        prerequisite experiment, or mock the minimum surface.
      </>
    ),
  },
  {
    q: "What about really large EIPs (8141-style)?",
    a: (
      <>
        The skill refuses single experiments when more than ~5 distinct
        mocks are needed and proposes decomposition into sub-experiments
        instead. Each sub-experiment has its own clean dependency slice.
        Better to ship three small experiments than one tangled one.
      </>
    ),
  },
  {
    q: "Is it open source?",
    a: (
      <>
        Yes. Both the frontend and the skill are under the{" "}
        <a href={DOCS.license} target="_blank" rel="noreferrer">
          EVVM Noncommercial License v1.0
        </a>
        . Free for research, personal, and noncommercial use. Commercial
        use requires a separate license — contact{" "}
        <code>g@evvm.org</code>.
      </>
    ),
  },
  {
    q: "Which AI agents work with this skill?",
    a: (
      <>
        Any agent that loads SKILL.md-format skills from a project&apos;s{" "}
        <code>.claude/skills/</code> (or equivalent) directory. Claude
        Code, Cursor, GitHub Copilot, Aider, and any custom agent built
        against the open skill standard. The skill itself is
        agent-agnostic.
      </>
    ),
  },
  {
    q: "Why a separate skill instead of a hosted service?",
    a: (
      <>
        Researchers already have the agent running locally with full
        context of their codebase. Shipping EIPLab as a skill means it
        composes with everything else they&apos;ve set up — no API keys, no
        rate limits, no data leaving their machine.
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
