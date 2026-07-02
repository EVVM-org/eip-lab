# Run — EIP-8141 · deep-research flow · GPT-as-answerer · SHAPE B (frame router)

| Field | Value |
|-------|-------|
| Date | 2026-06-06 |
| EIP | 8141 — Frame Transaction (validate/pay/execute decomposition) |
| Flow | Deep-research (upload → ≤5 Q&A grounded in full EVVM docs → .sol) |
| Provider / model | OpenAI · gpt-5.5 (400k ctx, $5/$30 per Mtok) |
| Answerer | GPT (ChatGPT), acting as the human |
| EVVM grounding | full `evvm.info/llms-full.txt` injected (~290k tokens) |
| Prompt tokens | ~926,000 (panel; final slightly higher) |
| Completion tokens | ~15,000 |
| Total tokens | ~941,000+ |
| Est. cost (USD) | ~$5.09+ |
| Exchanges used | 3 of 5 |
| Implementation shape | B (new service extending EvvmService) — router surface |
| Files generated | 6 |
| Compiles | not run here — EVVM integration verified correct; one likely minor line-weld (see defects) |

**Files:** `Frame8141Types.sol`, `IFrame8141Target.sol`,
`Frame8141HashUtils.sol`, `FrameTransaction8141Service.sol`,
`MockFrame8141Target.sol`, `justification.md`

> Third shape covered by intent: A (8250), B (8182 shielded pool), and now
> B on a very different surface — a frame-transaction *router* that
> decomposes validate → pay → execute. Good breadth for the study.

---

## Headline: reused EVVM plumbing correctly (delegated sig to Core)

Verified against real testnet-contracts:

| Generated call | Real signature | Verdict |
|---|---|---|
| `requestPay(payer, feeToken, feeAmount, 0, paymentAuth.originExecutor, paymentAuth.nonce, paymentAuth.isAsyncExec, paymentAuth.signature)` | `requestPay(from, token, amount, priorityFee, originExecutor, nonce, isAsyncExec, signature)` (CoreExecution, internal) | ✅ exact |
| `makeCaPay(msg.sender, feeToken, feeAmount)` | `makeCaPay(to, token, amount)` (CoreExecution, internal) | ✅ exact |
| `core.validateAndConsumeNonce(sender, senderExecutor, frameTxHash, originExecutor, nonce, isAsyncExec, signature)` | matches Core.sol entrypoint (bytes32 hashPayload) | ✅ |

Crucially, this run **delegated signature verification to Core's existing
`validateAndConsumeNonce`** — it computes a `bytes32` frame hash as the
`hashPayload` and lets Core do the (string-based EIP-191) recovery. It did
NOT hand-roll `ecrecover`. That is exactly right, and it's why this run
avoided the fidelity gap the 8250 run hit (see cross-run note below).

---

## Judge verdict: cleanest Shape-B design in the dataset

### Strengths
- **Correct shape, correctly scoped.** Frame lifecycle modeled as an
  additive service (no Core diff), reusing Core for auth + payment. Scope
  trimmed to three flows (self_verify, only_verify+paymaster, one atomic
  batch) — deliberately not rebuilding an EIP-2718 processor.
- **Sound handling of the `SENDER` impossibility.** Correctly reasons that
  Solidity can't make `msg.sender == tx.sender`, so it passes an explicit
  `logicalSender` to whitelisted `IFrame8141Target` implementers instead of
  a generic `target.call(...)` — avoiding the misleading-semantics /
  broad-attack-surface trap it explicitly called out.
- **Genuinely clever atomic-batch rollback.** Executes the batch via an
  external self-call `this.executeAtomicGroup(...)` guarded by `onlySelf`,
  wrapped in try/catch — so a later frame's revert rolls back all earlier
  target state in the group while preserving the parent tx and the fee
  payment. That is a correct, idiomatic Solidity pattern for atomicity.
- **EVVM-native fee movement**: charge payer via `requestPay`, pay the
  executor/fisher via `makeCaPay` — real value movement, not metadata.
- **No fabrication**; honest deferrals (EIP-2718 payload, APPROVE/TXPARAM/
  SIGPARAM opcodes, P256, receipts, mempool, gas accounting, 7702).
- Self-contained mock target with success/revert/rollback controls;
  view helpers exposing the exact hash to sign.

### Defects / caveats
1. **Likely one-line weld** in `Frame8141HashUtils.hashOnlyVerifyPaymaster`:
   the `sender,` argument appears mangled to `s` + whitespace before
   `payer,`. Same "one-line/one-token weld" class seen in other runs — a
   trivial fix, but it would fail compile as-is.
2. **Fee charged before the atomic group runs**, so a batch failure still
   charges the fee (execution rolls back, payment persists). This is a
   defensible modeling choice (matches "preserve parent tx + fee payment")
   and is documented — but worth calling out as a semantics decision.
3. Non-atomic `_executeUserFrames` treats a wrong magic return as "failed"
   and continues — correct for non-atomic mode, but means partial success
   is possible; the event stream makes this observable.

### One-line judgment
The best-architected Shape-B output yet: correct scope, a principled
answer to the `SENDER`/`msg.sender` problem, a correct atomic-batch
rollback via guarded self-call, and verified-correct EVVM integration that
reuses Core's real plumbing — blocked only by a trivial one-line weld.

---

## Cross-run insight: the fidelity gap is SHAPE-DEPENDENT

Comparing 8141 (this) with 8250:

- **8141 (Shape B)** reused Core's existing `validateAndConsumeNonce`, so
  it never had to implement signature recovery — and got integration right.
- **8250 (Shape A)** ADDED a new Core entrypoint, so it had to implement
  recovery itself — and did it the non-EVVM way (`keccak256(abi.encode(...))`
  + raw `ecrecover`), whereas EVVM actually signs **string-concatenated
  values** via `SignatureUtil.verifySignature` / `SignatureRecover.recoverSigner`
  (message = `"{evvmID},{functionName},{inputs}"`, EIP-191 string prefix).

So "reinvents EVVM plumbing" bites specifically when the EIP forces a NEW
signature-verifying entrypoint (often Shape A). Fix: inject an EVVM helper
cheatsheet (real SignatureUtil / SignatureRecover / CoreExecution wrapper
signatures) so new entrypoints reuse EVVM's string-based recovery and
existing helpers instead of hand-rolling them. (Applied as a prompt patch
after this run.)
