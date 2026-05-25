"use client";

import ContractBadge from "./ContractBadge";
import DocsLink from "./DocsLink";
import type { LoadedContract } from "@/lib/demos";

interface FileTreeProps {
  contracts: LoadedContract[];
  selectedPath: string;
  onSelect: (path: string) => void;
}

/**
 * Groups contracts under their parent folder (typically `contracts/`).
 * Selected file gets a pink accent + neon border, others muted.
 */
export default function FileTree({
  contracts,
  selectedPath,
  onSelect,
}: FileTreeProps) {
  const folders = new Map<string, LoadedContract[]>();
  for (const c of contracts) {
    const folder = c.path.includes("/")
      ? c.path.slice(0, c.path.lastIndexOf("/"))
      : ".";
    if (!folders.has(folder)) folders.set(folder, []);
    folders.get(folder)!.push(c);
  }
  const sortedFolders = Array.from(folders.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <div className="font-[family-name:var(--font-mono)] text-sm">
      {sortedFolders.map(([folder, files]) => (
        <div key={folder}>
          <div className="flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">
            <span className="text-[var(--color-vp-purple)]">▾</span>
            <span>{folder}/</span>
            <span className="ml-auto">{files.length}</span>
          </div>
          <ul>
            {files.map((c) => {
              const isSelected = c.path === selectedPath;
              return (
                <li key={c.path}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.path)}
                    className={`group flex w-full items-center gap-2 border-l-2 px-3 py-2 text-left transition ${
                      isSelected
                        ? "border-[var(--color-vp-pink)] bg-[rgba(255,113,206,0.08)] text-[var(--color-text)]"
                        : "border-transparent text-[var(--color-text-muted)] hover:border-[var(--color-vp-purple)] hover:bg-[rgba(185,103,255,0.05)] hover:text-[var(--color-text)]"
                    }`}
                  >
                    <span
                      className={`text-xs ${
                        isSelected
                          ? "text-[var(--color-vp-pink)]"
                          : "text-[var(--color-text-dim)]"
                      }`}
                    >
                      {c.basename.endsWith(".sol") ? "◆" : "○"}
                    </span>
                    <span className="flex-1 truncate text-[13px]">
                      {c.basename}
                    </span>
                    <ContractBadge type={c.type} />
                    {c.docsLink && <DocsLink href={c.docsLink} compact />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
