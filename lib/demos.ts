/**
 * Demo loader — reads content/demos/* at build time and pre-highlights
 * each .sol file via Shiki. The result is a fully-rendered demo object
 * that the page passes to the client-side DemoShell as props.
 *
 * No runtime fs access. Everything happens during SSG.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { highlightCode, languageFromFilename } from "./shiki";

export type ContractType =
  | "core-modification"
  | "new-service"
  | "new-system-contract"
  | "mock-contract";

export interface ContractEntry {
  /** Relative path under the demo folder, e.g. "contracts/Core.sol" */
  path: string;
  type: ContractType;
  why: string;
  docsLink: string | null;
}

export interface RequiresEntry {
  eip: string;
  satisfied_by: string;
  notes: string;
}

export interface MockEntry {
  name: string;
  stubs: string;
  strategy: string;
  reason: string;
  limitation: string;
}

export interface RawManifest {
  eip: { number: string; title: string; url: string; status: string };
  experiment: {
    slug: string;
    created: string;
    hypothesis: string;
    shape: string;
  };
  requires: RequiresEntry[];
  mocks: MockEntry[];
  contracts: ContractEntry[];
  justification: string;
}

/** Loaded contract: manifest entry + raw source + Shiki-highlighted HTML. */
export interface LoadedContract extends ContractEntry {
  basename: string;
  source: string;
  highlightedHtml: string;
  lineCount: number;
}

export interface LoadedDemo {
  slug: string;
  eip: RawManifest["eip"];
  experiment: RawManifest["experiment"];
  requires: RequiresEntry[];
  mocks: MockEntry[];
  contracts: LoadedContract[];
  justificationMarkdown: string;
}

const CONTENT_DIR = join(process.cwd(), "content", "demos");

export function getAllDemoSlugs(): string[] {
  try {
    return readdirSync(CONTENT_DIR).filter((name) => {
      try {
        return statSync(join(CONTENT_DIR, name)).isDirectory();
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

export async function getDemoBySlug(
  slug: string,
): Promise<LoadedDemo | null> {
  const dir = join(CONTENT_DIR, slug);
  try {
    if (!statSync(dir).isDirectory()) return null;
  } catch {
    return null;
  }

  const manifest = JSON.parse(
    readFileSync(join(dir, "manifest.json"), "utf-8"),
  ) as RawManifest;

  const justificationMarkdown = readFileSync(
    join(dir, "justification.md"),
    "utf-8",
  );

  const contracts: LoadedContract[] = await Promise.all(
    manifest.contracts.map(async (c) => {
      const source = readFileSync(join(dir, c.path), "utf-8");
      const lang = languageFromFilename(c.path);
      const highlightedHtml = await highlightCode(source, lang);
      const basename = c.path.split("/").pop() ?? c.path;
      return {
        ...c,
        basename,
        source,
        highlightedHtml,
        lineCount: source.split("\n").length,
      };
    }),
  );

  return {
    slug,
    eip: manifest.eip,
    experiment: manifest.experiment,
    requires: manifest.requires ?? [],
    mocks: manifest.mocks ?? [],
    contracts,
    justificationMarkdown,
  };
}
