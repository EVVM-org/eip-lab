# EVVM EIP Lab

> ⚠️ **Very experimental.** EVVM EIP Lab is early research software. Its
> output is *documented Solidity for research and prototyping* — not
> audited, not guaranteed to compile, and not production-ready. Expect
> rough edges and breaking changes.

**EVVM EIP Lab** turns any EIP into documented Solidity for the
[EVVM](https://github.com/EVVM-org) stack. Bring an EIP and your own AI
provider key; the Lab reads it, agrees with you on what it is, maps it
onto the EVVM core, and hands back commented contracts plus a per-contract
justification. EVVM is where protocol-level experiments get modeled at the
contract layer.

This repo is the whole product — a Next.js app with two surfaces:

1. **Landing + demo viewer** (static) — what the Lab is, how it works, a
   raw roadmap, and three hand-checked demo outputs (EIP-8250 Keyed
   Nonces, EIP-8141 Frame Router, EIP-8182 Private ETH/ERC-20 Transfers).
2. **The Lab** (`/lab`, interactive) — a bring-your-own-key app that runs
   the four-phase flow against your chosen provider/model.

Live: https://eiplabv1.vercel.app · Repo: `EVVM-org/eip-lab`

## The four phases

`upload → read & agree → map the surface → download .sol`

1. **Upload** — paste the EIP text and/or drop links (eips.ethereum.org,
   Ethereum Magicians, ethresear.ch, a raw GitHub file). Fetchable links
   are pulled automatically so the model reads the real spec.
2. **Read & Agree** — the Lab describes what the EIP is and asks you to
   confirm the intent before mapping. No word limit.
3. **Map the surface** — the technical conversation: implementation shape
   (modify the core / new service / external adapter), which dependencies
   to vendor / mock / simulate / defer, which EVVM contracts change.
4. **Download .sol** — documented Solidity (`FILE:`-delimited) plus a
   justification, packaged as a downloadable `.zip`.

## Bring-your-own-key (privacy)

The Lab never stores your provider key. Each request flows: **browser → our
serverless proxy → the provider → discarded.** The key is read from the
request, used once, and dropped — never written to storage, never logged.
Only token counts are logged (anonymously, for the AI + EIP cost research
under [`research/`](./research)).

**Supported providers** (configured in `lib/constants.ts`):

| Provider | Models offered | Notes |
|----------|----------------|-------|
| Venice AI | qwen3-coder-480b (default), deepseek-v4-pro, claude-*, … | OpenAI-compatible; pricing/caps come live from `/models` |
| OpenAI | gpt-5.5 (default), gpt-5.5-pro, gpt-5.4, gpt-5.1, gpt-5.4-mini | reasoning models; `max_completion_tokens`, no custom temperature; static price catalog |

## Stack

- Next.js 15 (App Router) + React 19, TypeScript strict
- Tailwind CSS v4 — minimalist dark (OLED slate) design system, Inter +
  a mono for code, a single green accent (design tokens in
  `app/globals.css`)
- Serverless API routes (`runtime = "nodejs"`, streaming) — the BYO-key proxy
- Shiki for build-time Solidity highlighting (demo viewer)
- react-markdown + remark-gfm for justification rendering
- Zero-dependency, store-only ZIP writer (`lib/zip.ts`) for the download
- Inter (UI) + Geist Mono (code) fonts
- No database, no auth, no stored secrets

## How the Lab works (backend)

The interactive Lab is driven by three serverless routes:

- **`app/api/lab/chat/route.ts`** — the streaming chat proxy. Prepends the
  phase-specific system prompt + the fetched EIP context, calls the
  provider with the right request shape (per-provider `tokenParam` /
  `sendTemperature`), and streams the result back as NDJSON. Resilience
  built in for long reasoning runs:
  - a **server heartbeat** keeps the connection alive during silent
    thinking windows (reasoning models can emit nothing for minutes);
  - a **stall ceiling** aborts a genuinely dead upstream;
  - **reasoning is separated** from the answer (`reasoning_content` /
    inline `<think>` tags) so it shows as live progress but never lands in
    the files;
  - `maxDuration = 300` for long generations.
- **`app/api/venice/models/route.ts`** — provider-aware model list proxy
  (uses `provider.baseUrl`).
- **`app/api/eip/fetch/route.ts`** — SSRF-guarded EIP fetcher (https-only,
  host allowlist: eips.ethereum.org / raw.githubusercontent.com /
  ethereum-magicians.org / ethresear.ch; size-capped).

The system prompts that steer the model live in **`lib/labPrompts.ts`**
(EVVM context + grounding rule + compile rules + per-phase prompts). The
Venice/OpenAI client is **`lib/venice.ts`**.

## How the demos work (static)

Each EIP under `content/demos/eip-N-slug/` ships with:

- `manifest.json` — EIP metadata, hypothesis, shape (A/B/C), `requires[]`,
  `mocks[]`, and a typed `contracts[]` array (`path`, `type`, `why`,
  `docsLink`)
- `justification.md` — the per-contract writeup
- `contracts/*.sol` — the Solidity files

At build time the demo route reads the manifest, builds the file tree with
contract-type badges, highlights each `.sol` with Shiki, and renders the
justification from markdown.

## Local development

**Package manager: pnpm** (pinned via `packageManager`; corepack
auto-prepares the version). Both `pnpm` and `npm` honor the 3-day
`min-release-age` / `minimum-release-age` supply-chain policy in `.npmrc`.

```bash
corepack enable          # one-time
pnpm install             # respects the 3-day min-release-age policy
pnpm dev                 # http://localhost:3000
pnpm build               # production build
pnpm start               # serve the build
pnpm type-check          # strict tsc
```

If pnpm refuses to install a package because it's too fresh (supply-chain
protection working as intended), wait until it ages past 3 days or pin to a
slightly older version.

