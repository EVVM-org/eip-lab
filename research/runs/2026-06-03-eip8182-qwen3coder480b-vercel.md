# Run — EIP-8182 · qwen3-coder-480b · vercel

| Field | Value |
|-------|-------|
| Date | 2026-06-03 |
| EIP | 8182 — Private ETH and ERC-20 Transfers |
| Source | https://eips.ethereum.org/EIPS/eip-8182 (auto-fetched) |
| Provider | Venice AI |
| Model | qwen3-coder-480b-a35b-instruct-turbo |
| Pricing | $0.35 in / $1.50 out per Mtok |
| Environment | vercel (hosted deployment) |
| Prompt tokens | 160,608 |
| Completion tokens | 9,233 |
| Total tokens | 169,841 |
| Est. cost (USD) | $0.0701 |
| Completed cleanly | yes |
| Implementation shape | B (new service extending EvvmService) |
| Files generated | 6 |

**Files:** `contracts/services/ShieldedPool.sol`,
`contracts/library/MockPoseidon.sol`,
`contracts/library/MockGroth16Verifier.sol`,
`contracts/library/IAuthVerifier.sol`,
`contracts/library/MockECDSAVerifier.sol`, `justification.md`

---

## Phase 2 — Read & Agree (model output, condensed)

Correctly identified EIP-8182 as a canonical privacy layer / shielded
pool with split-proof architecture. Covered: system contract at
`0x0000000000000000000000000000000000081820`; UTXO notes with the
three-layer commitment; split proof (Groth16 pool proof + permissionless
auth proof sharing `[blindedAuthCommitment, transactionIntentDigest]`);
auth-policy registry with hidden `policyCommitment`; deposit (proof-free)
vs transact (transfer/withdrawal); Poseidon2/Groth16/domain separation;
intent-replay + output binding; note delivery out of scope; backward
compatible via hard fork. Flagged out-of-scope deps (Poseidon2, Groth16,
auth verifiers) and asked the user to confirm.

---

## Phase 3 — Map the surface (model output, condensed)

Shape **B** (new service). Dependency survey: Poseidon2 `mock`
(keccak+arity), Groth16 `mock` (admin/verdict), auth verifiers
`mock`/`vendor` (basic ECDSA mock), Merkle `vendor`/inline, ECDSA
`vendor` (OZ). New files: `ShieldedPool.sol` + `MockPoseidon` +
`MockGroth16Verifier` + `MockECDSAVerifier`; Core.sol unchanged; other
stack contracts untouched. (Note: in the map phase the model said it
might call `Core.pay`/`caPay`, but in the final code it used direct
ERC-20/ETH movement and documented that choice in the justification.)

---

## Phase 4 — Generated Solidity (verbatim)

### FILE: contracts/services/ShieldedPool.sol

