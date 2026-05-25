import Tag from "@/components/ui/Tag";
import GlowText from "@/components/ui/GlowText";
import type { LoadedDemo } from "@/lib/demos";

export default function DemoHeader({ demo }: { demo: LoadedDemo }) {
  return (
    <header className="mx-auto max-w-7xl px-6 pt-8 pb-6">
      <div className="mb-3 flex items-center gap-3 text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
        <a href="/#demos" className="hover:text-[var(--color-neon-cyan)]">
          ← all demos
        </a>
        <span>/</span>
        <span>eip-{demo.eip.number}</span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <span className="font-[family-name:var(--font-vt323)] text-5xl glow-pink text-[var(--color-neon-pink)]">
              EIP-{demo.eip.number}
            </span>
            <Tag variant="pink">shape {demo.experiment.shape}</Tag>
            <Tag variant="neutral">{demo.contracts.length} files</Tag>
          </div>
          <h1 className="mt-2 font-[family-name:var(--font-vt323)] text-3xl text-[var(--color-text)]">
            {demo.eip.title}
          </h1>
        </div>
        <a
          href={demo.eip.url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-neon-cyan)]"
        >
          eips.ethereum.org ↗
        </a>
      </div>

      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[var(--color-text-muted)]">
        <GlowText color="phosphor">› hypothesis</GlowText>{" "}
        {demo.experiment.hypothesis}
      </p>
    </header>
  );
}
