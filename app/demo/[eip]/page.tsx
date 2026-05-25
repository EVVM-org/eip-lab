/**
 * Stub. Replaced in M2 with the real 3-pane file explorer.
 */
import Link from "next/link";
import Terminal from "@/components/ui/Terminal";

interface PageProps {
  params: Promise<{ eip: string }>;
}

export default async function DemoStub({ params }: PageProps) {
  const { eip } = await params;
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <Terminal title={`~/demos/${eip}`}>
        <div className="space-y-2">
          <div className="text-[var(--color-neon-pink)]">$ open {eip}</div>
          <div className="pl-4 text-[var(--color-text-muted)]">
            Demo viewer scaffolding in progress (M2).
            <br />
            File tree, code viewer, and justification panel land in the next push.
          </div>
          <div className="pt-3">
            <Link href="/#demos" className="text-[var(--color-neon-cyan)]">
              ← back to demos
            </Link>
          </div>
        </div>
      </Terminal>
    </section>
  );
}
