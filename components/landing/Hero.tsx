import Button from "@/components/ui/Button";
import Terminal from "@/components/ui/Terminal";
import GlowText from "@/components/ui/GlowText";
import { SITE } from "@/lib/constants";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="grid-bg absolute inset-0 opacity-60" />
      <div className="absolute inset-x-0 top-0 h-[400px] sun-horizon opacity-30" />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
        <div className="flex flex-col justify-center">
          <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-sm border border-[var(--color-phosphor)] bg-[rgba(0,255,65,0.06)] px-3 py-1 text-xs uppercase tracking-widest text-[var(--color-phosphor)] glow-phosphor">
            <span className="size-1.5 rounded-full bg-[var(--color-phosphor)] pulse-glow" />
            online · v0.1 · demo
          </span>

          <h1 className="font-[family-name:var(--font-vt323)] text-5xl leading-[0.95] md:text-7xl">
            <GlowText color="pink" display>
              Prototype EIPs
            </GlowText>
            <br />
            <span className="text-[var(--color-text)]">in afternoons,</span>
            <br />
            <GlowText color="cyan" display>
              not weeks
            </GlowText>
            <span className="cursor-blink ml-2 text-[var(--color-phosphor)]">
              _
            </span>
          </h1>

          <p className="mt-6 max-w-md text-base leading-relaxed text-[var(--color-text-muted)]">
            EIPLab is an AI-agent skill that turns{" "}
            <a href={SITE.scaffoldEvvm} target="_blank" rel="noreferrer">
              scaffold-evvm
            </a>{" "}
            into an EIP research bench. Modify Core contracts, mock the
            heavy crypto, ship Solidity + per-contract justification. Tests,
            deploys, and EIP drafts stay with your existing tooling.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/#demos" variant="primary">
              Launch demo →
            </Button>
            <Button href={SITE.skillRepo} external variant="ghost">
              View skill repo ↗
            </Button>
          </div>
        </div>

        <div className="flex items-center">
          <Terminal title="~/scaffold-evvm">
            <div className="space-y-1">
              <Prompt cmd="npx tsx new-experiment.ts 8250 'Keyed Nonces'" />
              <Out>
                Scaffolding EIP-8250 experiment (minimal skill)
              </Out>
              <Out className="text-[var(--color-text-dim)]">
                Title: Keyed Nonces
                <br />
                Slug: keyed-nonces
                <br />
                Output: experiments/eip-8250-keyed-nonces
              </Out>
              <Out className="text-[var(--color-phosphor)] glow-phosphor">
                Done.
              </Out>
              <Out className="text-[var(--color-text-dim)]">Next:</Out>
              <Out className="text-[var(--color-text-dim)]">
                1. Fill manifest.json (hypothesis, shape, requires, mocks)
                <br />
                2. Phase 4: write Solidity + justification
              </Out>
              <div className="pt-2">
                <Prompt cmd="" cursor />
              </div>
            </div>
          </Terminal>
        </div>
      </div>
    </section>
  );
}

function Prompt({ cmd, cursor = false }: { cmd: string; cursor?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[var(--color-neon-pink)] glow-pink">$</span>
      <span className="break-all text-[var(--color-text)]">{cmd}</span>
      {cursor && (
        <span className="cursor-blink text-[var(--color-phosphor)]">▊</span>
      )}
    </div>
  );
}

function Out({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`pl-4 text-[var(--color-text-muted)] ${className}`}>
      {children}
    </div>
  );
}