```solidity
// SPDX-License-Identifier: EVVM-NONCOMMERCIAL-1.0
pragma solidity 0.8.30;

import "../library/EvvmService.sol";
import "../library/MockPoseidon.sol";
import "../library/MockGroth16Verifier.sol";
import "../library/IAuthVerifier.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title ShieldedPool
/// @notice Implements EIP-8182: Private ETH and ERC-20 transfers via a shielded pool system contract.
/// @dev Extends EvvmService to interact with Core.sol for public asset movements.
contract ShieldedPool is EvvmService {
    using ECDSA for bytes32;

    // --- Constants from EIP-8182 ---
    uint256 constant MAX_INTENT_LIFETIME = 86400;
    uint256 constant NOTE_COMMITMENT_ROOT_HISTORY_SIZE = 500;
    uint256 constant AUTH_POLICY_ROOT_HISTORY_BLOCKS = 64;
    uint256 constant POLICY_SET_DEPTH = 8;
    uint256 constant DUMMY_OWNER_NULLIFIER_KEY_HASH = 0x1234567890abcdef; // Mock value
    uint256 constant TRANSFER_OP = 0;
    uint256 constant WITHDRAWAL_OP = 1;
    uint256 constant LOCK_OUTPUT_BINDING_0 = 1 << 0;
    uint256 constant LOCK_OUTPUT_BINDING_1 = 1 << 1;
    uint256 constant LOCK_OUTPUT_BINDING_2 = 1 << 2;

    // Domain separators (mocked)
    bytes32 constant OWNER_NULLIFIER_KEY_HASH_DOMAIN = keccak256("owner_nullifier_key_hash");
    bytes32 constant OWNER_COMMITMENT_DOMAIN = keccak256("owner_commitment");
    bytes32 constant NOTE_BODY_COMMITMENT_DOMAIN = keccak256("note_body_commitment");
    bytes32 constant NOTE_COMMITMENT_DOMAIN = keccak256("note_commitment");
    bytes32 constant NULLIFIER_DOMAIN = keccak256("nullifier");
    bytes32 constant PHANTOM_NULLIFIER_DOMAIN = keccak256("phantom_nullifier");
    bytes32 constant INTENT_REPLAY_ID_DOMAIN = keccak256("intent_replay_id");
    bytes32 constant TRANSACT_NOTE_SECRET_DOMAIN = keccak256("transact_note_secret");
    bytes32 constant NOTE_SECRET_SEED_DOMAIN = keccak256("note_secret_seed");
    bytes32 constant TRANSACTION_INTENT_DIGEST_DOMAIN = keccak256("transaction_intent_digest");
    bytes32 constant OUTPUT_BINDING_DOMAIN = keccak256("output_binding");
    bytes32 constant AUTH_POLICY_DOMAIN = keccak256("auth_policy");
    bytes32 constant POLICY_COMMITMENT_DOMAIN = keccak256("policy_commitment");
    bytes32 constant BLINDED_AUTH_COMMITMENT_DOMAIN = keccak256("blinded_auth_commitment");

    struct PublicInputs {
        uint256 noteCommitmentRoot;
        uint256 nullifier0;
        uint256 nullifier1;
        uint256 noteBodyCommitment0;
        uint256 noteBodyCommitment1;
        uint256 noteBodyCommitment2;
        uint256 publicAmountOut;
        uint256 publicRecipientAddress;
        uint256 publicTokenAddress;
        uint256 intentReplayId;
        uint256 validUntilSeconds;
        uint256 executionChainId;
        uint256 authPolicyRoot;
        uint256 outputNoteDataHash0;
        uint256 outputNoteDataHash1;
        uint256 outputNoteDataHash2;
        uint256 authVerifier;
        uint256 blindedAuthCommitment;
        uint256 transactionIntentDigest;
    }

    struct UserEntry {
        uint32 leafPosition;
        uint256 ownerNullifierKeyHash;
        uint256 noteSecretSeedHash;
        uint256 policySetCommitment;
    }

    uint256 public nextLeafIndex;
    mapping(uint256 => uint256) public noteCommitments; // leafIndex -> commitment
    uint256[] public noteCommitmentRootHistory;

    mapping(uint256 => bool) public isNullifierSpent;
    mapping(uint256 => bool) public isIntentReplayIdUsed;

    mapping(uint256 => uint256) public authPolicyRegistryTree; // leafPosition -> leafValue
    mapping(address => UserEntry) public userEntries;
    mapping(uint256 => address) public ownerNullifierKeyHashIndex;
    uint256 public nextLeafPosition = 1;

    struct RootHistoryEntry { uint256 root; uint256 blockNumber; }
    RootHistoryEntry[65] public authPolicyRootHistory; // AUTH_POLICY_ROOT_HISTORY_BLOCKS + 1
    uint256 public authPolicyRootHistoryIndex;

    MockGroth16Verifier public poolVerifier;

    event ShieldedPoolTransact(
        uint256 indexed nullifier0, uint256 indexed nullifier1, uint256 indexed intentReplayId,
        address authVerifier, uint256 noteCommitment0, uint256 noteCommitment1, uint256 noteCommitment2,
        uint256 leafIndex0, uint256 postInsertionCommitmentRoot,
        bytes outputNoteData0, bytes outputNoteData1, bytes outputNoteData2
    );
    event ShieldedPoolDeposit(
        address indexed depositor, uint256 noteCommitment, uint256 leafIndex, uint256 amount,
        uint256 tokenAddress, uint256 postInsertionCommitmentRoot, bytes outputNoteData
    );
    event AuthPolicySet(
        address indexed user, uint256 ownerNullifierKeyHash, uint256 noteSecretSeedHash,
        uint256 policySetCommitment, uint256 leafPosition, uint256 leafValue, uint256 postUpdateAuthPolicyRoot
    );

    constructor(address coreAddress, address stakingAddress, address verifierAddress) EvvmService(coreAddress, stakingAddress) {
        poolVerifier = MockGroth16Verifier(verifierAddress);
    }

    function transact(
        bytes calldata poolProof, bytes calldata authProof, PublicInputs calldata publicInputs,
        bytes calldata outputNoteData0, bytes calldata outputNoteData1, bytes calldata outputNoteData2
    ) external {
        require(publicInputs.executionChainId == block.chainid, "Chain ID mismatch");
        require(publicInputs.validUntilSeconds > 0, "Invalid expiry");
        require(block.timestamp <= publicInputs.validUntilSeconds, "Intent expired");
        require(publicInputs.validUntilSeconds <= block.timestamp + MAX_INTENT_LIFETIME, "Intent too far in future");
        require(_isAcceptedNoteCommitmentRoot(publicInputs.noteCommitmentRoot), "Invalid note root");
        require(publicInputs.authPolicyRoot != 0, "Auth policy root is zero");
        require(_isAcceptedAuthPolicyRoot(publicInputs.authPolicyRoot), "Invalid auth policy root");
        require(publicInputs.nullifier0 != publicInputs.nullifier1, "Nullifiers must differ");
        require(publicInputs.publicAmountOut < 2**248, "Amount out too large");
        require(publicInputs.publicRecipientAddress < 2**160, "Invalid recipient address");
        require(publicInputs.publicTokenAddress < 2**160, "Invalid token address");
        require(publicInputs.authVerifier < 2**160 && publicInputs.authVerifier != 0, "Invalid auth verifier");
        require(publicInputs.validUntilSeconds < 2**32, "Invalid validUntilSeconds");
        require(publicInputs.executionChainId < 2**32, "Invalid executionChainId");

        uint256[] memory inputs = new uint256[](19);
        inputs[0] = publicInputs.noteCommitmentRoot;
        inputs[1] = publicInputs.nullifier0;
        inputs[2] = publicInputs.nullifier1;
        inputs[3] = publicInputs.noteBodyCommitment0;
        inputs[4] = publicInputs.noteBodyCommitment1;
        inputs[5] = publicInputs.noteBodyCommitment2;
        inputs[6] = publicInputs.publicAmountOut;
        inputs[7] = publicInputs.publicRecipientAddress;
        inputs[8] = publicInputs.publicTokenAddress;
        inputs[9] = publicInputs.intentReplayId;
        inputs[10] = publicInputs.validUntilSeconds;
        inputs[11] = publicInputs.executionChainId;
        inputs[12] = publicInputs.authPolicyRoot;
        inputs[13] = publicInputs.outputNoteDataHash0;
        inputs[14] = publicInputs.outputNoteDataHash1;
        inputs[15] = publicInputs.outputNoteDataHash2;
        inputs[16] = publicInputs.authVerifier;
        inputs[17] = publicInputs.blindedAuthCommitment;
        inputs[18] = publicInputs.transactionIntentDigest;
        require(poolVerifier.verifyProof(poolProof, inputs), "Pool proof verification failed");

        bytes memory authPublicInputs = abi.encode(publicInputs.blindedAuthCommitment, publicInputs.transactionIntentDigest);
        IAuthVerifier verifier = IAuthVerifier(address(uint160(publicInputs.authVerifier)));
        require(verifier.verifyAuth(authPublicInputs, authProof), "Auth proof verification ed"); // [sic: truncated error string in output]

        require(!isNullifierSpent[publicInputs.nullifier0], "Nullifier 0 already spent");
        require(!isNullifierSpent[publicInputs.nullifier1], "Nullifier 1 already spent");
        isNullifierSpent[publicInputs.nullifier0] = true;
        isNullifierSpent[publicInputs.nullifier1] = true;

        require(!isIntentReplayIdUsed[publicInputs.intentReplayId], "Intent replay ID already used");
        isIntentReplayIdUsed[publicInputs.intentReplayId] = true;

        require(uint256(keccak256(outputNoteData0)) % MockPoseidon.P == publicInputs.outputNoteDataHash0, "Output note data 0 hash mismatch");
        require(uint256(keccak256(outputNoteData1)) % MockPoseidon.P == publicInputs.outputNoteDataHash1, "Output note data 1 hash mismatch");
        require(uint256(keccak256(outputNoteData2)) % MockPoseidon.P == publicInputs.outputNoteDataHash2, "Output note data 2 hash mismatch");

        if (publicInputs.publicAmountOut > 0) {
            require(publicInputs.publicRecipientAddress != 0, "Withdrawal recipient is zero");
            if (publicInputs.publicTokenAddress == 0) {
                (bool success, ) = address(uint160(publicInputs.publicRecipientAddress)).call{value: publicInputs.publicAmountOut}("");
                require(success, "ETH transfer failed");
            } else {
                IERC20 token = IERC20(address(uint160(publicInputs.publicTokenAddress)));
                require(token.transfer(address(uint160(publicInputs.publicRecipientAddress)), publicInputs.publicAmountOut), "ERC-20 transfer failed");
            }
        } else {
            require(publicInputs.publicRecipientAddress == 0, "Transfer recipient must be zero");
            require(publicInputs.publicTokenAddress == 0, "Transfer token must be zero");
        }

        require(nextLeafIndex + 3 <= 2**32, "Leaf index overflow");
        uint256 leafIndex0 = nextLeafIndex;
        uint256 noteCommitment0 = MockPoseidon.poseidon3(NOTE_COMMITMENT_DOMAIN, publicInputs.noteBodyCommitment0, leafIndex0);
        uint256 noteCommitment1 = MockPoseidon.poseidon3(NOTE_COMMITMENT_DOMAIN, publicInputs.noteBodyCommitment1, leafIndex0 + 1);
        uint256 noteCommitment2 = MockPoseidon.poseidon3(NOTE_COMMITMENT_DOMAIN, publicInputs.noteBodyCommitment2, leafIndex0 + 2);
        require(noteCommitment0 != 0 && noteCommitment1 != 0 && noteCommitment2 != 0, "Note commitments cannot be zero");

        noteCommitmentRootHistory.push(_getCurrentNoteCommitmentRoot());
        if (noteCommitmentRootHistory.length > NOTE_COMMITMENT_ROOT_HISTORY_SIZE) {
            noteCommitmentRootHistory = noteCommitmentRootHistory[1:]; // [sic: invalid storage-array slice]
        }
        noteCommitments[leafIndex0] = noteCommitment0;
        noteCommitments[leafIndex0 + 1] = noteCommitment1;
        noteCommitments[leafIndex0 + 2] = noteCommitment2;
        nextLeafIndex += 3;

        emit ShieldedPoolTransact(
            publicInputs.nullifier0, publicInputs.nullifier1, publicInputs.intentReplayId,
            address(uint160(publicInputs.authVerifier)),
            noteCommitment0, noteCommitment1, noteCommitment2, leafIndex0,
            _getCurrentNoteCommitmentRoot(), outputNoteData0, outputNoteData1, outputNoteData2
        );
    }

    function deposit(address token, uint256 amount, uint256 ownerCommitment, bytes calldata outputNoteData) external payable {
        require(amount > 0, "Amount must be positive");
        require(amount < 2**248, "Amount too large");
        require(ownerCommitment != 0, "Owner commitment is zero");
        require(ownerCommitment < MockPoseidon.P, "Owner commitment out of field");
        if (token == address(0)) {
            require(msg.value == amount, "ETH value mismatch");
        } else {
            require(msg.value == 0, "No ETH for ERC-20 deposit");
            uint256 balBefore = IERC20(token).balanceOf(address(this));
            IERC20(token).transferFrom(msg.sender, address(this), amount);
            uint256 balAfter = IERC20(token).balanceOf(address(this));
            require(balAfter - balBefore == amount, "ERC-20 balance mismatch");
        }
        require(nextLeafIndex + 1 <= 2**32, "Leaf index overflow");
        uint256 leafIndex = nextLeafIndex;
        uint256 noteBodyCommitment = MockPoseidon.poseidon4(NOTE_BODY_COMMITMENT_DOMAIN, ownerCommitment, amount, uint160(token));
        uint256 noteCommitment = MockPoseidon.poseidon3(NOTE_COMMITMENT_DOMAIN, noteBodyCommitment, leafIndex);
        require(noteCommitment != 0, "Note commitment is zero");
        noteCommitmentRootHistory.push(_getCurrentNoteCommitmentRoot());
        if (noteCommitmentRootHistory.length > NOTE_COMMITMENT_ROOT_HISTORY_SIZE) {
            noteCommitmentRootHistory = noteCommitmentRootHistory[1:];
        }
        noteCommitments[leafIndex] = noteCommitment;
        nextLeafIndex += 1;
        emit ShieldedPoolDeposit(msg.sender, noteCommitment, leafIndex, amount, uint160(token), _getCurrentNoteCommitmentRoot(), outputNoteData);
    }

    function setAuthPolicy(uint256 ownerNullifierKeyHash, uint256 noteSecretSeedHash, uint256 policySetCommitment) external returns (uint256 leafPosition) {
        require(ownerNullifierKeyHash < MockPoseidon.P, "ONKH out of field");
        require(noteSecretSeedHash < MockPoseidon.P, "NSSH out of field");
        require(policySetCommitment < MockPoseidon.P, "PSC out of field");
        require(ownerNullifierKeyHash != 0 && ownerNullifierKeyHash != DUMMY_OWNER_NULLIFIER_KEY_HASH, "Invalid ONKH");
        require(noteSecretSeedHash != 0, "NSSH is zero");
        UserEntry storage entry = userEntries[msg.sender];
        if (entry.leafPosition == 0) {
            require(ownerNullifierKeyHashIndex[ownerNullifierKeyHash] == address(0), "ONKH already registered");
            require(nextLeafPosition < 2**32, "Leaf position overflow");
            leafPosition = nextLeafPosition; nextLeafPosition++;
            entry.leafPosition = uint32(leafPosition);
            entry.ownerNullifierKeyHash = ownerNullifierKeyHash;
            entry.noteSecretSeedHash = noteSecretSeedHash;
            entry.policySetCommitment = policySetCommitment;
            ownerNullifierKeyHashIndex[ownerNullifierKeyHash] = msg.sender;
        } else {
            leafPosition = entry.leafPosition;
            require(entry.ownerNullifierKeyHash == ownerNullifierKeyHash, "ONKH is immutable");
            entry.noteSecretSeedHash = noteSecretSeedHash;
            entry.policySetCommitment = policySetCommitment;
        }
        uint256 leafValue = MockPoseidon.poseidon5(AUTH_POLICY_DOMAIN, uint160(msg.sender), ownerNullifierKeyHash, noteSecretSeedHash, policySetCommitment);
        require(leafValue != 0, "Leaf value is zero");
        _recordAuthPolicyRoot();
        authPolicyRegistryTree[leafPosition] = leafValue;
        emit AuthPolicySet(msg.sender, ownerNullifierKeyHash, noteSecretSeedHash, policySetCommitment, leafPosition, leafValue, _getCurrentAuthPolicyRoot());
    }

    function getCurrentRoots() external view returns (uint256 noteCommitmentRoot, uint256 authPolicyRoot) {
        return (_getCurrentNoteCommitmentRoot(), _getCurrentAuthPolicyRoot());
    }
    function isAcceptedNoteCommitmentRoot(uint256 root) external view returns (bool) { return _isAcceptedNoteCommitmentRoot(root); }
    function isAcceptedAuthPolicyRoot(uint256 root) external view returns (bool) { return _isAcceptedAuthPolicyRoot(root); }
    function getAuthPolicyEntry(address user) external view returns (bool registered, UserEntry memory entry) {
        entry = userEntries[user]; registered = (entry.leafPosition != 0);
        if (!registered) entry = UserEntry(0, 0, 0, 0);
    }

    function _getCurrentNoteCommitmentRoot() internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(noteCommitments, nextLeafIndex))); // [sic: encodePacked on a mapping — invalid]
    }
    function _isAcceptedNoteCommitmentRoot(uint256 root) internal view returns (bool) {
        if (root == _getCurrentNoteCommitmentRoot()) return true;
        for (uint i = 0; i < noteCommitmentRootHistory.length; i++) { if (noteCommitmentRootHistory[i] == root) return true; }
        return false;
    }
    function _getCurrentAuthPolicyRoot() internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(authPolicyRegistryTree, nextLeafPosition))); // [sic: same issue]
    }
    function _isAcceptedAuthPolicyRoot(uint256 root) internal view returns (bool) {
        if (root == 0) return false;
        if (root == _getCurrentAuthPolicyRoot()) return true;
        for (uint i = 0; i < authPolicyRootHistory.length; i++) {
            if (authPolicyRootHistory[i].root == root) {
                if (block.number - authPolicyRootHistory[i].blockNumber <= AUTH_POLICY_ROOT_HISTORY_BLOCKS) return true;
            }
        }
        return false;
    }
    function _recordAuthPolicyRoot() internal {
        uint256 currentIndex = block.number % (AUTH_POLICY_ROOT_HISTORY_BLOCKS + 1);
        if (authPolicyRootHistory[currentIndex].blockNumber == 0 || authPolicyRootHistory[currentIndex].blockNumber != block.number) {
            authPolicyRootHistory[currentIndex] = RootHistoryEntry(_getCurrentAuthPolicyRoot(), block.number);
        }
    }
}
```

