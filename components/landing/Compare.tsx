import WindowFrame from "@/components/ui/WindowFrame";
import GlitchText from "@/components/ui/GlitchText";

interface Row {
  dim: string;
  traditional: string;
  eiplab: string;
}

const ROWS: Row[] = [
  {
    dim: "Setup time",
    traditional: "1–2 weeks finding the right surface and writing the scaffolding",
    eiplab: "1 afternoon (scaffolder + 4 reference docs)",
  },
  {
    dim: "Dependency tracking",
    traditional: "Manual; usually loses track of what's mocked vs. real",
    eiplab: "Manifest with `requires[]` + `mocks[]` + per-mock `limitation`",
  },
  {
    dim: "Output shape",
    traditional: "Code + half-finished extras, mixed maturity",
    eiplab: "Solidity + per-contract justification (deliberately narrow)",
  },
  {
    dim: "Mock honesty",
    traditional: "'Good enough' mocks; caveats hidden in PR comments",
    eiplab: "Every mock has explicit `limitation` field in manifest + writeup",
  },
  {
    dim: "Big EIPs",
    traditional: "Researcher tries to do too much at once",
    eiplab: ">5 mocks needed = skill proposes decomposition into sub-experiments",
  },
];

export default function Compare() {
  return (
    <section id="compare" className="mx-auto max-w-7xl px-4 py-20">
      <header className="mb-10 max-w-3xl">
        <p className="mb-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">
          // comparison
        </p>
        <h2 className="text-4xl leading-tight md:text-5xl">
          <GlitchText color="pink">vs. rolling your own</GlitchText>
        </h2>
        <p className="mt-4 max-w-2xl text-[var(--color-text-muted)]">
          Not better at everything. Better at the part most projects skimp on:
          documenting what&apos;s real vs. stubbed, and stopping before scope
          explodes.
        </p>
      </header>

      <WindowFrame title="comparison.csv" accent="cyan" controls={false} flush>
        <div className="overflow-hidden">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--color-vp-purple)",
                  background: "rgba(185, 103, 255, 0.08)",
                }}
              >
                <th className="w-1/5 px-4 py-3 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">
                  dimension
                </th>
                <th className="w-2/5 px-4 py-3 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
                  traditional
                </th>
                <th className="w-2/5 px-4 py-3 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-vp-pink)] glow-pink">
                  eiplab
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => (
                <tr
                  key={r.dim}
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    background:
                      i % 2 === 0
                        ? "transparent"
                        : "rgba(255,255,255,0.02)",
                  }}
                >
                  <td className="px-4 py-3.5 align-top font-[family-name:var(--font-mono)] text-sm font-bold text-[var(--color-vp-cyan)]">
                    {r.dim}
                  </td>
                  <td className="px-4 py-3.5 align-top text-sm leading-relaxed text-[var(--color-text-muted)]">
                    {r.traditional}
                  </td>
                  <td className="px-4 py-3.5 align-top text-sm leading-relaxed text-[var(--color-text)]">
                    {r.eiplab}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </WindowFrame>
    </section>
  );
}
