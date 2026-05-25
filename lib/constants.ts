/**
 * Static configuration for the EIPLab marketing site.
 * No env vars; this is the source of truth for site-wide content.
 */

export const SITE = {
  name: "EIPLab",
  tagline: "Prototype EIPs on EVVM in afternoons, not weeks",
  description:
    "AI-agent skill that turns scaffold-evvm into an EIP research bench. Produces Solidity + per-contract justification for any EIP you want to prototype.",
  url: "https://eiplab.evvm.org",
  github: "https://github.com/EVVM-org/EIPlabbyevvmfrontend",
  skillRepo: "https://github.com/EVVM-org/EIPskillevvmsandbox",
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
      "Frame transactions decompose validate-pay-execute across modes. This sub-experiment models the router foundation that future frame work builds on.",
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