### FILE: contracts/library/MockPoseidon.sol

```solidity
// SPDX-License-Identifier: EVVM-NONCOMMERCIAL-1.0
pragma solidity 0.8.30;

library MockPoseidon {
    uint256 public constant P = 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001; // BN254 scalar field
    function poseidon2(bytes32 domain, uint256 a, uint256 b) internal pure returns (uint256) { return uint256(keccak256(abi.encodePacked(domain, a, b))) % P; }
    function poseidon3(bytes32 domain, uint256 a, uint256 b, uint256 c) internal pure returns (uint256) { return uint256(keccak256(abi.encodePacked(domain, a, b, c))) % P; }
    function poseidon4(bytes32 domain, uint256 a, uint256 b, uint256 c, uint256 d) internal pure returns (uint256) { return uint256(keccak256(abi.encodePacked(domain, a, b, c, d))) % P; }
    function poseidon5(bytes32 domain, uint256 a, uint256 b, uint256 c, uint256 d, uint256 e) internal pure returns (uint256) { return uint256(keccak256(abi.encodePacked(domain, a, b, c, d, e))) % P; }
}
```

### FILE: contracts/library/MockGroth16Verifier.sol

```solidity
// SPDX-License-Identifier: EVVM-NONCOMMERCIAL-1.0
pragma solidity 0.8.30;

contract MockGroth16Verifier {
    bool public verdict;
    address public owner;
    constructor() { owner = msg.sender; }
    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }
    function setVerdict(bool _verdict) external onlyOwner { verdict = _verdict; }
    function verifyProof(bytes memory, uint256[] memory) public view returns (bool) { return verdict; }
}
```

