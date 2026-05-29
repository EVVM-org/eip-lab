/**
 * Static configuration for the EVVM EIP Lab site.
 * No secrets here. This is the source of truth for site-wide content.
 */

export const SITE = {
  name: "EVVM EIP Lab",
  shortName: "EIP Lab",
  tagline: "The lab for testing new EIPs on EVVM",
  description:
    "EVVM EIP Lab turns any EIP into documented Solidity for the EVVM stack. Bring an EIP and your own AI provider key; the Lab reads it, agrees with you on what it is, maps it onto the EVVM core, and hands back commented contracts. EVVM is where protocol-level experiments get tested.",
  url: "https://eiplab.evvm.org",
  github: "https://github.com/0xOucan/eiplabv1",
  evvmOrg: "https://github.com/EVVM-org",
  scaffoldEvvm: "https://github.com/EVVM-org/scaffold-evvm",
} as const;

export const DOCS = {
  scaffoldEvvm:
    "https://www.evvm.info/docs/LibrariesAndTools/ScaffoldEvvm/Overview",
  howToMakeService: "https://www.evvm.info/docs/HowToMakeAEVVMService",
  core: "https://www.evvm.info/docs/category/coresol",
  nameService: "https://www.evvm.info/docs/category/nameservicesol",
  staking: "https://www.evvm.info/docs/category/staking-contracts",
  treasury: "https://www.evvm.info/docs/category/treasury",
  license: "https://www.evvm.info/docs/EVVMNoncommercialLicense",
  eipIndex: "https://eips.ethereum.org/all",
  evvmInfo: "https://www.evvm.info",
} as const;

/**
 * AI providers the Lab can use. Users bring their own API key per
 * provider. Venice is first because it's OpenAI-compatible and the
 * launch partner. The key never leaves the request path: browser →
 * our route → provider → discarded.
 */
export interface ProviderConfig {
  id: string;
  label: string;
  /** Provider base URL (server-side proxy target). */
  baseUrl: string;
  /** Where users get an API key. */
  keyUrl: string;
  /** Docs for the provider's API. */
  docsUrl: string;
  /** Fallback model list if the live /models call fails. */
  fallbackModels: string[];
  /** Whether this provider is wired up yet. */
  enabled: boolean;
}

export const PROVIDERS: readonly ProviderConfig[] = [
  {
    id: "venice",
    label: "Venice AI",
    baseUrl: "https://api.venice.ai/api/v1",
    keyUrl: "https://venice.ai/settings/api",
    docsUrl: "https://docs.venice.ai/api-reference/api-spec",
    fallbackModels: [
      "qwen3-coder-480b-a35b-instruct-turbo",
      "openai-gpt-53-codex",
      "deepseek-v4-pro",
      "claude-sonnet-4-6",
    ],
    enabled: true,
  },
] as const;

export const DEFAULT_PROVIDER_ID = "venice";

export type ModelTier = "default" | "premium" | "value" | "balanced";

export interface RecommendedModel {
  /** Exact Venice model slug. */
  id: string;
  tier: ModelTier;
  /** One-line rationale shown in the picker. */
  note: string;
}

/**
 * Curated shortlist of Venice models that fit the EIP Lab job. The
 * picker only offers these (intersected with what the user's key can
 * access). Ordered best-first; the first available one is auto-selected.
 *
 * Selection criteria, in priority order:
 *   1. Large maxCompletionTokens — the contracts phase emits multiple
 *      full .sol files; small-output models truncate badly.
 *   2. Code quality.
 *   3. Big context (EIP + forum + repo + transcript).
 *   4. Cost (the user's spend; also the research data).
 */
export const RECOMMENDED_MODELS: readonly RecommendedModel[] = [
  {
    id: "qwen3-coder-480b-a35b-instruct-turbo",
    tier: "default",
    note: "Coder · 65k output · 256k ctx · cheap — best all-round",
  },
  {
    id: "openai-gpt-53-codex",
    tier: "premium",
    note: "Codex · 128k output · 400k ctx — top code quality",
  },
  {
    id: "claude-opus-4-8",
    tier: "premium",
    note: "Best reasoning · 1M ctx — for the hardest EIPs",
  },
  {
    id: "claude-sonnet-4-6",
    tier: "balanced",
    note: "Strong quality/price balance · 64k output",
  },
  {
    id: "deepseek-v4-pro",
    tier: "value",
    note: "1M ctx · strong code · low cost",
  },
  {
    id: "deepseek-v4-flash",
    tier: "value",
    note: "Cheapest viable full run · 1M ctx",
  },
  {
    id: "zai-org-glm-5",
    tier: "balanced",
    note: "Solid mid-tier coder · 198k ctx",
  },
  {
    id: "qwen3-5-397b-a17b",
    tier: "balanced",
    note: "Large MoE · 32k output",
  },
] as const;

export type DemoAccent = "neon-pink" | "neon-cyan" | "neon-purple";
export type DemoShape = "A" | "B" | "C";

export interface DemoMeta {
  slug: string;
  eipNumber: number;
  title: string;
  shortTitle: string;
  shape: DemoShape;
  shapeLabel: string;
  contractCount: number;
  summary: string;
  accent: DemoAccent;
}

export const DEMOS: readonly DemoMeta[] = [
  {
    slug: "eip-8250-keyed-nonces",
    eipNumber: 8250,
    title: "Keyed Nonces for Frame Transactions",
    shortTitle: "Keyed Nonces",
    shape: "A",
    shapeLabel: "Modify Core",
    contractCount: 2,
    summary:
      "Replace single sender nonce with a (nonce_key, nonce_seq) pair. Transactions on different non-zero keys become replay-independent.",
    accent: "neon-pink",
  },
  {
    slug: "eip-8141-frame-router",
    eipNumber: 8141,
    title: "Frame Transaction — router foundation",
    shortTitle: "Frame Router",
    shape: "B",
    shapeLabel: "New Service",
    contractCount: 3,
    summary:
      "Frame transactions decompose validate-pay-execute across modes. This experiment models the router foundation that future frame work builds on.",
    accent: "neon-cyan",
  },
  {
    slug: "eip-8182-private-eth-erc20",
    eipNumber: 8182,
    title: "Private ETH and ERC-20 Transfers",
    shortTitle: "Shielded Pool",
    shape: "B",
    shapeLabel: "New Service",
    contractCount: 6,
    summary:
      "Shielded-pool system contract with split-proof architecture (Groth16 BN254 + permissionless auth) and pluggable verifiers.",
    accent: "neon-purple",
  },
] as const;
