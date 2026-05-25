import Terminal from "@/components/ui/Terminal";

/**
 * Shown briefly during client-side navigation into a demo.
 * Pure aesthetic — the page itself is SSG and renders fast.
 */
export default function DemoLoading() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <Terminal title="~/eiplab/boot">
        <div className="space-y-1">
          <div>
            <span className="text-[var(--color-neon-pink)]">$</span>{" "}
            initializing eiplab sandbox
          </div>
          <div className="pl-4 text-[var(--color-text-muted)]">
            › fetching EIP context…
          </div>
          <div className="pl-4 text-[var(--color-text-muted)]">
            › loading contracts…
          </div>
          <div className="pl-4 text-[var(--color-text-muted)]">
            › highlighting Solidity…
          </div>
          <div className="pl-4 text-[var(--color-text-muted)]">
            › rendering justification…
          </div>
          <div className="pt-2 text-[var(--color-phosphor)] glow-phosphor">
            ready
            <span className="cursor-blink ml-1">▊</span>
          </div>
        </div>
      </Terminal>
    </section>
  );
}