### FILE: contracts/library/IAuthVerifier.sol

```solidity
// SPDX-License-Identifier: EVVM-NONCOMMERCIAL-1.0
pragma solidity 0.8.30;

interface IAuthVerifier {
    function verifyAuth(bytes calldata publicInputs, bytes calldata proof) external returns (bool);
}
```

### FILE: contracts/library/MockECDSAVerifier.sol

```solidity
// SPDX-License-Identifier: EVVM-NONCOMMERCIAL-1.0
pragma solidity 0.8.30;

import "./IAuthVerifier.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract MockECDSAVerifier is IAuthVerifier {
    using ECDSA for bytes32;
    function verifyAuth(bytes calldata publicInputs, bytes calldata proof) external view returns (bool) {
        (bytes32 digest, bytes memory signature) = abi.decode(proof, (bytes32, bytes));
        address signer = digest.recover(signature);
        return signer != address(0); // Simplified
    }
}
```

### FILE: justification.md

Shape B rationale; dependency strategy (Poseidon mock, Groth16
admin-gated mock, auth verifiers mock/vendor with an ECDSA demo, Merkle
inline, ECDSA vendor); technical decisions (notably: chose direct
ERC-20/ETH movement rather than `Core.pay`/`caPay`, documented as a
deliberate divergence with a path to integrate later); all EIP events
emitted; constants/domains included even when mocked. Scope: logic
testing only — not real SNARK/privacy/production Merkle.
