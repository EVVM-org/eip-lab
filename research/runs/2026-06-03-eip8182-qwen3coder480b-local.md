# Run — EIP-8182 · qwen3-coder-480b · local

| Field | Value |
|-------|-------|
| Date | 2026-06-03 |
| EIP | 8182 — Private ETH and ERC-20 Transfers |
| Source | https://eips.ethereum.org/EIPS/eip-8182 (auto-fetched) |
| Provider | Venice AI |
| Model | qwen3-coder-480b-a35b-instruct-turbo |
| Pricing | $0.35 in / $1.50 out per Mtok |
| Environment | local (`localhost:3000`, `pnpm dev`) |
| Prompt tokens | 161,406 |
| Completion tokens | 11,388 |
| Total tokens | 172,794 |
| Est. cost (USD) | $0.0736 |
| Completed cleanly | yes (no truncation, no stall) |
| Implementation shape | B (new service extending EvvmService) |
| Files generated | 5 |

**Files:** `contracts/interfaces/IAuthVerifier.sol`,
`contracts/mocks/Poseidon.sol`, `contracts/mocks/Groth16Verifier.sol`,
`contracts/ShieldedPool.sol`, `justification.md`

---

## Phase 2 — Read & Agree (model output)

## EIP-8182: Private ETH and ERC-20 Transfers — Summary of Intent

This EIP introduces a **canonical privacy layer for private ETH and ERC-20 token transfers** on Ethereum via a **shielded pool system contract**. It enables users to make private transfers without requiring new opcodes, transaction types, or precompiles, relying instead on a split-proof architecture that separates spend authorization from core protocol enforcement.

### Core Components

#### 1. System Contract (Shielded Pool)
- Deployed at a fixed address (`0x0000000000000000000000000000000000081820`) as a system contract.
- Immutable: No admin, proxy, or upgrade mechanism. Changes require a hard fork.
- Manages: note commitment tree (depth-32 Poseidon Merkle tree); nullifier set; intent replay ID set; auth-policy registry; root histories.

#### 2. Deposit Path
- Public deposits (no proof required). Sender specifies token+amount, `ownerCommitment` (hidden recipient commitment), optional `outputNoteData`. Contract inserts the note directly.

#### 3. Split-Proof Architecture
- Pool Proof (hard-fork managed, Groth16 BN254): enforces value conservation, nullifier derivation/uniqueness, Merkle membership, deterministic output note secrets, auth-policy/policy-set membership, intent digest + blinded auth commitment recomputation. Verified natively by the system contract.
- Auth Proof (permissionless, user-defined): authentication (ECDSA, passkey) + intent parsing. Outputs `[blindedAuthCommitment, transactionIntentDigest]`. Verified by a user-registered `authVerifier` via `staticcall`.

#### 4. Private Auth-Policy Registry
- Each address binds `ownerNullifierKeyHash` (locked), `noteSecretSeedHash` (rotatable), `policySetCommitment` (rotatable). Registered via `setAuthPolicy`. Policies hidden via `registrationBlinder`.

### Note structure
- `ownerCommitment = poseidon(ownerNullifierKeyHash, noteSecret)`
- `noteBodyCommitment = poseidon(ownerCommitment, amount, tokenAddress)`
- `noteCommitment = poseidon(noteBodyCommitment, leafIndex)`
- Nullifiers: real `poseidon(noteCommitment, ownerNullifierKey)`; phantom `poseidon(ownerNullifierKey, intentReplayId, inputIndex)`

### Replay protection
- `intentReplayId = poseidon(ownerNullifierKey, authorizingAddress, executionChainId, nonce)`; fresh high-entropy nonce.

### Withdrawals vs transfers
- Transfer: `publicAmountOut == 0`. Withdrawal: `publicAmountOut > 0`, public destination.

### Dependencies
- Poseidon2 over BN254; Groth16 BN254 (trusted setup); permissionless auth verifiers; note delivery unspecified (off-chain).

### Backward compatibility
- Fully compatible; new system contract; activated via hard fork.

_(Model confirmed intent and asked the user to correct before mapping.)_

---

## Phase 3 — Map the surface (model output)

### Implementation Shape: B — Add a new service extending `EvvmService`

Rationale: additive, modular; does not alter core EVVM invariants (nonce
semantics, payment logic, balance handling); not an external adapter.
Result: add `ShieldedPool.sol` extending `EvvmService`, constructor
`(address coreAddress, address stakingAddress)`.

### Dependency survey

| Dependency | Strategy | Reason | Limitation |
|---|---|---|---|
| Poseidon2 over BN254 | mock | No standard/safe Solidity Poseidon to vendor | keccak-based with domain separation |
| Groth16 BN254 | mock | No trusted setup / verifier available | admin-gated verdict verifier |
| Auth verifier contracts | defer | external/permissionless | model the interface |
| Merkle tree | (simplified, in-contract, Poseidon mock) | | |
| ECDSA/passkey circuits | defer | off-contract | model `authVerifier` interface |

