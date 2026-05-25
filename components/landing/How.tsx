import Panel from "@/components/ui/Panel";
import GlowText from "@/components/ui/GlowText";

const PHASES = [
  {
    n: "01",
    title: "Read & summarize",
    body: "Pull the EIP from eips.ethereum.org, produce a <200-word summary: status, category, surface touched, the single most important change.",
  },
  {
    n: "1.5",
    title: "Deps + mock survey",
    body: "Walk the declared `requires:` list AND the implicit deps. For each, pick vendor / mock / simulate / defer. Record in manifest.",
  },
  {
    n: "02",
    title: "Map to surface",
    body: "Decide Shape A (modify Core), Shape B (new service extending EvvmService), or Shape C (external adapter). Wrong shape is the most common failure.",
  },
  {
    n: "03",
    title: "Scaffold",
    body: "Create experiments/eip-N-slug/ with manifest, justification template, contracts directory, scratch notes folder.",
  },
  {
    n: "04",
    title: "Implement + justify",
    body: "Write the Solidity AND populate justification.md as you go. For each contract: what, why, EIP mapping, limitations. The justification is the deliverable.",
  },
];

export default function How() {
  return (
    <section
      id="how"
      className="relative border-y border-[var(--color-border)] bg-[rgba(26,10,46,0.4)] py-24"
    >
      <div className="mx-auto max-w-7xl px-6">
        <header className="mb-12 max-w-3xl">
          <p className="mb-2 text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
            // how it works
          </p>
          <h2 className="text-4xl md:text-5xl">
            <GlowText color="purple" display>
              Five phases
            </GlowText>
            , end at Solidity.
          </h2>
          <p className="mt-4 text-[var(--color-text-muted)]">
            The skill drives all five — you guide the calls it can't make
            (which path to take when an EIP requires another draft EIP, which
            sub-experiment to start with when scope is huge).
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-5 md:grid-cols-2">
          {PHASES.map((p, i) => {
            const accent =
              i === 0 || i === 4
                ? ("pink" as const)
                : i === 1 || i === 3
                  ? ("cyan" as const)
                  : ("purple" as const);
            return (
              <Panel key={p.n} glow={accent} className="p-5">
                <div
                  className={`mb-3 font-[family-name:var(--font-vt323)] text-3xl ${
                    accent === "pink"
                      ? "text-[var(--color-neon-pink)] glow-pink"
                      : accent === "cyan"
                        ? "text-[var(--color-neon-cyan)] glow-cyan"
                        : "text-[var(--color-neon-purple)] glow-purple"
                  }`}
                >
                  {p.n}
                </div>
                <h3 className="mb-2 text-base font-semibold">{p.title}</h3>
                <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
                  {p.body}
                </p>
              </Panel>
            );
          })}
        </div>
      </div>
    </section>
  );
}
