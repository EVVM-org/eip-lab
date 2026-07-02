# EVVM EIP Lab — Research Data

Run logs for the research article on **AI models prototyping EIPs on EVVM**:
cost, behavior, and output quality across providers/models.

Each run captures a full EIP Lab session (4 phases: upload → read &
agree → map the surface → download .sol) against a single EIP, with one
provider/model, recording token usage, estimated USD cost, the chosen
implementation shape, the files produced, and whether the generation
completed cleanly. The full transcript (all phases + generated Solidity
+ justification) is stored verbatim so the article can quote primary
sources.

## Methodology notes (constant across runs)

- **Product**: EVVM EIP Lab (BYO-key; the user's provider key is proxied
  per-request and discarded — only token counts are logged).
- **Grounding**: the EIP is auto-fetched from its canonical source and
  injected into context; the model is instructed to answer ONLY from the
  provided material (no answering from training memory).
- **Streaming**: responses stream; an idle watchdog (45s no-token)
  guards against stalls; partial output is preserved on a drop.
- **Prompt regime** (at time of these runs): hardened compile rules,
  "prefer Shape B", "self-contained mocks over external imports",
  optional self-critique "review & fix" pass.
- **Cost**: estimated as `tokens × the model's per-Mtok pricing`
  (provider-reported pricing from /models). Streaming sometimes omits a
  usage chunk, in which case completion tokens are estimated from output
  length (~4 chars/token) and flagged.

## Runs index

| Date | EIP | Provider | Model | Env | Prompt tok | Compl tok | Total tok | Est. USD | Files | Completed | Compiles | Shape |
|------|-----|----------|-------|-----|-----------:|----------:|----------:|---------:|------:|-----------|----------|-------|
| 2026-06-03 | 8182 | Venice | qwen3-coder-480b-a35b-instruct-turbo | local | 161,406 | 11,388 | 172,794 | $0.0736 | 5 | yes | no¹ | B |
| 2026-06-03 | 8182 | Venice | qwen3-coder-480b-a35b-instruct-turbo | vercel | 160,608 | 9,233 | 169,841 | $0.0701 | 6 | yes | no¹ | B |
| 2026-06-03 | 8182 | Venice | deepseek-v4-pro | vercel | 237,178 | 11,962 | 249,140 | $0.4557 | 7 | yes² | no³ | B |
| 2026-06-03 | 8182 | OpenAI | gpt-5.5 | vercel | 167,548 | 24,753 | 192,301 | $1.5803 | 8 | yes⁴ | no⁵ | B |
| 2026-06-06 | 8182 | OpenAI gpt-5.5 (deep-research, GPT-answerer) | — | vercel | 1,277,192 | 16,569 | 1,293,761 | $6.88 | 6 | yes⁶ | verified-integration⁷ | B |
| 2026-06-06 | 8250 | OpenAI gpt-5.5 (deep-research, GPT-answerer) | — | vercel | ~1,140,000 | ~15,000 | ~1,155,000 | ~$6.15 | 3 | yes⁸ | verified-refs⁹ | A |
| 2026-06-06 | 8141 | OpenAI gpt-5.5 (deep-research, GPT-answerer) | — | vercel | ~926,000 | ~15,000 | ~941,000 | ~$5.09 | 6 | yes¹⁰ | verified-integration¹¹ | B |
| 2026-06-06 | 8182 | OpenAI gpt-5.5 (deep-research RE-RUN, post-patch) | — | vercel | 960,562 | 17,513 | 978,075 | $5.33 | 7 | yes¹² | verified-integration¹³ | B |