Storage/struct/event/function sketches given (UserEntry, PublicInputs,
the three events, transact/deposit/setAuthPolicy + read methods).

Technical decisions: Poseidon mock (keccak+domain), Groth16 admin-gated
mock, simplified in-memory Merkle, auth verifiers via interface, deposit
ETH via msg.value / ERC-20 via transferFrom, opaque output note data.
Scope: suitable for invariant/logic testing, NOT real SNARK/privacy/
production Merkle.

---

## Phase 4 — Generated Solidity

> Note: captured as produced. Per current product goal the deliverable is
> documented, readable Solidity (not guaranteed-compilable). Known
> residual issues in this run: `noteCommitmentRootHistory[1:]` (storage
> slice — invalid Solidity), `keccak256(abi.encodePacked(... mapping ...))`
> for root calc (invalid), and a `Poseidon.FIELD_MODULUS` visibility
> reference. Recorded verbatim for the article.

### FILE: contracts/interfaces/IAuthVerifier.sol

```solidity
// SPDX-License-Identifier: EVVM-NONCOMMERCIAL-1.0
pragma solidity 0.8.30;

/**
 * @title IAuthVerifier
 * @notice Interface for auth verifier contracts used in EIP-8182.
 */
interface IAuthVerifier {
    function verifyAuth(
        bytes calldata publicInputs,
        bytes calldata proof
    ) external returns (bool);
}
```

### FILE: contracts/mocks/Poseidon.sol

A `library Poseidon` exposing `poseidon(bytes32 domain, ...)` overloads
from arity 1 up to ~17 inputs, each
`uint256(keccak256(abi.encodePacked(domain, ...))) % FIELD_MODULUS`
with `FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617`
(declared `private constant`). Documented as a keccak-based mock — not
cryptographically secure, does not match real Poseidon2 outputs.

### FILE: contracts/mocks/Groth16Verifier.sol

```solidity
// SPDX-License-Identifier: EVVM-NONCOMMERCIAL-1.0
pragma solidity 0.8.30;

contract Groth16Verifier {
    address public admin;
    mapping(bytes32 => bool) public verdicts;
    constructor() { admin = msg.sender; }
    function setVerdict(bytes32 proofHash, bool isValid) external {
        require(msg.sender == admin, "Only admin can set verdict");
        verdicts[proofHash] = isValid;
    }
    function verifyProof(bytes memory proof, uint256[] memory inputs) public view returns (bool) {
        bytes32 proofHash = keccak256(abi.encodePacked(proof, inputs));
        return verdicts[proofHash];
    }
}
```

### FILE: contracts/ShieldedPool.sol

`contract ShieldedPool is EvvmService` with `using Poseidon for bytes32`.
14 domain separators as `keccak256("eip-8182.<context>")` constants; EIP
§3 constants; storage for note tree (mapping + nextLeafIndex), nullifier
set, intent-replay set, auth-policy registry (mapping + UserEntry +
ownerNullifierKeyHashIndex), root histories, and a `Groth16Verifier`.
`PublicInputs`/`UserEntry` structs; the three events. Constructor
`(coreAddress, stakingAddress, groth16VerifierAddress)`.

`transact(...)` implements the EIP §5.4.1 13-step order: chain id; intent
expiry; note-root acceptance; auth-root acceptance; nullifier
uniqueness; public-input ranges; pool proof via the mock verifier (19
inputs); auth proof via `IAuthVerifier(...).verifyAuth(...)`; mark
nullifiers; mark intent-replay; output-note-data-hash checks
(`keccak % Poseidon.FIELD_MODULUS`); public asset movement (ETH `call` /
ERC-20 `transfer` / transfer-mode zero checks); assign leaf indices,
compute three note commitments via `NOTE_COMMITMENT_DOMAIN.poseidon(...)`,
push root history, insert, emit `ShieldedPoolTransact`.

`deposit(...)` (payable): range checks; receive ETH (msg.value) or ERC-20
(transferFrom + balance-delta); assign leaf; compute body/note
commitments; insert; emit `ShieldedPoolDeposit`.

`setAuthPolicy(...)`: field-range + reserved-value checks; first-vs-update
registration with `ownerNullifierKeyHash` locking + global uniqueness;
leaf value `keccak256(abi.encodePacked(AUTH_POLICY_DOMAIN, uint160(sender),
...))`; record auth-policy root; write leaf; emit `AuthPolicySet`.

Read methods: `getCurrentRoots`, `isAcceptedNoteCommitmentRoot`,
`isAcceptedAuthPolicyRoot`, `isNullifierSpent`, `isIntentReplayIdUsed`,
`getAuthPolicyEntry`, plus `getCurrentNoteCommitmentRoot` /
`getCurrentAuthPolicyRoot` (simplified keccak-of-state roots).

### FILE: justification.md

States Shape B rationale; dependency strategies (Poseidon mock, Groth16
admin-gated mock, auth verifiers via interface, simplified Merkle);
technical decisions; and scope (logic testing only — not real SNARK,
real privacy, production Merkle, or auth-circuit verification).
