import WindowFrame from "@/components/ui/WindowFrame";
import BootSequence from "@/components/ui/BootSequence";

/**
 * Shown briefly during client-side navigation into a demo. Pure
 * aesthetic — the page itself is SSG and renders fast.
 */
export default function DemoLoading() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-24">
      <WindowFrame title="~/eiplab/boot" accent="purple" glow>
        <BootSequence
          charDelay={20}
          lineDelay={140}
          lines={[
            "initializing eiplab sandbox...",
            "fetching EIP context",
            "loading contracts",
            "highlighting Solidity",
            "rendering justification",
            "ready",
          ]}
        />
      </WindowFrame>
    </section>
  );
}
