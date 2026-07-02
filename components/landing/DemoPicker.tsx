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
            <GlitchText color="cyan">Three EIPs, three experiments</GlitchText>
          </h2>
          <p className="mt-4 max-w-2xl text-[var(--color-text-muted)]">
            A Core modification (shape A) and two new services (shape B) — a
            frame router and a mock-heavy shielded pool. Open a demo to
            explore the contracts, or download the EVVM package directly.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-3">
          {DEMOS.map((d) => {
            const frame = ACCENT_TO_FRAME[d.accent];
            const tag = ACCENT_TO_TAG[d.accent];
            const text = ACCENT_TO_TEXT[d.accent];
            return (
              <WindowFrame
                key={d.slug}
                title={`eip-${d.eipNumber}`}
                accent={frame}
                glow
                controls
              >
                <div className="flex flex-col">
                  {/* Whole-card click target = open the demo */}
                  <Link
                    href={`/demo/${d.slug}` as never}
                    className="-mx-1 -mt-1 mb-3 block !text-inherit hover:!filter-none hover:!drop-shadow-none"
                  >
                    <div className="mb-3 flex items-baseline justify-between gap-2">
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

                    <p className="mb-1 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">
                      {d.shapeLabel}
                    </p>
                    <h3 className="mb-2 text-base leading-tight font-semibold">
                      {d.shortTitle}
                    </h3>
                    <p className="min-h-[80px] text-sm leading-relaxed text-[var(--color-text-muted)]">
                      {d.summary}
                    </p>
                  </Link>

                  {/* Action row — separate links, no nested anchors */}
                  <div
                    className="flex items-center justify-between gap-3 border-t pt-3 text-xs"
                    style={{ borderColor: "rgba(255,255,255,0.08)" }}
                  >
                    <a
                      href={`/downloads/${d.slug}.zip`}
                      download
                      className="font-[family-name:var(--font-mono)] font-bold uppercase tracking-widest text-[var(--color-matrix)] glow-matrix hover:!filter-none"
                    >
                      ↓ .zip
                    </a>
                    <Link
                      href={`/demo/${d.slug}` as never}
                      className={`font-[family-name:var(--font-mono)] uppercase tracking-widest ${text}`}
                    >
                      open demo →
                    </Link>
                  </div>
                </div>
              </WindowFrame>
            );
          })}
        </div>
      </div>
    </section>
  );
}
