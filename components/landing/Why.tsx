import WindowFrame from "@/components/ui/WindowFrame";
import GlitchText from "@/components/ui/GlitchText";

const REASONS = [
  {
    file: "evvm.txt",
    accent: "pink" as const,
    headline: "Built for protocol experiments",
    body: "EVVM's core contracts are modifiable, so an EIP — new signatures, nonce models, account abstraction, privacy, gas changes — can be modeled at the contract layer and exercised directly. It's the natural place to test protocol-level ideas.",
  },
  {
    file: "focus.txt",
    accent: "cyan" as const,
    headline: "Solidity + justification",
    body: "Every run produces exactly two things: the documented .sol files and a per-contract justification. Sharp scope. No half-finished extras to clean up afterward.",
  },
  {
    file: "honesty.txt",
    accent: "purple" as const,
    headline: "Mocks called by name",
    body: "Heavy dependencies (ZK proofs, exotic hashes, precompiles) get mocked — and every mock carries an explicit limitation: what it stubs and what claims it does NOT support. Real vs. stubbed, at a glance.",
  },
];

export default function Why() {
  return (
    <section id="why" className="mx-auto max-w-7xl px-4 py-20">
      <header className="mb-10 max-w-3xl">
        <p className="mb-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">
          // why evvm eip lab
        </p>
        <h2 className="text-4xl leading-tight md:text-5xl">
          The bottleneck isn&apos;t the EIP.
          <br />
          <GlitchText color="cyan">It&apos;s getting to running code.</GlitchText>
        </h2>
        <p className="mt-4 max-w-2xl text-[var(--color-text-muted)]">
          Going from an EIP to contracts you can reason about usually means
          days of plumbing. The Lab compresses that — and is honest about
          what it can and can&apos;t prove.
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