> ⚠️ Don't run `pnpm build` while `pnpm dev` is live on the same checkout —
> it corrupts the `.next` webpack manifest. Stop dev first, or use a
> separate clone.

## Deploy to Vercel

1. **Import the repo** at [vercel.com/new](https://vercel.com/new). Next.js
   15 is auto-detected (framework preset, build command, output dir all
   pre-filled).
2. **Click Deploy.**

**No environment variables required** — the Lab is bring-your-own-key, so
there are no server secrets. There is no `vercel.json`.

**Plan note:** the Lab uses serverless functions with `maxDuration = 300`.
That cap is honored on **Vercel Pro** (up to 300s); on **Hobby** functions
are killed at 60s, which can truncate long contract generations. The
landing + demo pages are static and unaffected.

**Custom domain:** Vercel project → Settings → Domains. `lib/constants.ts`
sets `SITE.url`; update it if you deploy elsewhere.

## Project layout

```
EIPlabbyevvmfrontend/
├── app/
│   ├── layout.tsx           ← root layout (chrome, scanlines)
│   ├── page.tsx             ← landing (Hero, Why, How, Compare, Demos, Roadmap, FAQ)
│   ├── lab/page.tsx         ← the interactive Lab
│   ├── demo/[eip]/          ← per-EIP demo viewer (file tree + code + justification)
│   └── api/
│       ├── lab/chat/        ← streaming BYO-key chat proxy (NDJSON, heartbeat)
│       ├── venice/models/   ← provider-aware model list proxy
│       └── eip/fetch/       ← SSRF-guarded EIP fetcher
├── components/
│   ├── chrome/              ← Nav, Footer, Scanlines, CRT overlay
│   ├── landing/             ← Hero, Why, How, Compare, DemoPicker, Roadmap, FAQ
│   ├── demo/                ← FileTree, CodeViewer, JustificationPanel, …
│   ├── lab/LabApp.tsx       ← the Lab client (phases, streaming, cost meter, zip)
│   └── ui/                  ← WindowFrame, PixelButton, Tag, ExperimentalBanner, …
├── lib/
│   ├── constants.ts         ← SITE, PROVIDERS, recommended models, demos
│   ├── labPrompts.ts        ← system prompts (the model's instructions)
│   ├── venice.ts            ← OpenAI-compatible streaming client (Venice + OpenAI)
│   ├── labFiles.ts / zip.ts ← FILE: parsing + zero-dep ZIP
│   └── …                    ← link detection, shiki setup, markdown helpers
├── content/demos/           ← per-EIP manifest.json + .sol + justification.md
├── research/                ← AI + EIP cost-research run logs (per-model transcripts)
└── styles/                  ← globals.css (Tailwind v4 + vaporwave variables)
```

## Roadmap (raw — direction, not dates)

1. **Alpha — testable** *(now)*: the bring-your-own-key four-phase flow.
2. **Alpha — polished** *(next)*: same flow, steadier and cleaner.
3. **Scaffold-EVVM local** *(planned)*: generated contracts into
   scaffold-evvm local compilation + deployment.
4. **Testnet-ready** *(planned)*: scaffold-evvm compatible + EVVM testnet
   deployment.

## Research

[`research/`](./research) holds run logs for the study on AI models
prototyping EIPs on EVVM — token usage, cost, behavior, and output quality
across providers/models, with full per-run transcripts. See
[`research/README.md`](./research/README.md) for methodology and the
cross-run comparison table.

## UI/UX design tooling (build-time only)

> EVVM EIP Lab is a hosted product, **not** a skill. This note is only
> about a design helper used while building the UI.

This repo's UI was iterated with the
[ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
design helper installed locally during development:

```bash
mkdir -p .claude/skills && cd .claude/skills
git clone https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git
ln -s ui-ux-pro-max-skill/.claude/skills/ui-ux-pro-max ui-ux-pro-max
```

The clone and symlink are git-ignored; this README is the install record.
It plays no part in the running app.

## Related

- [scaffold-evvm](https://github.com/EVVM-org/scaffold-evvm) — the EVVM dev
  environment; the recommended interface for compiling/testing generated
  contracts locally
- [scaffold-evvm docs](https://www.evvm.info/docs/LibrariesAndTools/ScaffoldEvvm/Overview)
- [How to make an EVVM service](https://www.evvm.info/docs/HowToMakeAEVVMService)
- [evvm.info](https://www.evvm.info) — EVVM documentation

## License

[EVVM Noncommercial License v1.0](https://www.evvm.info/docs/EVVMNoncommercialLicense)
(SPDX `EVVM-NONCOMMERCIAL-1.0`). Commercial use requires a separate
license — contact `g@evvm.org`.
