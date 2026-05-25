/**
 * react-markdown component overrides for vaporwave-styled rendering.
 * Used by the JustificationPanel to render justification.md.
 */

import type { Components } from "react-markdown";

export const justificationMarkdownComponents: Components = {
  h1: (props) => (
    <h1
      className="mb-4 font-[family-name:var(--font-vt323)] text-3xl text-[var(--color-text)] glow-purple"
      {...props}
    />
  ),
  h2: (props) => (
    <h2
      className="mt-8 mb-3 border-b border-[var(--color-border)] pb-2 font-[family-name:var(--font-vt323)] text-2xl text-[var(--color-neon-cyan)] glow-cyan"
      {...props}
    />
  ),
  h3: (props) => (
    <h3
      className="mt-6 mb-2 font-[family-name:var(--font-mono)] text-base font-semibold text-[var(--color-neon-pink)]"
      {...props}
    />
  ),
  h4: (props) => (
    <h4
      className="mt-4 mb-1 font-[family-name:var(--font-mono)] text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]"
      {...props}
    />
  ),
  p: (props) => (
    <p
      className="mb-3 text-sm leading-relaxed text-[var(--color-text)]"
      {...props}
    />
  ),
  ul: (props) => (
    <ul className="mb-3 ml-4 list-disc space-y-1 text-sm marker:text-[var(--color-neon-purple)]" {...props} />
  ),
  ol: (props) => (
    <ol className="mb-3 ml-4 list-decimal space-y-1 text-sm marker:text-[var(--color-neon-purple)]" {...props} />
  ),
  li: (props) => (
    <li className="text-[var(--color-text)] leading-relaxed" {...props} />
  ),
  blockquote: (props) => (
    <blockquote
      className="my-4 border-l-2 border-[var(--color-neon-pink)] bg-[rgba(255,0,110,0.06)] px-4 py-2 text-sm italic text-[var(--color-text-muted)]"
      {...props}
    />
  ),
  code: (props) => {
    const { className, children, ...rest } = props as {
      className?: string;
      children?: React.ReactNode;
    };
    // Inline `code`
    if (!className) {
      return (
        <code
          className="rounded-sm bg-[var(--color-bg-elevated)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[0.85em] text-[var(--color-neon-cyan)]"
          {...rest}
        >
          {children}
        </code>
      );
    }
    // Fenced ``` blocks
    return (
      <code
        className="block overflow-x-auto rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] p-3 font-[family-name:var(--font-mono)] text-xs"
        {...rest}
      >
        {children}
      </code>
    );
  },
  pre: (props) => (
    <pre className="my-3 overflow-x-auto" {...props} />
  ),
  a: (props) => (
    <a
      target="_blank"
      rel="noreferrer"
      className="text-[var(--color-neon-cyan)] underline underline-offset-2 hover:filter hover:drop-shadow-[0_0_4px_var(--color-neon-cyan)]"
      {...props}
    />
  ),
  hr: () => (
    <hr className="my-6 border-t border-[var(--color-border)]" />
  ),
  table: (props) => (
    <div className="my-3 overflow-x-auto">
      <table
        className="w-full border-collapse border border-[var(--color-border)] text-sm"
        {...props}
      />
    </div>
  ),
  th: (props) => (
    <th
      className="border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-left text-xs uppercase tracking-wider text-[var(--color-text-dim)]"
      {...props}
    />
  ),
  td: (props) => (
    <td
      className="border border-[var(--color-border)] px-3 py-2 text-[var(--color-text)]"
      {...props}
    />
  ),
  strong: (props) => (
    <strong className="font-bold text-[var(--color-neon-pink)]" {...props} />
  ),
  em: (props) => (
    <em className="text-[var(--color-text-muted)]" {...props} />
  ),
};
