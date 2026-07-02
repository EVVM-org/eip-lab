# Run — EIP-8250 · deep-research flow · GPT-as-answerer · SHAPE A

| Field | Value |
|-------|-------|
| Date | 2026-06-06 |
| EIP | 8250 — Keyed Nonces for Frame Transactions |
| Flow | Deep-research (upload → ≤5 Q&A grounded in full EVVM docs → .sol) |
| Provider / model | OpenAI · gpt-5.5 (400k ctx, $5/$30 per Mtok) |
| Answerer | GPT (ChatGPT), acting as the human |
| EVVM grounding | full `evvm.info/llms-full.txt` injected (~290k tokens) |
| Prompt tokens | ~1,140,000 (mid-run panel; final slightly higher) |
| Completion tokens | ~15,000 |
| Total tokens | ~1,155,000+ |
| Est. cost (USD) | ~$6.15+ (panel pre-final-generation) |
| Exchanges used | 3 of 5 (converged early) |
| **Implementation shape** | **A — modify Core.sol (as diffs)** ⭐ first Shape-A run in the dataset |
| Files generated | 3 |
| Compiles | not run here — but Core internals referenced are VERIFIED correct against real testnet-contracts Core.sol; diff-format is clean (marker-delimited, no whole-file rewrite) |

**Files:** `contracts/Core.sol` (additions only, `>>> EIP-8250 ADDITION <<<`
markers), `contracts/KeyedNonceTestService.sol`, `justification.md`

> This is the run that finally exercises the **core-modification path** the
> redesign re-enabled ("let the research decide A/B/C" instead of forcing
> Shape B). Every prior run was Shape B. It also validates that the
> "modify core as diffs, never regenerate the file" rule holds in practice.

---

## Headline: Shape A works, and the diff references REAL Core internals correctly

EIP-8250 changes a nonce invariant, so the grounded flow correctly chose
**Shape A** and emitted an **additive Core diff** — not a whole-file
rewrite. Verified against the actual `testnet-contracts` `Core.sol`:

| Diff references… | Real Core.sol | Verdict |
|---|---|---|
| `nextSyncNonce[user]` (read + `++`) | exists; identical increment pattern (Core.sol:550/553/1107) | ✅ |
| `canExecuteUserTransaction(user)` | exists (Core.sol:1197); called exactly as real `validateAndConsumeNonce` does (Core.sol:534) | ✅ |
| `getEvvmID()` external → uses `this.getEvvmID()` | `getEvvmID()` is `external` (Core.sol:919) | ✅ + model FLAGGED the internal-vs-external gotcha in a note |
| sender/origin executor guards | mirror real `validateAndConsumeNonce` structure | ✅ |

The model even wrote: *"If your Core.sol has getEvvmID() marked external only
and the compiler rejects getEvvmID() internally, replace with … this.getEvvmID()"*
— and then used `this.getEvvmID()` in the final code. That is real
awareness of the target contract, not guesswork.

---

## Judge verdict: cleanest Shape-A output we could ask for

### Strengths
- **Correct shape, correctly scoped.** Additive, opt-in keyed nonce path;
  existing `validateAndConsumeNonce`, `pay/caPay`, sync/async getters
  explicitly left untouched. `[0]` aliases the existing sync nonce.
- **Real diff format.** Additions wrapped in `>>> EIP-8250 ADDITION <<<` /
  `>>> end EIP-8250 ADDITION <<<` with "unchanged content elided" — exactly
  the "show only the additions, never regenerate the ~1300-line file"
  behavior. No recreate-Core failure.
- **Sound protocol modeling.** `mapping(address=>mapping(uint256=>uint64))
  keyedNonceSeq`; strictly-increasing key-set validation (≤16, zero-alone);
  atomic multi-key consume; disjoint sets parallel, overlapping sets
  serialize — matches EIP-8250 semantics.
- **Domain separation done right.** Keyed signature digest is
  `keccak256(abi.encode("EVVM_KEYED_NONCE", evvmId, senderExecutor,
  hashPayload, originExecutor, nonceKeysHash, nonceSeq))` — explicitly
  distinct from the legacy envelope, with a two-way replay-separation test
  called out (keyed sig can't pass legacy; legacy sig can't pass keyed).
- **Honest deferrals.** EIP-8141 frames / APPROVE / TXPARAM / fixed-address
  NONCE_MANAGER / `NONCE_MANAGER_CODE` / first-use gas surcharge all
  deferred with correct rationale (protocol/frame-gas concerns, not
  contract logic). No fabricated system-contract bytecode.
- **Full test matrix + client signing recipe** (Foundry `vm.sign`) included.
- Self-contained `KeyedNonceTestService` with a minimal `ICoreKeyedNonce`
  interface — no fake EVVM imports.

### Fidelity caveats (not compile blockers, but worth noting)
1. **Re-implements signature recovery instead of using EVVM's.** It uses
   raw `ecrecover` over `"\x19Ethereum Signed Message:\n32" || digest`.
   Real EVVM has its own EIP-191 recovery machinery (a SignatureRecover
   lib) and a shared `Error` library (`Error.SenderMismatch()` etc.). The
   diff instead declares its own errors and inlines recovery. Self-contained
   and compilable, but a production diff should reuse EVVM's recover helper
   and error library for true consistency. (Grounding gave the model the
   Core *state/functions* but not the exact signature-lib API, so it built
   its own — reasonable, but a fidelity gap.)
2. `_nonceKeysHash` builds bytes with `bytes.concat` in a loop — correct
   but gas-inefficient; a real version would `abi.encodePacked` once.
3. `this.getEvvmID()` is an external self-call (small gas cost) — works;
   ideally read the internal evvmID field directly.

### One-line judgment
The first Shape-A run is a clean, correctly-scoped, marker-delimited Core
diff whose references to real Core state/functions are verified accurate —
the "modify core as diffs, never rewrite" capability works. Main gap:
it reinvents EVVM's signature-recovery/error plumbing instead of reusing it.

---

## Cost finding (important): grounding roughly QUADRUPLED cost

| Run | Model | Total tokens | Cost | Notes |
|---|---|---:|---:|---|
| 8182 (pre-grounding, old flow) | gpt-5.5 | 192,301 | $1.58 | no EVVM docs |
| 8182 (deep-research, grounded) | gpt-5.5 | 1,293,761 | **$6.88** | +EVVM docs, 5 calls |
| 8250 (deep-research, grounded) | gpt-5.5 | ~1,155,000+ | **~$6.15+** | +EVVM docs, 4 calls |

The ~290k-token EVVM reference is re-sent on EVERY call, so prompt tokens
balloon to ~1.2–1.3M and cost to ~$6–7 per full run (vs $1.58 ungrounded).
The grounding is clearly worth it for quality — but it is the dominant cost
driver, and it is **the same bytes every call**, which points at an obvious
optimization: **provider prompt caching** (OpenAI bills cached input at ~10%
= $0.50/Mtok). Structuring the request so the EVVM docs sit in a stable
cacheable prefix would cut most of the repeated ~290k-token input cost.
Logged as the top efficiency lever.
