import Link from "next/link";
import Panel from "@/components/ui/Panel";
import Tag from "@/components/ui/Tag";
import GlowText from "@/components/ui/GlowText";
import { DEMOS } from "@/lib/constants";

const ACCENT_TO_TAG = {
  "neon-pink": "pink" as const,
  "neon-cyan": "cyan" as const,
  "neon-purple": "purple" as const,
};

const ACCENT_TO_GLOW = {
  "neon-pink": "pink" as const,
  "neon-cyan": "cyan" as const,
  "neon-purple": "purple" as const,
};

export default function DemoPicker() {
  return (
    <section
      id="demos"
      className="relative border-y border-[var(--color-border)] bg-[rgba(26,10,46,0.4)] py-24"
    >
      <div className="mx-auto max-w-7xl px-6">
        <header className="mb-12 max-w-3xl">
          <p className="mb-2 text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
            // demos
          </p>
          <h2 className="text-4xl md:text-5xl">
            <GlowText color="cyan" display>
              Three EIPs, three shapes
            </GlowText>
          </h2>
          <p className="mt-4 text-[var(--color-text-muted)]">
            One Core-modification, one new-service, one large new-service with
            mock-heavy crypto. Each demo shows the actual `.sol` files the
            skill produces, plus the per-contract justification.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          {DEMOS.map((d) => {
            const tagVariant = ACCENT_TO_TAG[d.accent];
            const glow = ACCENT_TO_GLOW[d.accent];
            return (
              <Link
                key={d.slug}
                href={`/demo/${d.slug}` as never}
                className="group block !text-inherit hover:!filter-none hover:!drop-shadow-none"
              >
                <Panel
                  glow={glow}
                  className="flex h-full flex-col p-6 transition group-hover:translate-y-[-2px]"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="font-[family-name:var(--font-vt323)] text-3xl tracking-wide text-[var(--color-text)]">
                      EIP-{d.eipNumber}
                    </span>
                    <div className="flex gap-2">
                      <Tag variant={tagVariant}>shape {d.shape}</Tag>
                      <Tag variant="neutral">{d.contractCount} files</Tag>
                    </div>
                  </div>

                  <h3 className="mb-3 text-lg leading-tight">
                    {d.shortTitle}
                  </h3>
                  <p className="mb-6 flex-1 text-sm leading-relaxed text-[var(--color-text-muted)]">
                    {d.summary}
                  </p>

                  <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
                    <span className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">
                      {d.shapeLabel}
                    </span>
                    <span
                      className={`text-sm transition ${
                        glow === "pink"
                          ? "text-[var(--color-neon-pink)] group-hover:glow-pink"
                          : glow === "cyan"
                            ? "text-[var(--color-neon-cyan)] group-hover:glow-cyan"
                            : "text-[var(--color-neon-purple)] group-hover:glow-purple"
                      }`}
                    >
                      Open demo →
                    </span>
                  </div>
                </Panel>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
