import WindowFrame from "@/components/ui/WindowFrame";
import GlitchText from "@/components/ui/GlitchText";
import PixelButton from "@/components/ui/PixelButton";

const PHASES = [
  {
    n: "01",
    accent: "pink" as const,
    title: "Upload",
    body: "Load your EIP — paste the full text, upload a .md/.txt file, or drop links (eips.ethereum.org, an Ethereum Magicians thread, a repo). No length limit. An important EIP can be hundreds of lines, and every line can matter.",
  },
  {
    n: "02",
    accent: "cyan" as const,
    title: "Deep research",
    body: "The Lab researches your EIP against the full EVVM stack reference — what each core contract does and what would change to test it. It asks you up to 5 focused questions to converge on the happy path: which shape, which contracts, which dependencies to mock or defer.",
  },
  {
    n: "03",
    accent: "mint" as const,
    title: "Download .sol",
    body: "The deliverable: documented, commented Solidity for the EVVM stack — modified core (as diffs), new services, mocks — plus a per-contract justification. Download the package and take it from there.",
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
            <GlitchText color="purple">Three phases</GlitchText>, end at
            Solidity.
          </h2>
          <p className="mt-4 max-w-2xl text-[var(--color-text-muted)]">
            The Lab drives the research, grounded in the full EVVM stack.
            You answer up to 5 questions so it converges on the right way to
            test your EIP — core modification, a service, or an adapter.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

        <div className="mt-8">
          <PixelButton href="/lab" variant="primary" size="lg" bracket>
            Launch EIP Lab
          </PixelButton>
        </div>
      </div>
    </section>
  );
}
