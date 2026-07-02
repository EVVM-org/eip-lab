# Run — EIP-8182 · NEW deep-research flow · GPT-as-answerer

| Field | Value |
|-------|-------|
| Date | 2026-06-06 |
| EIP | 8182 — Private ETH and ERC-20 Transfers |
| Flow | **Deep-research redesign** (upload → ≤5 Q&A grounded in full EVVM docs → .sol) |
| Provider / model | OpenAI · gpt-5.5 (400k ctx, $5/$30 per Mtok) |
| Answerer | GPT (ChatGPT), acting as the human — answered the Lab's questions |
| EVVM grounding | full `evvm.info/llms-full.txt` injected (~290k tokens) |
| Prompt tokens | 1,277,192 |
| Completion tokens | 16,569 |
| Total tokens | 1,293,761 |
| Est. cost (USD) | $6.88 |
| Exchanges used | 3 of 5 (converged early) |
| Implementation shape | B (new service extending EvvmService) — **research-decided, not forced** |
| Files generated | 6 |
| Compiles | not run here — but the previously-blocking defect classes are ABSENT and the EVVM integration is verified correct (see below) |

**Files:** `contracts/IAuthVerifier8182.sol`, `contracts/MockPoseidon8182.sol`,
`contracts/MockPoolVerifier8182.sol`, `contracts/MockAuthVerifier8182.sol`,
`contracts/PrivateTransfer8182Service.sol`, `justification.md`

> First end-to-end run of the redesigned flow, AND a first: the user drove
> a parallel GPT chat as the "human", pasting the Lab's numbered questions
> into GPT and GPT's answers back into the Lab. The loop worked — the Lab
> converged on a coherent happy path in 3 exchanges.

---

## Headline: the EVVM-docs grounding produced CORRECT integration (verified)

This is the payoff of the redesign. With the full EVVM stack reference in
context, the model chose an EVVM-native path and used the REAL inherited
`EvvmService` wrappers with correct signatures — checked against the actual
`testnet-contracts` source:

| Generated call | Real signature (`CoreExecution` / `Core`) | Verdict |
|---|---|---|
| `requestPay(user, token, amount, payAuth.priorityFee, payAuth.originExecutor, payAuth.nonce, payAuth.isAsyncExec, payAuth.signature)` | `requestPay(from, token, amount, priorityFee, originExecutor, nonce, isAsyncExec, signature)` (internal, in CoreExecution) | ✅ exact match |
| `makeCaPay(recipient, token, amount)` | `makeCaPay(to, token, amount)` (internal, in CoreExecution) | ✅ exact match |
| `core.validateAndConsumeNonce(user, address(this), hashPayload, originExecutor, nonce, isAsyncExec, signature)` | exists on `Core.sol` / `ICore.sol` | ✅ |
| `EvvmService(coreAddress, stakingAddress)` constructor | matches real `EvvmService` constructor | ✅ |

Prior runs (pre-grounding) invented host-chain ERC-20 custody or guessed
signatures. Here the model correctly identified that value should move
through EVVM internal balances via `requestPay` / `makeCaPay`, and got the
argument lists right. That is the redesign working as intended.

---

## Judge verdict: strongest architecture to date

### Strengths
- **Shape decided by research, not forced.** Correctly chose Shape B
  (additive service, no Core diffs) with sound reasoning grounded in what
  EVVM Core already owns — exactly the "let the research decide" behavior
  we designed. Explicitly stated "No `Core.sol` modification."
- **EVVM-native by construction** (see verified table above): deposits via
  `requestPay`, withdrawals via `makeCaPay`, actions gated by
  `validateAndConsumeNonce`, custody in Core internal balances.
- **The Lab surfaced a genuine security subtlety on its own.** Before
  locking the path it flagged that a payment signature alone does NOT bind
  `ownerCommitment` / `outputNoteData`, so a fisher could mutate the note
  params while reusing the user's valid payment sig — and proposed a
  two-signature `depositSigned` (an action sig binding
  `keccak256(abi.encode("EIP8182_DEPOSIT", token, amount, ownerCommitment,
  keccak(outputNoteData) % P))` plus the payment sig). That is real
  meta-transaction threat modeling, not boilerplate.
- **No fabrication.** `MockPoseidon8182` is the parameter-free keccak
  reduction; empty-subtree ladders derived in the constructor; pool/auth
  verifiers are deterministic admin-verdict stubs — no invented Poseidon
  constants, VKs, or circuit artifacts. Anti-fabrication rule holds on the
  new flow.
- **No spiral, no whole-file Core rewrite, no continue-welds** — converged
  and generated cleanly.
- Correct frontier Merkle insert; 19-field public-input vector; auth via
  `staticcall` with returndata-shape check; `justification.md` complete.

### Issues to fix before it's production-of-a-test-harness clean
(most caught by the GPT reviewer too):
1. **`updatePoolVerifier()` is unusable** — guarded by
   `msg.sender == address(this)` with no path to reach it. Either remove it
   (make `poolVerifier` immutable) or make it test-admin-gated.
2. **`accountedPoolBalance` is `mapping(address => uint256)` keyed by
   token** — works, but the name reads like it's keyed by account. Rename
   to `accountedPoolBalanceByToken`.
3. **`deposit(...)` direct helper is `payable` yet reverts on
   `msg.value != 0`** and only works against pre-funded service balance —
   confusing semantics; rename to `depositFromPrefundedServiceBalance` or
   drop it (the signed path is the real one).
4. **Coverage honesty:** the mock pool proof "enforces" the private
   constraints only nominally — tests must not claim EIP-8182 crypto
   security. The justification says this; keep it loud.

### One-line judgment
The redesigned flow's first run is the best-architected output in the
dataset: research-chosen Shape B, EVVM integration verified correct against
the real contracts, a self-surfaced two-signature fix for a real fisher
mutation risk, and zero fabrication — with only cosmetic/admin cleanups
left.

---

## What this validates about the redesign

- **Grounding in `llms-full.txt` is the differentiator.** The jump from
  "plausible EVVM-ish code" (earlier runs) to "uses the real inherited
  wrappers with correct signatures" is directly attributable to injecting
  the full EVVM reference. Verified, not assumed.
- **≤5-exchange Q&A converged in 3** and produced a coherent, defensible
  plan — the interaction cap is not a constraint in practice for a
  well-scoped EIP.
- **GPT-as-answerer is a viable test harness** for exercising the flow
  without a human in the loop — useful for generating more runs quickly.
  (Caveat: GPT and the Lab may share model-family blind spots; a human
  spot-check still matters.)

## Method note (GPT-as-answerer)

The user primed a separate GPT chat with an EVVM-context system prompt +
the same EIP, then relayed the Lab's numbered questions to GPT and GPT's
answers back. The prompt used is the one in this repo's chat history
("EVVM implementation counterpart"). This is a reproducible way to A/B a
model's *questions* against another model's *answers* on the same EIP.
