import WindowFrame from "@/components/ui/WindowFrame";
import GlitchText from "@/components/ui/GlitchText";

const REASONS = [
  {
    file: "speed.txt",
    accent: "pink" as const,
    headline: "Hours, not weeks",
    body: "Skip the week-long ramp-up of finding the right Core surface, building mock infrastructure, and writing scaffolding. The agent already knows where every EIP class plugs in.",
  },
  {
    file: "focus.txt",
    accent: "cyan" as const,
    headline: "Solidity + justification",
    body: "Every experiment produces exactly two things: the .sol files and a per-contract justification document. Sharp scope. No half-finished extras to clean up.",
  },
  {
    file: "honesty.txt",
    accent: "purple" as const,
    headline: "Mocks called by name",
    body: "Every mock contract carries an explicit `limitation` field — what it stubs, why, and what claims it does NOT support. Reviewers see real vs. fake at a glance.",
  },
];

export default function Why() {
  return (
    <section id="why" className="mx-auto max-w-7xl px-4 py-20">
      <header className="mb-10 max-w-3xl">
        <p className="mb-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">
          // why eiplab
        </p>
        <h2 className="text-4xl leading-tight md:text-5xl">
          The bottleneck isn&apos;t the EIP.
          <br />
          <GlitchText color="cyan">It&apos;s everything around it.</GlitchText>
        </h2>
        <p className="mt-4 max-w-2xl text-[var(--color-text-muted)]">
          Traditional EIP prototyping spends a week on plumbing before you
          know if the idea even works. EIPLab compresses that to an
          afternoon — and is honest about what it can and can&apos;t prove.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-3">
        {REASONS.map((r) => (
          <WindowFrame
            key={r.file}
            title={r.file}
            accent={r.accent}
            controls={false}
          >
            <h3 className="mb-3 text-2xl">{r.headline}</h3>
            <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
              {r.body}
            </p>
          </WindowFrame>
        ))}
      </div>
    </section>
  );
}
