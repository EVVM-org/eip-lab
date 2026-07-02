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
  /**
   * Which request field caps the output length. Classic OpenAI-compatible
   * (Venice) uses `max_tokens`; OpenAI's own reasoning models (gpt-5.x,
   * o-series) require `max_completion_tokens` and reject `max_tokens`.
   */
  tokenParam: "max_tokens" | "max_completion_tokens";
  /**
   * Whether to send a custom `temperature`. OpenAI reasoning models only
   * accept the default temperature and 400 on any custom value, so this
   * is false for OpenAI and true for Venice.
   */
  sendTemperature: boolean;
}

export const PROVIDERS: readonly ProviderConfig[] = [
  {
    id: "venice",
    label: "Venice AI",
    baseUrl: "https://api.venice.ai/api/v1",
    keyUrl: "https://venice.ai/settings/api",
    docsUrl: "https://docs.venice.ai/api-reference/api-spec",
    // Top-tier, large-context only (matches RECOMMENDED_MODELS.venice) so a
    // /models failure never offers a small-context model that can't hold the
    // full EVVM docs.
    fallbackModels: [
      "deepseek-v4-pro",
      "claude-opus-4-8",
      "claude-sonnet-4-6",
    ],
    enabled: true,
    tokenParam: "max_tokens",
    sendTemperature: true,
  },
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    keyUrl: "https://platform.openai.com/api-keys",
    docsUrl: "https://developers.openai.com/api/docs",
    fallbackModels: ["gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "gpt-5.1"],
    enabled: true,
    // OpenAI's GPT-5 family are reasoning models: completion budget is
    // max_completion_tokens, and custom temperature is rejected.
    tokenParam: "max_completion_tokens",
    sendTemperature: false,
  },
] as const;

export const DEFAULT_PROVIDER_ID = "venice";

export type ModelTier = "default" | "premium" | "value" | "balanced";

export interface RecommendedModel {
  /** Exact provider model slug. */
  id: string;
  tier: ModelTier;
  /** One-line rationale shown in the picker. */
  note: string;
  /**
   * Optional static metadata. Used when the provider's /models endpoint
   * does NOT return capability/pricing (OpenAI's /models is id-only), so
   * the cost meter and caps still work. When the API does return these
   * (Venice's model_spec), the live values take precedence.
   */
  contextTokens?: number;
  maxCompletionTokens?: number;
  optimizedForCode?: boolean;
  supportsReasoning?: boolean;
  /** USD per 1M input (prompt) tokens. */
  inputUsdPerMtok?: number;
  /** USD per 1M cached-input tokens (repeated prefix). ~10% of input on GPT-5. */
  cachedInputUsdPerMtok?: number;
  /** USD per 1M output (completion) tokens. */
  outputUsdPerMtok?: number;
}

/**
 * Curated shortlist of models that fit the EIP Lab job, per provider. The
 * picker only offers these (intersected with what the user's key can
 * access). Ordered best-first; the first available one is auto-selected.
 *
 * Selection criteria, in priority order:
 *   1. Large maxCompletionTokens — the contracts phase emits multiple
 *      full .sol files; small-output models truncate badly.
 *   2. Code quality.
 *   3. Big context (EIP + forum + repo + transcript).
 *   4. Cost (the user's spend; also the research data).
 *
 * OpenAI entries carry static pricing/caps because OpenAI's /models is
 * id-only (no pricing). Prices are USD per 1M tokens from the OpenAI
 * pricing page (standard tier).
 */
export const RECOMMENDED_MODELS: Record<string, readonly RecommendedModel[]> = {
  // Top-tier, large-context only. The deep-research flow injects the full
  // EVVM stack reference (evvm.info/llms-full.txt) plus the EIP, so models
  // need big context windows (>=400k) to hold it all. Small-context coders
  // (e.g. qwen3-coder at 256k) are intentionally NOT offered here.
  venice: [
    {
      id: "deepseek-v4-pro",
      tier: "default",
      note: "1M ctx · strong code · holds the full EVVM docs",
    },
    {
      id: "claude-opus-4-8",
      tier: "premium",
      note: "Best reasoning · 1M ctx — for the hardest EIPs",
    },
    {
      id: "claude-sonnet-4-6",
      tier: "balanced",
      note: "Strong quality/price balance · 1M ctx",
    },
  ],
  openai: [
    {
      id: "gpt-5.5",
      tier: "default",
      note: "Flagship · best coding+reasoning · 400k ctx",
      contextTokens: 400000,
      maxCompletionTokens: 128000,
      optimizedForCode: true,
      supportsReasoning: true,
      inputUsdPerMtok: 5,
      cachedInputUsdPerMtok: 0.5,
      outputUsdPerMtok: 30,
    },
    {
      id: "gpt-5.5-pro",
      tier: "premium",
      note: "Deepest reasoning · for the hardest EIPs · pricey",
      contextTokens: 400000,
      maxCompletionTokens: 128000,
      optimizedForCode: true,
      supportsReasoning: true,
      inputUsdPerMtok: 30,
      // pro tier: OpenAI lists no separate cached rate; bill cache at full input.
      outputUsdPerMtok: 180,
    },
    {
      id: "gpt-5.4",
      tier: "balanced",
      note: "Strong quality/price balance · 400k ctx",
      contextTokens: 400000,
      maxCompletionTokens: 128000,
      optimizedForCode: true,
      supportsReasoning: true,
      inputUsdPerMtok: 2.5,
      cachedInputUsdPerMtok: 0.25,
      outputUsdPerMtok: 15,
    },
  ],
};

/** Curated models for a provider (empty if the provider has none). */
export function recommendedFor(
  providerId: string,
): readonly RecommendedModel[] {
  return RECOMMENDED_MODELS[providerId] ?? [];
}

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
