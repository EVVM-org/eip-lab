# AGENTS.md

Guidance for any AI agent (Claude Code, Cursor, GitHub Copilot, Aider,
or any other SKILL.md-aware agent) working inside this repo.

## What this repo is

**EVVM EIP Lab** — a hosted product. The site is the app: a user
brings an EIP and their own AI provider key (Venice AI to start),
and the Lab returns documented Solidity for the EVVM stack across a
four-phase flow (upload → read & agree → map the surface → download).

Do NOT call this a "skill" in user-facing copy. The product name is
**EVVM EIP Lab**. Emphasize EVVM as the place to test EIPs and
protocol-level experiments.

The site has both a marketing landing AND a functional app at `/lab`
backed by API routes under `app/api/`.

## Stack and constraints

- **Next.js 15 App Router + React 19 + TypeScript strict.**
- **Tailwind v4** (uses `@import "tailwindcss"` in CSS + `@theme`
  directive; no `tailwind.config.ts` for basic theming).
- **Backend is limited to provider proxying.** API routes under
  `app/api/` proxy the user's AI key to the provider and discard it.
  The user's API key is NEVER stored or logged — only token counts
  are logged (for cost research). Don't add a database, user accounts,
  or any server-side key persistence.
- **Static demo content under `content/demos/`.** Each EIP has its own
  folder with `manifest.json`, `justification.md`, and `contracts/*.sol`.
  The frontend reads these at build time.
- **3-day min-release-age** enforced via `.npmrc`. Don't add packages
  published in the last 72 hours.
- **EVVM Noncommercial License.** Same as the rest of the EVVM org.

## Aesthetic rules

The vaporwave terminal vibe is load-bearing. When editing:

- **Chrome stays vaporwave** (nav, footer, panel borders, hover
  states, transitions, scanlines).
- **Code viewer stays readable** (dark IDE theme like Dracula or
  One Dark Pro — not pink). Solidity should be syntax-highlighted in
  a normal IDE palette; the panel chrome around it can be neon.
- **Respect `prefers-reduced-motion`** — disable scanlines, color
  cycling, and typewriter effects when set.
- **Palette** is defined in `styles/globals.css` under `@theme`.
  Update there, not inline.

## Editing rules

- **Don't break the static-only contract.** No `"use server"`, no
  dynamic server components that fetch external APIs, no env-var
  branches in build logic.
- **Demo content is the source of truth.** When you want to show a
  new contract, add it to `content/demos/<eip>/contracts/` and
  register it in that demo's `manifest.json`. Don't hardcode contract
  contents in components.
- **Manifest schema is contracts-as-objects** (path, type, why,
  docsLink). See an existing `manifest.json` for the shape.
- **Keep `'use client'` minimal.** Most components are server
  components. Only `FileTree`, `CodeViewer` (because of file
  selection state), and the demo shell need to be client components.

## Commit convention

Follow [joelparkerhenderson/git-commit-message](https://github.com/joelparkerhenderson/git-commit-message)
— no bump section, imperative subject, "why" in the body.

## Don't

- Don't fetch from external APIs at runtime. (Shiki runs at build time.)
- Don't add a CMS or database — `content/demos/` is the CMS.
- Don't add user accounts, comments, or any interactivity that
  requires persistence.
- Don't ship the Vercel preview as production until the demo content
  has been reviewed by a human EIP researcher.
