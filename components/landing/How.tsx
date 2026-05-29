import WindowFrame from "@/components/ui/WindowFrame";
import GlitchText from "@/components/ui/GlitchText";
import PixelButton from "@/components/ui/PixelButton";

const PHASES = [
  {
    n: "01",
    accent: "pink" as const,
    title: "Upload",
    body: "Load your EIP — paste the full text, or drop links (eips.ethereum.org, an Ethereum Magicians thread, a repo). No length limit. An important EIP can be hundreds of lines, and every line can matter.",
  },
  {
    n: "02",
    accent: "cyan" as const,
    title: "Read & Agree",
    body: "The Lab reads it and tells you what it is — status, surface, the real behavioral change. Then it asks: did I get the intent right? You correct it until you both agree. No forced word limit.",
  },
  {
    n: "03",
    accent: "purple" as const,
    title: "Map the surface",
    body: "The technical conversation: which implementation shape (modify the core, add a service, or an external adapter), which dependencies to vendor / mock / simulate / defer, which EVVM contracts change and how.",
  },
  {
    n: "04",
    accent: "mint" as const,
    title: "Download .sol",
    body: "The deliverable: documented, commented Solidity for the EVVM stack — modified core, new services, mocks — plus a per-contract justification. Download the package and take it from there.",
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
            <GlitchText color="purple">Four phases</GlitchText>, end at
            Solidity.
          </h2>
          <p className="mt-4 max-w-2xl text-[var(--color-text-muted)]">
            The EVVM EIP Lab drives all four. You make the calls it
            can&apos;t — which path when an EIP requires another draft EIP,
            which sub-experiment when the scope is huge.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
