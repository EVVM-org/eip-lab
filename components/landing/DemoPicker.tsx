import Link from "next/link";
import WindowFrame from "@/components/ui/WindowFrame";
import GlitchText from "@/components/ui/GlitchText";
import Tag from "@/components/ui/Tag";
import { DEMOS } from "@/lib/constants";

const ACCENT_TO_FRAME = {
  "neon-pink": "pink" as const,
  "neon-cyan": "cyan" as const,
  "neon-purple": "purple" as const,
};

const ACCENT_TO_TAG = {
  "neon-pink": "pink" as const,
  "neon-cyan": "cyan" as const,
  "neon-purple": "purple" as const,
};

const ACCENT_TO_TEXT = {
  "neon-pink": "text-[var(--color-vp-pink)] glow-pink" as const,
  "neon-cyan": "text-[var(--color-vp-cyan)] glow-cyan" as const,
  "neon-purple": "text-[var(--color-vp-purple)] glow-purple" as const,
};

export default function DemoPicker() {
  return (
    <section
      id="demos"
      className="relative py-20"
      style={{
        background: "rgba(13, 13, 21, 0.45)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div className="mx-auto max-w-7xl px-4">
        <header className="mb-10 max-w-3xl">
          <p className="mb-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">
            // demos
          </p>
          <h2 className="text-4xl leading-tight md:text-5xl">
            <GlitchText color="cyan">Three EIPs, three shapes</GlitchText>
          </h2>
          <p className="mt-4 max-w-2xl text-[var(--color-text-muted)]">
            One Core-modification, one new-service, one mock-heavy
            shielded-pool service. Each demo shows the actual{" "}
            <code className="bg-[var(--color-bg-deep)] px-1 text-[var(--color-vp-cyan)]">
              .sol
            </code>{" "}
            files the skill produces, plus the per-contract justification.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-3">
          {DEMOS.map((d) => {
            const frame = ACCENT_TO_FRAME[d.accent];
            const tag = ACCENT_TO_TAG[d.accent];
            const text = ACCENT_TO_TEXT[d.accent];
            return (
              <Link
                key={d.slug}
                href={`/demo/${d.slug}` as never}
                className="group block !text-inherit hover:!filter-none hover:!drop-shadow-none"
              >
                <WindowFrame
                  title={`eip-${d.eipNumber}`}
                  accent={frame}
                  glow
                  controls
                  className="transition-transform group-hover:translate-y-[-2px]"
                >
                  <div className="mb-4 flex items-baseline justify-between gap-2">
                    <span
                      className={`font-[family-name:var(--font-vt323)] text-4xl ${text}`}
                    >
                      EIP-{d.eipNumber}
                    </span>
                    <div className="flex gap-1.5">
                      <Tag variant={tag}>shape {d.shape}</Tag>
                      <Tag variant="neutral">{d.contractCount} files</Tag>
                    </div>
                  </div>

                  <h3 className="mb-3 text-base leading-tight font-semibold">
                    {d.shortTitle}
                  </h3>
                  <p className="mb-6 min-h-[80px] text-sm leading-relaxed text-[var(--color-text-muted)]">
                    {d.summary}
                  </p>

                  <div
                    className="flex items-center justify-between border-t pt-3 text-xs"
                    style={{ borderColor: "rgba(255,255,255,0.08)" }}
                  >
                    <span className="font-[family-name:var(--font-mono)] uppercase tracking-widest text-[var(--color-text-dim)]">
                      {d.shapeLabel}
                    </span>
                    <span className={text}>open demo →</span>
                  </div>
                </WindowFrame>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
