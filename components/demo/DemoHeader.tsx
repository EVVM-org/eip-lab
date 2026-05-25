import Tag from "@/components/ui/Tag";
import GlitchText from "@/components/ui/GlitchText";
import { DOCS } from "@/lib/constants";
import type { LoadedDemo } from "@/lib/demos";

export default function DemoHeader({ demo }: { demo: LoadedDemo }) {
  return (
    <header className="mx-auto max-w-7xl px-4 pt-8 pb-4">
      <div className="mb-3 flex items-center gap-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">
        <a href="/#demos" className="hover:text-[var(--color-vp-cyan)]">
          ← all demos
        </a>
        <span>/</span>
        <span>eip-{demo.eip.number}</span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-3">
            <GlitchText color="pink" className="text-5xl">
              EIP-{demo.eip.number}
            </GlitchText>
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
          className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-muted)] hover:text-[var(--color-vp-cyan)]"
        >
          eips.ethereum.org ↗
        </a>
      </div>

      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[var(--color-text-muted)]">
        <span className="text-[var(--color-matrix)] glow-matrix">› hypothesis</span>{" "}
        {demo.experiment.hypothesis}
      </p>

      <p className="mt-3 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-text-dim)]">
        <span className="text-[var(--color-vp-purple)]">› runtime</span>{" "}
        drop these into{" "}
        <a
          href={DOCS.scaffoldEvvm}
          target="_blank"
          rel="noreferrer"
          className="text-[var(--color-vp-cyan)]"
        >
          scaffold-evvm ↗
        </a>{" "}
        to run them
      </p>
    </header>
  );
}
