import Panel from "@/components/ui/Panel";
import GlowText from "@/components/ui/GlowText";

const REASONS = [
  {
    label: "Speed",
    title: "Hours, not weeks",
    body: "Skip the week-long ramp-up of finding the right Core surface, building mock infrastructure, and writing scaffolding. The agent already knows where things plug in.",
    glow: "pink" as const,
  },
  {
    label: "Focus",
    title: "Solidity + justification",
    body: "EIPLab produces exactly two things per experiment: the contracts and a per-contract justification document. Tests and deploys stay in your existing pipeline.",
    glow: "cyan" as const,
  },
  {
    label: "Honesty",
    title: "Mocks called out by name",
    body: "Every mock contract carries an explicit `limitation` field — what it stubs, why, and what claims it does NOT support. Reviewers see real vs. fake at a glance.",
    glow: "purple" as const,
  },
];

export default function Why() {
  return (
    <section id="why" className="mx-auto max-w-7xl px-6 py-24">
      <header className="mb-12 max-w-3xl">
        <p className="mb-2 text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
          // why eiplab
        </p>
        <h2 className="text-4xl md:text-5xl">
          The bottleneck isn't the EIP.
          <br />
          <GlowText color="cyan" display>
            It's everything around it.
          </GlowText>
        </h2>
        <p className="mt-4 text-[var(--color-text-muted)]">
          Traditional EIP prototyping spends a week on plumbing before you
          know if the idea works. EIPLab compresses that to an afternoon —
          and is honest about what it can and can't prove.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {REASONS.map((r) => (
          <Panel key={r.label} glow={r.glow} label={r.label} className="p-6">
            <h3 className="mb-3 text-2xl">{r.title}</h3>
            <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
              {r.body}
            </p>
          </Panel>
        ))}
      </div>
    </section>
  );
}
