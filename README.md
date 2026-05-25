# EIPLab — Frontend

Marketing site for **EIPLab**, the AI-agent skill that turns
[scaffold-evvm](https://github.com/EVVM-org/scaffold-evvm) into an EIP
research bench.

Static demo viewer showing what the skill produces for three example
EIPs: 8250 (Keyed Nonces), 8141 (Frame Router), 8182 (Private ETH and
ERC-20 Transfers).

## Stack

- Next.js 15 (App Router) + React 19
- TypeScript strict
- Tailwind CSS v4
- Shiki for Solidity syntax highlighting
- react-markdown + remark-gfm for justification rendering
- Geist Mono + VT323 for the vaporwave terminal aesthetic
- Static demo content from `content/demos/`
- Zero backend, zero database, zero auth

## Project-scoped design skill

This repo's UI was iterated with the
[ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
installed locally. To replicate the setup:

```bash
mkdir -p .claude/skills
cd .claude/skills
git clone https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git
ln -s ui-ux-pro-max-skill/.claude/skills/ui-ux-pro-max ui-ux-pro-max
```

The skill clone and symlink are both git-ignored so the repo stays
small; this README is the install record.

## Local development

**Package manager: pnpm** (pinned via `packageManager` field; corepack
auto-prepares the version). Both `pnpm` and `npm` honor the 3-day
`min-release-age` / `minimum-release-age` policy in `.npmrc`.

```bash
# First time on a new machine
corepack enable          # one-time; lets corepack manage pnpm
# Subsequent
pnpm install             # respects the 3-day min-release-age policy
pnpm dev                 # http://localhost:3000
pnpm build               # production build
pnpm start               # serve the build
pnpm type-check          # strict tsc
```

If pnpm refuses to install a package because it's too fresh
(supply-chain protection working as intended), either wait until the
package ages past 3 days, or pin to a slightly older version in
`package.json`.

## Deploy to Vercel

Three steps, no config:

1. **Push this repo to GitHub** (or your preferred git host that
   Vercel can read).
2. **Import to Vercel**: go to [vercel.com/new](https://vercel.com/new),
   pick the repo. Next.js 15 is auto-detected; framework preset,
   build command (`next build`), and output directory are all
   pre-filled.
3. **Click Deploy**.

No environment variables required. No `vercel.json`. No serverless
functions — the entire site builds to static HTML + assets and is
served from Vercel's CDN edge.

**Local preview before deploy:**

```bash
npm install
npm run build
npm run start   # http://localhost:3000
npm run type-check  # strict TypeScript pass
```

**What ships when you build:**

- Landing page (statically rendered)
- 3 demo routes (one per EIP, pre-rendered via `generateStaticParams`)
- All Solidity files highlighted at build time via Shiki (no client-
  side highlighter weight)
- All justification markdown rendered server-side
- Custom OG image (`/og.svg`) for social cards

**Custom domain:** set in Vercel's project settings → Domains.
EIPLab assumes `eiplab.evvm.org` in `lib/constants.ts`; update the
`SITE.url` field if you deploy elsewhere.

## Project layout

```
EIPlabbyevvmfrontend/
├── app/                 ← App Router pages
│   ├── layout.tsx       ← root layout (chrome, scanlines)
│   ├── page.tsx         ← landing
│   └── demo/[eip]/      ← 3-pane file explorer per EIP
├── components/
│   ├── chrome/          ← Nav, Footer, Scanlines, CRT overlay
│   ├── landing/         ← Hero, Why, How, Compare, DemoPicker, FAQ
│   ├── demo/            ← FileTree, CodeViewer, JustificationPanel, …
│   └── ui/              ← Button, Panel, Terminal, Tag, GlowText
├── content/
│   └── demos/           ← Per-EIP folders with manifest.json + .sol + justification.md
├── lib/                 ← constants, theme tokens, shiki setup, markdown helpers
└── styles/              ← globals.css (Tailwind v4 + vaporwave variables)
```

## How the demo works

Each EIP under `content/demos/eip-N-slug/` ships with:

- `manifest.json` — machine-readable index: EIP metadata, hypothesis,
  shape (A/B/C), `requires[]`, `mocks[]`, and a typed `contracts[]`
  array (each entry has `path`, `type`, `why`, `docsLink`)
- `justification.md` — the per-contract writeup (the real deliverable)
- `contracts/*.sol` — the actual Solidity files

At build time, the demo route reads the manifest, populates the file
tree with contract-type badges, lazy-loads each `.sol` into the code
viewer via Shiki, and renders the justification panel from markdown.

## Related

- [EIPskillevvmsandbox](https://github.com/EVVM-org/EIPskillevvmsandbox) — the skill itself (the "backend")
- [scaffold-evvm](https://github.com/EVVM-org/scaffold-evvm) — the runtime the skill targets
- [scaffold-evvm docs](https://www.evvm.info/docs/LibrariesAndTools/ScaffoldEvvm/Overview) — recommended testing interface
- [How to make an EVVM service](https://www.evvm.info/docs/HowToMakeAEVVMService) — the new-service pattern documented

## License

[EVVM Noncommercial License v1.0](https://www.evvm.info/docs/EVVMNoncommercialLicense)
(SPDX `EVVM-NONCOMMERCIAL-1.0`). Commercial use requires a separate
license — contact `g@evvm.org`.
