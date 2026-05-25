import GlowText from "@/components/ui/GlowText";
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
        editor (Claude Code, Cursor, etc.) alongside a{" "}
        <a href={SITE.scaffoldEvvm} target="_blank" rel="noreferrer">
          scaffold-evvm
        </a>{" "}
        checkout, then ask your agent to prototype any EIP. This site is the
        marketing demo for what the skill produces.
      </>
    ),
  },
  {
    q: "What does the skill actually output?",
    a: (
      <>
        Per experiment: a folder under <code>scaffold-evvm/experiments/</code>{" "}
        containing the <code>.sol</code> files (modified core, new services,
        mocks), a <code>justification.md</code> document explaining each
        contract, and a <code>manifest.json</code> tracking dependencies and
        mock limitations. Nothing else — no tests, no deploys, no EIP drafts.
      </>
    ),
  },
  {
    q: "Why no tests or deploy scripts?",
    a: (
      <>
        Deliberate scope. Researchers tend to already have a Foundry/Hardhat
        test pipeline they trust. Bundling our opinions on top creates
        friction without adding value. The skill produces the contracts;
        you wire them into your tests.
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
        The skill refuses single experiments when more than ~5 distinct mocks
        are needed, and proposes decomposition into sub-experiments instead.
        Each sub-experiment has its own clean dependency slice. Better to
        ship three small experiments than one tangled one.
      </>
    ),
  },
  {
    q: "Is it open source?",
    a: (
      <>
        Yes. The frontend and the skill are both under the{" "}
        <a href={DOCS.license} target="_blank" rel="noreferrer">
          EVVM Noncommercial License v1.0
        </a>
        . Free for research, personal, and noncommercial use. Commercial use
        requires a separate license — contact <code>g@evvm.org</code>.
      </>
    ),
  },
  {
    q: "Which AI agents work with this skill?",
    a: (
      <>
        Any agent that loads SKILL.md-format skills from a project's{" "}
        <code>.claude/skills/</code> (or equivalent) directory. That includes
        Claude Code, Cursor, GitHub Copilot, Aider, and any custom agent
        built against the open skill standard. The skill itself is
        agent-agnostic.
      </>
    ),
  },
  {
    q: "What's the recommended way to actually test the contracts?",
    a: (
      <>
        Use{" "}
        <a href={DOCS.scaffoldEvvm} target="_blank" rel="noreferrer">
          scaffold-evvm
        </a>{" "}
        — it runs a full local EVVM stack on Anvil or Hardhat Network, with
        the wizard handling deployment. The contracts the skill produces
        drop straight into <code>experiments/</code> and compile against the
        local stack.
      </>
    ),
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-4xl px-6 py-24">
      <header className="mb-12">
        <p className="mb-2 text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
          // questions
        </p>
        <h2 className="text-4xl md:text-5xl">
          <GlowText color="phosphor" display>
            FAQ.txt
          </GlowText>
        </h2>
      </header>

      <div className="space-y-4">
        {QAS.map((qa, i) => (
          <details
            key={qa.q}
            className="panel group cursor-pointer p-5 hover:border-[var(--color-neon-purple)]"
            open={i === 0}
          >
            <summary className="flex cursor-pointer list-none items-start gap-3 text-base font-medium text-[var(--color-text)]">
              <span className="text-[var(--color-neon-cyan)] glow-cyan">
                ›
              </span>
              <span className="flex-1">{qa.q}</span>
            </summary>
            <div className="mt-4 pl-6 text-sm leading-relaxed text-[var(--color-text-muted)]">
              {qa.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
