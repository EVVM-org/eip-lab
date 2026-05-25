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

## Local development

```bash
npm install        # respects the 3-day min-release-age policy
npm run dev        # http://localhost:3000
npm run build      # production build
npm run start      # serve the build
npm run type-check # strict tsc
```

## Deploy to Vercel

Three steps, no config:

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo
3. Click **Deploy**

Next.js is auto-detected. No environment variables required. The site
is fully static and CDN-served from Vercel's edge.

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
