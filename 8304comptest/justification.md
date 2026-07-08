# EIP-8304 on EVVM — Phase 1 Justification

## Shape
Implemented as Shape C: external adapter / system-index simulation. No EVVM core contracts are modified.

## Contracts

### IndexContract8304.sol
Models the EIP-8304 system index contract surface: authorized `set`, `get`, fixed table sizes, ring-buffer slot formula, and overwrite detection by stored metadata. Uses a configurable `authorizedSystemUpdater` to simulate protocol calls from `SYSTEM_ADDRESS`.

### IndexEntryEncoder8304.sol
Provides deterministic big-endian binary encoders for all seven EIP-8304 entry types and SHA2 leaf hashing via `sha256(encodedEntry)`.

### IndexProofVerifier8304.sol
Verifies SHA2 binary Merkle membership proofs against roots stored in `IndexContract8304`. Table construction, sorting, merging, SSZ list construction, and proof generation remain off-chain/test-harness responsibilities.

### MockSystemUpdater8304.sol
Simulates block-processing root submissions for tests, including ring-buffer overwrite scenarios. It does not impersonate the real system address.

### MockEvvmLogEmitter8304.sol
Emits deterministic logs that tests can encode into EIP-8304 virtual entries without changing EVVM `Core.sol`.

## Deferred
Real client block processing, receipt/log enumeration, fixed `INDEX_CONTRACT_ADDRESS`, synthetic deployment constants, real `SYSTEM_ADDRESS` calls, on-chain table building/merging, ZK-proven history tables, and any EVVM Core instrumentation are intentionally out of scope for Phase 1.
