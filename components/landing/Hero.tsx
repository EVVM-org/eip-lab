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
              <div className="mb-5 inline-flex items-center gap-2 border border-[var(--color-matrix)] bg-[rgba(51,255,65,0.06)] px-2.5 py-1 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-matrix)] glow-matrix">
                <span className="size-1.5 bg-[var(--color-matrix)] pulse-glow" />
                EVVM · protocol-level lab · live
              </div>

              <h1 className="text-4xl leading-[0.95] md:text-6xl">
                <GlitchText color="pink" pixel className="text-[26px] md:text-[40px]">
                  TEST ANY EIP
                </GlitchText>
                <br />
                <span className="font-[family-name:var(--font-vt323)] text-[44px] md:text-[84px]">
                  on the
                </span>{" "}
                <GlitchText color="cyan" className="text-[44px] md:text-[84px]">
                  EVVM stack
                </GlitchText>
                <span className="cursor-blink ml-2 text-[var(--color-matrix)]">▊</span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--color-text)]">
                EVVM is where protocol-level experiments get modeled at the
                contract layer. Bring an EIP and your own AI key — the Lab
                reads it, agrees with you on what it is, maps it onto the
                EVVM core, and hands back documented{" "}
                <code className="bg-[var(--color-bg-deep)] px-1 text-[var(--color-vp-cyan)]">
                  .sol
                </code>{" "}
                contracts.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <PixelButton href="/lab" variant="primary" size="lg" bracket>
                  Launch EIP Lab
                </PixelButton>
                <PixelButton href="/#demos" variant="secondary" size="lg">
                  See examples →
                </PixelButton>
              </div>
            </div>

            {/* Right — nested terminal window with boot sequence */}
            <div>
              <WindowFrame title="~/eiplab/run" accent="cyan" controls={false}>
                <BootSequence
                  charDelay={14}
                  lineDelay={130}
                  lines={[
                    "provider: venice ai · model ready",
                    "input: eip material loaded",
                    "phase 01 → upload ✓",
                    "phase 02 → read & agree on intent",
                    "phase 03 → map onto evvm core",
                    "  shape A: modify Core.sol",
                    "  deps: 2 mocked, 1 simulated",
                    "phase 04 → emit documented .sol",
                    "✓ 12 contracts + justification",
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
