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

| Date | EIP | Provider | Model | Env | Prompt tok | Compl tok | Total tok | Est. USD | Files | Completed | Shape |
|------|-----|----------|-------|-----|-----------:|----------:|----------:|---------:|------:|-----------|-------|
| 2026-06-03 | 8182 | Venice | qwen3-coder-480b-a35b-instruct-turbo | local | 161,406 | 11,388 | 172,794 | $0.0736 | 5 | yes | B |
| 2026-06-03 | 8182 | Venice | qwen3-coder-480b-a35b-instruct-turbo | vercel | 160,608 | 9,233 | 169,841 | $0.0701 | 6 | yes | B |

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

## File naming

`runs/<YYYY-MM-DD>-eip<NNNN>-<model-slug>-<env>.md`