¹ qwen3-coder: residual issues — storage-array slice `history[1:]`,
`abi.encodePacked(mapping)`, library-constant visibility. Close to
compilable; a few mechanical fixes.
² deepseek reached a complete justification.md but used two "continue"
turns; the contracts phase truncated twice.
³ deepseek: blocked by an interface declared inside the contract, two
spurious `override`s, and content dropped at the truncate→continue
boundaries (welds). Best fidelity + cleanest mocks of any run; see the
run file.
⁴ gpt-5.5: single-shot, no "continue" turns; OpenAI returns a usage chunk
so tokens/cost are exact, not estimated.
⁵ gpt-5.5: closest to compilable of any run — blocked only by a single
dropped `{` in one mock's constructor. Correct frontier Merkle, no
fabrication, no welds dropping functions. See the run file.
⁶ deep-research flow: first run of the redesigned pipeline (upload →
≤5 Q&A grounded in the full EVVM docs → .sol); converged in 3 exchanges.
⁷ "verified-integration": not compiled here, but the EVVM integration is
verified CORRECT against the real testnet-contracts — `requestPay`,
`makeCaPay`, and `validateAndConsumeNonce` signatures all match. Prior
blocking-defect classes (fabrication, whole-Core rewrite, continue welds)
are absent. Cosmetic/admin cleanups remain. See the run file.
⁸ 8250 deep-research: first SHAPE A run — modifies Core.sol as a
marker-delimited diff (no whole-file rewrite). Converged in 3 exchanges.
⁹ "verified-refs": the Core diff's references to real Core internals are
verified correct — `nextSyncNonce[user]`, `canExecuteUserTransaction(...)`,
and the external `getEvvmID()` (model used `this.getEvvmID()` and flagged
the gotcha) all match testnet-contracts Core.sol. Main gap: it reinvents
EVVM's signature-recovery/error plumbing instead of reusing it. See the
run file.
¹⁰ 8141 deep-research: Shape B frame-transaction router; converged in 3
exchanges; cleanest Shape-B design (correct SENDER/logicalSender handling,
atomic-batch rollback via guarded self-call).
¹¹ "verified-integration": `requestPay`, `makeCaPay`, and
`validateAndConsumeNonce` usages all verified against real
testnet-contracts. Notably REUSED Core's plumbing (delegated sig to
`validateAndConsumeNonce`) rather than reinventing it — so no fidelity gap.
Blocked only by one trivial one-line weld. See the run file.
¹² 8182 re-run: post-patch regression check; single-shot (2 exchanges),
strict improvement over the first 8182 run on every axis.
¹³ "verified-integration": integration verified against real
testnet-contracts; single-shot with NO welds in code; immutable verifier,
shared clean Merkle update, real backing invariant. Cheaper ($5.33 vs
$6.88) than the first 8182 run because no continuations. See the run file.

> Two earlier deepseek-v4-pro attempts on this EIP are NOT logged as data
> rows: both failed in ways since fixed in the product, not in the model.
> Run A spiralled into "// Wait, I'm confusing myself…" comments and
> truncated. Run B fabricated the Poseidon2 round constants + empty-node
> ladder (invented hex labelled "canonical") and emitted malformed hex.
> The prompt fixes (`a600e96` no-narration, `c2703ef` anti-fabrication)
> closed both; the logged row above is the first clean-behaviour run.

> Add a row per new run. Keep one transcript file per run under `runs/`.

## Cross-run observations (living notes)

- **local vs vercel, same model:** near-identical token counts (~170k
  total) and cost (~$0.07). Both completed without truncation after the
  idle-watchdog + streaming-resilience fixes. Environment did not
  materially change cost or quality for this model.
