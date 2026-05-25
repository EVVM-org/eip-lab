import GlowText from "@/components/ui/GlowText";

interface Row {
  dim: string;
  traditional: string;
  eiplab: string;
}

const ROWS: Row[] = [
  {
    dim: "Setup time",
    traditional: "1–2 weeks (forge init, deps, mocks, fixtures, harness)",
    eiplab: "1 afternoon (scaffold via tsx + 4 reference files)",
  },
  {
    dim: "Dependency tracking",
    traditional: "Manual; usually loses track of what's mocked vs. real",
    eiplab: "Manifest with `requires[]` + `mocks[]` + per-mock `limitation`",
  },
  {
    dim: "Output",
    traditional: "Code + tests + deploy + draft, mixed maturity",
    eiplab: "Solidity + per-contract justification (deliberately narrow)",
  },
  {
    dim: "Tests / deploy / draft",
    traditional: "Bundled — often half-finished, blocks PR review",
    eiplab: "Out of scope — use your own pipeline (intentional handoff)",
  },
  {
    dim: "Mock honesty",
    traditional: "Mocks shipped as 'good enough,' caveats hidden in PR comments",
    eiplab: "Every mock has explicit `limitation` field in manifest + writeup",
  },
  {
    dim: "Decomposition for big EIPs",
    traditional: "Researcher decides ad-hoc; often tries to do too much at once",
    eiplab: "Skill refuses single experiment when >5 mocks needed; proposes sub-experiments",
  },
];

export default function Compare() {
  return (
    <section id="compare" className="mx-auto max-w-7xl px-6 py-24">
      <header className="mb-12 max-w-3xl">
        <p className="mb-2 text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
          // comparison
        </p>
        <h2 className="text-4xl md:text-5xl">
          <GlowText color="pink" display>
            vs. rolling your own
          </GlowText>
        </h2>
        <p className="mt-4 text-[var(--color-text-muted)]">
          Not better at everything. Better at the part most projects skimp on:
          documenting what's real vs. stubbed, and stopping before the scope
          explodes.
        </p>
      </header>

      <div className="overflow-hidden rounded-sm border border-[var(--color-border)]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
              <th className="w-1/4 px-5 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-dim)]">
                Dimension
              </th>
              <th className="w-3/8 px-5 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                Traditional approach
              </th>
              <th className="w-3/8 px-5 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-neon-pink)] glow-pink">
                EIPLab
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, i) => (
              <tr
                key={r.dim}
                className={`border-b border-[var(--color-border)] last:border-b-0 ${
                  i % 2 === 0
                    ? "bg-[var(--color-bg-panel)]"
                    : "bg-[rgba(26,10,46,0.4)]"
                }`}
              >
                <td className="px-5 py-4 text-sm font-medium text-[var(--color-text)]">
                  {r.dim}
                </td>
                <td className="px-5 py-4 text-sm text-[var(--color-text-muted)]">
                  {r.traditional}
                </td>
                <td className="px-5 py-4 text-sm text-[var(--color-text)]">
                  {r.eiplab}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
