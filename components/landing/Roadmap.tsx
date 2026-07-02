import WindowFrame from "@/components/ui/WindowFrame";
import GlitchText from "@/components/ui/GlitchText";
import Tag from "@/components/ui/Tag";

const STAGES = [
  {
    n: "01",
    accent: "pink" as const,
    title: "Alpha — testable",
    status: "now" as const,
    body: "Where we are today. A very alpha, testable version: bring an EIP and your own provider key, run the three phases, get documented Solidity. Rough edges, breaking changes, output not guaranteed to compile.",
  },
  {
    n: "02",
    accent: "cyan" as const,
    title: "Alpha — polished",
    status: "next" as const,
    body: "Still alpha, still testable — but polished. Steadier runs, cleaner output, fewer rough edges across providers and models. The same flow, more reliable.",
  },
  {
    n: "03",
    accent: "purple" as const,
    title: "Scaffold-EVVM local",
    status: "planned" as const,
    body: "Connected to scaffold-evvm: take the generated contracts straight into local compilation and deployment, so you can compile and run your EIP experiment locally instead of just reading the .sol.",
  },
  {
    n: "04",
    accent: "mint" as const,
    title: "Testnet-ready",
    status: "planned" as const,
    body: "Scaffold-evvm compatible plus ready for EVVM testnet deployment — an end-to-end path from EIP to a deployed experiment on the EVVM testnet.",
  },
];

const STATUS_TAG: Record<
  "now" | "next" | "planned",
  { label: string; variant: "phosphor" | "amber" | "neutral" }
> = {
  now: { label: "● you are here", variant: "phosphor" },
  next: { label: "next", variant: "amber" },
  planned: { label: "planned", variant: "neutral" },
};

export default function Roadmap() {
  return (
    <section id="roadmap" className="relative py-20">
      <div className="mx-auto max-w-7xl px-4">
        <header className="mb-10 max-w-3xl">
          <p className="mb-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">
            // roadmap (raw)
          </p>
          <h2 className="text-4xl leading-tight md:text-5xl">
            <GlitchText color="cyan">Where this is going</GlitchText>.
          </h2>
          <p className="mt-4 max-w-2xl text-[var(--color-text-muted)]">
            A rough, honest plan — subject to change. EVVM EIP Lab is
            early; this is the direction, not a commitment of dates.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((s) => {
            const tag = STATUS_TAG[s.status];
            return (
              <WindowFrame
                key={s.n}
                title={`stage ${s.n}`}
                accent={s.accent}
                controls={false}
                glow={s.status === "now"}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="font-[family-name:var(--font-press-start)] text-xl leading-none text-[var(--color-vp-cyan)] glow-cyan">
                    {s.n}
                  </div>
                  <Tag variant={tag.variant}>{tag.label}</Tag>
                </div>
                <h3 className="mb-2 text-base font-semibold">{s.title}</h3>
                <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
                  {s.body}
                </p>
              </WindowFrame>
            );
          })}
        </div>
      </div>
    </section>
  );
}
