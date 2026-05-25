import { DOCS, SITE } from "@/lib/constants";

/**
 * Persistent footer for demo pages — always visible while exploring,
 * so the "where do I actually test this" answer is one click away.
 */
export default function SkillFooter() {
  return (
    <div className="mt-8 rounded-sm border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[260px]">
          <p className="text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
            recommended testing interface
          </p>
          <p className="mt-1 text-sm text-[var(--color-text)]">
            Drop these contracts into{" "}
            <a
              href={SITE.scaffoldEvvm}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-neon-cyan)]"
            >
              scaffold-evvm
            </a>{" "}
            and run them against a local EVVM stack. Tests, deploys, and EIP
            drafts stay with your own tooling.
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href={DOCS.scaffoldEvvm}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-neon-cyan)] bg-[rgba(0,245,255,0.08)] px-4 py-2 text-sm text-[var(--color-neon-cyan)] glow-cyan hover:bg-[rgba(0,245,255,0.18)]"
          >
            scaffold-evvm docs ↗
          </a>
          <a
            href={DOCS.howToMakeService}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-2 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-neon-purple)] hover:text-[var(--color-text)]"
          >
            make a service ↗
          </a>
        </div>
      </div>
    </div>
  );
}
