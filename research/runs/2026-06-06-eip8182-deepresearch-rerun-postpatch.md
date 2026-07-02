# Run — EIP-8182 · deep-research RE-RUN (post-patch) · GPT-answerer

| Field | Value |
|-------|-------|
| Date | 2026-06-06 |
| EIP | 8182 — Private ETH and ERC-20 Transfers |
| Flow | Deep-research (post cheatsheet patch `d540099`) |
| Provider / model | OpenAI · gpt-5.5 ($5/$30 per Mtok) |
| Answerer | GPT (ChatGPT) |
| Prompt tokens | 960,562 |
| Completion tokens | 17,513 |
| Total tokens | 978,075 |
| Est. cost (USD) | $5.33 |
| Exchanges used | 2 of 5 (converged fast) |
| Implementation shape | B (new service extending EvvmService) |
| Files generated | 7 |
| Compiles | not run here — EVVM integration verified correct; no welds in the code; cleanest 8182 yet |

**Files:** `IAuthVerifier8182.sol`, `IPoolVerifier8182.sol`,
`MockPoseidon2Lib.sol`, `MockPoolVerifier8182.sol`,
`MockAuthVerifier8182.sol`, `ShieldedPool8182Service.sol`, `justification.md`

> Purpose: regression check of the pipeline after the cheatsheet patch,
> and a controlled comparison against the FIRST 8182 deep-research run.

---

## Head-to-head vs the first 8182 deep-research run ($6.88, 6 files)

| Aspect | First run (2026-06-06, $6.88) | This re-run ($5.33) |
|---|---|---|
| Completion | needed 2 "continue" turns → **welds dropped whole functions** (deposit body, _computeNoteRoot sig, getAuthPolicyEntry) | **single-shot, no welds** |
| Merkle tree | O(n) full-rebuild `_computeNoteRoot` on every call | **shared generic sparse `_updateTree`** for both note + auth trees (O(depth)) |
| Verifier admin | **unusable `updatePoolVerifier` (msg.sender==address(this))** | `poolVerifier` is **immutable** — no dead admin fn |
| Backing accounting | vague `accountedPoolBalance` | `shieldedLiability` + `_increaseLiability` with a real `core.getBalance` backing check |
| Cost | $6.88 / 1.29M tok (2 continues re-billed history) | **$5.33 / 978k tok** (single shot) |
| Files | 6 | 7 (adds a pool-verifier interface split) |

Every defect the first run had is gone. **Single-shot completion was both cheaper AND higher quality** — the clearest evidence yet that finishing in one turn is the dominant quality/cost lever.

---

## Judge verdict: best 8182 in the dataset

### Strengths
- **Verified EVVM integration**: `requestPay(user, token, amount, priorityFeePay, originExecutor, noncePay, isAsyncExecPay, signaturePay)`, `makeCaPay(recipient, token, amount)`, `core.validateAndConsumeNonce(...)`, `core.getBalance(address(this), token)` — all match real testnet-contracts. Delegates signature verification to Core (no hand-rolled ecrecover).
- **Two-signature `depositSigned`** binds `token/amount/ownerCommitment/outputNoteDataHash` via an action sig, then funds via `requestPay` — the fisher-mutation fix, retained and clean.
- **Clean shared Merkle update** (`_updateTree` over a node mapping + derived empty ladders) reused for the append-only note tree and the sparse auth-policy tree. No fabricated ladders (derived in constructor).
- **Backing invariant**: deposits check `core.getBalance(this) >= shieldedLiability + amount`; withdrawals decrement liability (checked-math underflow guards insufficiency).
- Full state surface + read helpers + compute helpers; honest mocks with `@custom:limitations`; `immutable` verifier; reentrancy guard; range/field/expiry checks; auth via staticcall with returndata-shape check.

### Minor caveats (non-blocking)
1. A comment typo (`@custom:eip EIP-81s 8.1`) in the auth interface. Cosmetic.
2. One **weld in the MAP discussion text** (`outpuddress originExecutor`) — but it is in the research narrative only; the **final generated `depositFromPrefundedBalance` signature is clean**. So no code impact this time.
3. `IAuthVerifier8182.verifyAuth` is declared `view` here; EIP-8182's is non-view called via staticcall. Fine for a mock; a real verifier would match the EIP exactly.
4. Withdrawal decrements `shieldedLiability[token]` before `makeCaPay`; relies on checked-math to revert on under-backing (works, but an explicit check would read clearer).

### One-line judgment
The re-run is the strongest EIP-8182 artifact produced: single-shot, verified-correct EVVM integration, clean shared Merkle + real backing invariant, immutable verifier, no welds — a strict improvement over the first run on every axis, at lower cost.

---

## What this run does and doesn't prove about the patch

- **Regression: PASS.** The cheatsheet patch did not break the Shape-B path; 8182 still produces clean, EVVM-native output (and its best yet).
- **Patch-effect: N/A here.** 8182 (Shape B) delegates recovery to Core, so it never exercised the string-based-recovery cheatsheet. The patch's *effect* is still pending the **8250 re-run** (the Shape-A case that hand-rolled `ecrecover`).
- **Cost note:** single-shot 8182 cost $5.33 vs the first run's $6.88 — continuations, not the model, drove the earlier premium. Reinforces prompt-caching + single-shot as the cost levers.
