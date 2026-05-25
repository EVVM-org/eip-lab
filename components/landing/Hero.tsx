import WindowFrame from "@/components/ui/WindowFrame";
import PixelButton from "@/components/ui/PixelButton";
import GlitchText from "@/components/ui/GlitchText";
import BootSequence from "@/components/ui/BootSequence";
import { SITE } from "@/lib/constants";

export default function Hero() {
  return (
    <section className="relative px-4 pt-12 pb-24 md:pt-16">
      <div className="mx-auto max-w-7xl">
        <WindowFrame title="~/eiplab" accent="pink" glow>
          <div className="grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-center md:gap-12 px-2 py-4 md:py-8">
            {/* Left — title + CTAs */}
            <div>
              <div className="mb-5 inline-flex items-center gap-2 border border-[var(--color-matrix)] bg-[rgba(51,255,65,0.06)] px-2.5 py-1 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-matrix)] glow-matrix">
                <span className="size-1.5 bg-[var(--color-matrix)] pulse-glow" />
                online · v0.1 · live demo
              </div>

              <h1 className="text-4xl leading-[0.95] md:text-6xl">
                <GlitchText color="pink" pixel className="text-[28px] md:text-[44px]">
                  PROTOTYPE
                </GlitchText>
                <br />
                <span className="font-[family-name:var(--font-vt323)] text-[44px] md:text-[88px]">
                  any EIP
                </span>
                <br />
                <GlitchText color="cyan" className="text-[44px] md:text-[88px]">
                  in an afternoon
                </GlitchText>
                <span className="cursor-blink ml-2 text-[var(--color-matrix)]">▊</span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--color-text)]">
                Modify the core. Add services. Mock the heavy crypto. Get the{" "}
                <code className="bg-[var(--color-bg-deep)] px-1 text-[var(--color-vp-cyan)]">.sol</code>
                {" "}files and a per-contract justification document — for any
                EIP you want to model.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <PixelButton href="/#demos" variant="primary">
                  Launch demo →
                </PixelButton>
                <PixelButton href={SITE.skillRepo} external variant="secondary">
                  View skill ↗
                </PixelButton>
              </div>
            </div>

            {/* Right — nested terminal window with boot sequence */}
            <div>
              <WindowFrame title="~/eiplab/boot" accent="cyan" controls={false}>
                <BootSequence
                  charDelay={14}
                  lineDelay={130}
                  lines={[
                    "loading skill modules...",
                    "→ references/core-anatomy ✓",
                    "→ references/eip-mapping-strategy ✓",
                    "→ references/signature-surface ✓",
                    "→ references/dependency-and-mocking ✓",
                    "scaffolding experiment eip-N-<slug>",
                    "writing manifest.json",
                    "writing justification.md",
                    "compiling 12 contracts (modified core + services + mocks)",
                    "✓ ready in 23.4s",
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
