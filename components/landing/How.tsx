import WindowFrame from "@/components/ui/WindowFrame";
import GlitchText from "@/components/ui/GlitchText";

const PHASES = [
  {
    n: "01",
    accent: "pink" as const,
    title: "Read & summarize",
    body: "Pull the EIP from eips.ethereum.org and produce a <200-word summary: status, category, surface touched, the single most important change.",
  },
  {
    n: "1.5",
    accent: "cyan" as const,
    title: "Deps + mocks",
    body: "Walk the declared `requires:` list AND the implicit deps. For each: vendor / mock / simulate / defer. Recorded in the manifest.",
  },
  {
    n: "02",
    accent: "purple" as const,
    title: "Map the surface",
    body: "Decide Shape A (modify Core), Shape B (new service), or Shape C (external adapter). Wrong shape is the most common failure mode.",
  },
  {
    n: "03",
    accent: "mint" as const,
    title: "Scaffold",
    body: "Create experiments/eip-N-<slug>/ with manifest, justification template, contracts directory, scratch notes folder.",
  },
  {
    n: "04",
    accent: "pink" as const,
    title: "Write & justify",
    body: "Solidity in /contracts. Per-contract justification: what, why, EIP mapping, limitations. The justification IS the deliverable.",
  },
];

export default function How() {
  return (
    <section
      id="how"
      className="relative py-20"
      style={{
        background: "rgba(13, 13, 21, 0.45)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div className="mx-auto max-w-7xl px-4">
        <header className="mb-10 max-w-3xl">
          <p className="mb-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">
            // how it works
          </p>
          <h2 className="text-4xl leading-tight md:text-5xl">
            <GlitchText color="purple">Five phases</GlitchText>, end at
            Solidity.
          </h2>
          <p className="mt-4 max-w-2xl text-[var(--color-text-muted)]">
            The skill drives all five. You make the calls it can&apos;t —
            which path when an EIP requires another draft EIP, which sub-
            experiment when the scope is huge.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {PHASES.map((p) => (
            <WindowFrame
              key={p.n}
              title={`phase ${p.n}`}
              accent={p.accent}
              controls={false}
            >
              <div className="font-[family-name:var(--font-press-start)] text-xl leading-none mb-3 text-[var(--color-vp-cyan)] glow-cyan">
                {p.n}
              </div>
              <h3 className="mb-2 text-base font-semibold">{p.title}</h3>
              <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
                {p.body}
              </p>
            </WindowFrame>
          ))}
        </div>
      </div>
    </section>
  );
}
