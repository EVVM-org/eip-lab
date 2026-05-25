interface DocsLinkProps {
  href: string;
  /** Compact mode for use inside the file tree (no label, just icon). */
  compact?: boolean;
  className?: string;
}

export default function DocsLink({
  href,
  compact = false,
  className = "",
}: DocsLinkProps) {
  if (compact) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        title="View on evvm.info"
        aria-label="View on evvm.info"
        className={`inline-flex h-5 w-5 items-center justify-center rounded-sm border border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)] transition hover:border-[var(--color-neon-cyan)] hover:text-[var(--color-neon-cyan)] ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        ↗
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-border)] bg-[var(--color-bg-panel)] px-3 py-1 text-xs text-[var(--color-neon-cyan)] transition hover:border-[var(--color-neon-cyan)] hover:bg-[rgba(0,245,255,0.08)] ${className}`}
    >
      <span>view on evvm.info</span>
      <span className="opacity-70">↗</span>
    </a>
  );
}