- **Decomposition variance:** the two runs split files slightly
  differently — local produced 5 files (auth verifier as interface only,
  pulled the ECDSA mock into the interface file's role), vercel produced
  6 (a separate `MockECDSAVerifier.sol`). Same architecture, different
  file granularity. File count is therefore a weak quality signal; shape
  + completeness + per-contract documentation are stronger.
- **Shape selection:** both correctly chose Shape B (new service, Core
  untouched) — matching the hand-crafted demo. The "prefer Shape B" nudge
  is holding.
- **Self-contained mocks:** both emitted MockPoseidon + MockGroth16 +
  an auth-verifier interface as real in-package files (no dead external
  imports) — the self-contained-mocks nudge is holding.
- **Residual compile issues (not blocking per current product goal,
  which is documented readable .sol, not compilation):** storage-array
  slice `history[1:]` (invalid in Solidity), `abi.encodePacked(mapping)`
  for root calc (invalid), and library-constant visibility quirks. A
  real `solc` feedback loop would catch these; out of scope unless the
  bar moves to "must compile".

- **Reasoning models reach for authentic-looking complexity; the
  artifact gets more elaborate AND more confidently wrong.** Across three
  deepseek-v4-pro runs the failures escalated in exactly that direction:
  (1) spiral-debugging the incremental-Merkle bit math in code comments,
  (2) interleaving `<think>` asides mid-code (welds when stripped),
  (3) fabricating Poseidon round constants + empty-node ladders as
  "canonical" data. qwen3-coder (non-reasoning) did none of this — it
  wrote the boring keccak mock the first time. Reasoning capability
  correlated with more elaborate, more dangerous output on
  under-specified cryptographic detail. Each was closed by a prompt rule;
  the model then probed the next failure mode.

- **Prompt-fix timeline (for reproducibility):** `a600e96` banned
  thinking-out-loud in code + added budget discipline; `c2703ef` forbade
  fabricated cryptographic constants and made the keccak mock the
  parameter-free default. Runs before each fix are described in the
  deepseek run file but not logged as data rows (product bugs, not model
  behaviour).

- **Cost scales with reasoning + continuations, not just model price.**
  deepseek's logged run cost ~6.5× the qwen3-coder runs ($0.456 vs ~$0.07)
  for the same EIP: higher per-Mtok price, plus ~237k prompt tokens
  because two "continue" turns re-sent the growing history. The single
  biggest cost (and quality) lever for large EIPs is finishing in ONE
  turn — continuations re-bill the whole transcript and also cause the
  weld defects below.

- **The dominant remaining defect is the continuation mechanism, not the
  model.** When the contracts phase exceeds a model's max-completion
  budget, the user continues, the model resumes mid-file at an
  approximate point, and the client appends by raw string concat —
  welding fragments and dropping content (deepseek's missing `deposit()`
  body, `_computeNoteRoot()` signature, `getAuthPolicyEntry()`). Next fix
  is harness-side: make continuation file-aware (re-emit from the current
  `FILE:` marker, stitch whole files via dedupe-keep-longer) or push
  concision so large EIPs finish single-shot.

- **Single-shot completion is the strongest quality predictor so far.**
  gpt-5.5 (OpenAI) finished all 8 files in ONE turn (24.7k completion
  tokens) and produced the closest-to-compilable artifact in the dataset —
  one dropped `{` from clean. The deepseek run needed two "continue" turns
  and the welds at those boundaries gutted whole functions. The model that
  didn't have to continue won on correctness. This is the same lesson the
  continuation-mechanism note draws, from the opposite direction: the fix
  that matters most is making large EIPs finish in one turn (bigger
  single-shot budget / concision) or making continuation file-aware.
- **Quality scaled with price on this EIP.** Approx cost-vs-distance-to-
  compile: qwen3-coder ~$0.07 (a few Solidity-isms) < deepseek $0.46
  (several edits + lost code) < gpt-5.5 $1.58 (one character). Not a law —
  one EIP, three models — but a clean monotonic trend worth reporting.
- **The weld class has shrunk from "whole functions" to "one character."**
  Across models the mid-stream/`<think>`-adjacent splice that drops content
  went from deepseek losing entire function bodies to gpt-5.5 dropping a
  single `{`. A trivial post-generation brace/lint pass — or the file-aware
  continuation fix — would likely tip the best runs into compiling.
- **OpenAI gives exact usage; Venice is estimated.** OpenAI's stream
  returns a usage chunk, so OpenAI rows are measured. Venice streaming
  omits usage, so those completion counts are estimated (~4 chars/token).
  Treat the OpenAI row as the calibration point when comparing costs.

- **Grounding in the full EVVM docs is the biggest single quality jump.**
  The 2026-06-06 deep-research run (EVVM `llms-full.txt` injected) produced
  code that uses the REAL inherited `EvvmService` wrappers — `requestPay`,
  `makeCaPay` — with signatures verified correct against the actual
  testnet-contracts, plus `validateAndConsumeNonce`. Pre-grounding runs
  invented host-chain ERC-20 custody or guessed signatures. Correct
  EVVM-native integration is now the default, not luck. The flow also
  self-surfaced a real security fix (two-signature `depositSigned` to bind
  the note params against fisher mutation) — meta-transaction threat
  modeling, not boilerplate.
- **The ≤5-question research phase converges fast.** Both the 8182 and 8250
  runs settled a defensible happy path in 3 exchanges. The cap is not a
  practical constraint for a well-scoped EIP.
- **The "reinvents EVVM plumbing" gap is SHAPE-DEPENDENT.** 8141 (Shape B)
  reused Core's existing `validateAndConsumeNonce`, so it never wrote its
  own recovery and got integration right. 8250 (Shape A) added a NEW Core
  entrypoint, had to implement recovery, and did it the non-EVVM way
  (`keccak256(abi.encode)` + raw `ecrecover`) instead of EVVM's
  string-based `SignatureRecover.recoverSigner` /
  `SignatureUtil.verifySignature`. Fix applied: inject an EVVM helper
  cheatsheet (real signature-lib + CoreExecution wrapper signatures) so new
  entrypoints reuse EVVM's plumbing.
- **Shape A works and is correctly scoped (8250).** Given a nonce-invariant
  EIP, the grounded flow chose "modify Core" and emitted a marker-delimited
  additive diff whose references to real Core state/functions are verified
  correct — closing the previously-untested core-modification path with no
  recreate-Core failure. The "let the research decide A/B/C" change is
  validated: 8182→B, 8250→A, both correct.
- **Grounding roughly QUADRUPLED cost — and prompt caching is the fix.**
  Grounded gpt-5.5 runs cost ~$6–7 (≈1.2–1.3M tokens) vs $1.58 ungrounded,
  because the ~290k-token EVVM reference is re-sent every call. Since it's
  identical bytes each call, a stable cacheable prefix + provider prompt
  caching (OpenAI bills cached input at ~10%) would remove most of that
  repeated cost. Top efficiency lever.
- **GPT-as-answerer is a usable harness** to exercise the flow without a
  human — good for generating runs, with the caveat that answerer and Lab
  can share model-family blind spots.

- **"Compiles" is now tracked** as a column. Current product goal is
  documented-readable .sol, but compile-readiness is the strongest single
  quality axis across models, so we record yes/no + the blocking reason.
  No run compiles yet; all are "close" in different ways (qwen3-coder:
  a few mechanical Solidity-ism fixes; deepseek: in-contract interface +
  spurious `override` + continue welds).

## File naming

`runs/<YYYY-MM-DD>-eip<NNNN>-<model-slug>-<env>.md`
