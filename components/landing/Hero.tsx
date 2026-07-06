import WindowFrame from "@/components/ui/WindowFrame";
import PixelButton from "@/components/ui/PixelButton";
import GlitchText from "@/components/ui/GlitchText";
import BootSequence from "@/components/ui/BootSequence";

export default function Hero() {
  return (
    <section className="relative px-4 pt-12 pb-24 md:pt-16">
      <div className="mx-auto max-w-7xl">
        <WindowFrame title="~/eiplab" accent="pink" glow>
          <div className="grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-center md:gap-12 px-2 py-4 md:py-8">
            {/* Left — title + CTAs */}
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-panel)] px-3 py-1 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-text-muted)]">
                <span className="size-1.5 rounded-full bg-[var(--color-accent)]" />
                EVVM · protocol-level lab
              </div>

              <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
                Test any EIP on the{" "}
                <GlitchText color="mint">EVVM stack</GlitchText>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--color-text-muted)]">
                EVVM is where protocol-level experiments get modeled at the
                contract layer. Bring an EIP and your own AI key — the Lab
                researches it against the full EVVM stack, asks a few
                questions to find the happy path, and hands back documented{" "}
                <code className="rounded bg-[var(--color-bg-panel)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[0.85em] text-[var(--color-vp-cyan)]">
                  .sol
                </code>{" "}
                contracts.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <PixelButton href="/lab" variant="primary" size="lg">
                  Launch EIP Lab
                </PixelButton>
                <PixelButton href="/#demos" variant="secondary" size="lg">
                  See examples →
                </PixelButton>
              </div>
            </div>

            {/* Right — nested terminal preview with boot sequence */}
            <div>
              <WindowFrame title="~/eiplab/run" accent="cyan" controls={false}>
                <BootSequence
                  charDelay={14}
                  lineDelay={130}
                  lines={[
                    "provider: openai · gpt-5.5 ready",
                    "input: eip material loaded",
                    "phase 01 → upload ✓",
                    "phase 02 → deep research (≤7 Q&A)",
                    "  grounded in the full evvm docs",
                    "  shape A: modify Core.sol (as diffs)",
                    "  deps: 2 mocked, 1 deferred",
                    "phase 03 → emit documented .sol",
                    "✓ contracts + justification",
                  ]}
                />
              </WindowFrame>
            </div>
          </div>
        </WindowFrame>
      </div>
    </section>
  );
}
