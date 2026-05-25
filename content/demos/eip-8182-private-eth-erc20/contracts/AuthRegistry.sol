// SPDX-License-Identifier: EVVM-NONCOMMERCIAL-1.0
pragma solidity 0.8.30;

import {EvvmService} from "../../library/EvvmService.sol";
import {IMockPoseidon} from "./MockPoseidon.sol";

/**
 * @title AuthRegistry — EIP-8182 §6 (auth-policy registry tree)
 * @notice Owns the depth-32 sparse mutable Poseidon Merkle tree
 *         keyed by `leafPosition`, per-user identity bindings, and
 *         block-based root history.
 *
 *         Split out of ShieldedPool for review clarity; the
 *         registry has its own lifecycle (rotation, deactivation,
 *         root-history aging) independent of note spending.
 *
 *         Limitations:
 *         - Tree hashes use MockPoseidon (keccak-based), NOT real
 *           Poseidon2. Circuit-generated roots will not match.
 *         - The depth-32 sparse tree is conceptually stored as
 *           `mapping(uint256 => uint256)` per level; in this demo we
 *           store leaves only and recompute the root lazily on each
 *           mutation (simple, not gas-optimal).
 */

interface IAuthRegistry {
    struct UserEntry {
        uint32 leafPosition;
        uint256 ownerNullifierKeyHash;
        uint256 noteSecretSeedHash;
        uint256 policySetCommitment;
    }

    function setAuthPolicy(
        uint256 ownerNullifierKeyHash,
        uint256 noteSecretSeedHash,
        uint256 policySetCommitment
    ) external returns (uint256 leafPosition);

    function getCurrentAuthPolicyRoot() external view returns (uint256);
    function isAcceptedAuthPolicyRoot(uint256 root) external view returns (bool);
    function getAuthPolicyEntry(address user)
        external
        view
        returns (bool registered, UserEntry memory entry);
}

contract AuthRegistry is EvvmService, IAuthRegistry {

    // ──────────────────────────────────────────────────────────────────
    // Constants per EIP §3
    // ──────────────────────────────────────────────────────────────────

    /// @notice Tree depth — fixed by EIP §3.4.
    uint256 internal constant TREE_DEPTH = 32;

    /// @notice Block-window root-history size per EIP §3.2.
    uint256 internal constant AUTH_POLICY_ROOT_HISTORY_BLOCKS = 64;

    /// @notice DUMMY_OWNER_NULLIFIER_KEY_HASH per EIP §3.2.
    uint256 internal constant DUMMY_OWNER_NULLIFIER_KEY_HASH =
        uint256(keccak256("eip-8182.owner_nullifier_key_hash.dummy"))
            % 0x30644E72E131A029B85045B68181585D2833E84879B9709143E1F593F0000001;

    /// @notice Domain separator for the AUTH_POLICY_DOMAIN per EIP §3.1.
    uint256 internal constant AUTH_POLICY_DOMAIN =
        uint256(keccak256("eip-8182.auth_policy"))
            % 0x30644E72E131A029B85045B68181585D2833E84879B9709143E1F593F0000001;

    /// @notice BN254 scalar field order. All inputs must be < p.
    uint256 internal constant BN254_FIELD_ORDER =
        0x30644E72E131A029B85045B68181585D2833E84879B9709143E1F593F0000001;

    // ──────────────────────────────────────────────────────────────────
    // Storage per EIP §5.2 + §6.1
    // ──────────────────────────────────────────────────────────────────

    IMockPoseidon public immutable poseidon;

    /// @dev address => UserEntry. leafPosition == 0 means unassigned.
    mapping(address => UserEntry) internal _userEntries;

    /// @dev ownerNullifierKeyHash => address. address(0) = unregistered.
    ///      Enforces global one-address-per-keyHash.
    mapping(uint256 => address) public ownerNullifierKeyHashIndex;

    /// @dev Sequentially assigned. Slot 0 reserved as "unassigned" sentinel.
    uint256 public nextLeafPosition = 1;

    /// @dev Current root of the depth-32 sparse Poseidon Merkle tree.
    uint256 public currentRoot;

    /// @dev leafPosition => leafValue. The sparse-tree backing store.
    ///      Empty slots are zero (matches EIP "Empty leaf = 0").
    mapping(uint256 => uint256) public leafValues;

    // Block-based root history per EIP §5.2.1
    struct RootSnapshot {
        uint256 root;
        uint256 blockNumber;
    }
    /// @dev Ring buffer of W + 1 (root, blockNumber) pairs.
    RootSnapshot[AUTH_POLICY_ROOT_HISTORY_BLOCKS + 1] internal _rootHistory;
    /// @dev Block in which we last took a snapshot (used to detect
    ///      same-block mutations that should NOT create new history).
    uint256 internal _lastSnapshotBlock;

    // ──────────────────────────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────────────────────────

    event AuthPolicySet(
        address indexed user,
        uint256 ownerNullifierKeyHash,
        uint256 noteSecretSeedHash,
        uint256 policySetCommitment,
        uint256 leafPosition,
        uint256 leafValue,
        uint256 postUpdateAuthPolicyRoot
    );

    // ──────────────────────────────────────────────────────────────────
    // Errors
    // ──────────────────────────────────────────────────────────────────

    error InvalidScalarField();
    error InvalidOwnerNullifierKeyHash();
    error InvalidNoteSecretSeedHash();
    error KeyHashAlreadyClaimed();
    error LeafPositionExhausted();
    error OwnerNullifierKeyHashMismatch();
    error LeafValueIsZero();

    // ──────────────────────────────────────────────────────────────────
    // Construction
    // ──────────────────────────────────────────────────────────────────

    constructor(address _core, address _staking, address _poseidon)
        EvvmService(_core, _staking)
    {
        require(_poseidon != address(0), "AuthRegistry: zero poseidon");
        poseidon = IMockPoseidon(_poseidon);
        // Initialize root to empty depth-32 tree root.
        currentRoot = _emptyTreeRoot();
        _rootHistory[0] = RootSnapshot({
            root: currentRoot,
            blockNumber: block.number
        });
        _lastSnapshotBlock = block.number;
    }

    // ──────────────────────────────────────────────────────────────────
    // setAuthPolicy per EIP §5.3 "Auth-policy registration"
    // ──────────────────────────────────────────────────────────────────

    function setAuthPolicy(
        uint256 ownerNullifierKeyHash,
        uint256 noteSecretSeedHash,
        uint256 policySetCommitment
    ) external override returns (uint256 leafPosition) {
        // Range checks per EIP §3.5.
        if (
            ownerNullifierKeyHash >= BN254_FIELD_ORDER ||
            noteSecretSeedHash >= BN254_FIELD_ORDER ||
            policySetCommitment >= BN254_FIELD_ORDER
        ) revert InvalidScalarField();

        if (
            ownerNullifierKeyHash == 0 ||
            ownerNullifierKeyHash == DUMMY_OWNER_NULLIFIER_KEY_HASH
        ) revert InvalidOwnerNullifierKeyHash();
        if (noteSecretSeedHash == 0) revert InvalidNoteSecretSeedHash();

        UserEntry storage entry = _userEntries[msg.sender];

        if (entry.leafPosition == 0) {
            // First call from this address — assign a fresh slot.
            if (ownerNullifierKeyHashIndex[ownerNullifierKeyHash] != address(0))
                revert KeyHashAlreadyClaimed();
            if (nextLeafPosition >= (1 << 32)) revert LeafPositionExhausted();
            leafPosition = nextLeafPosition;
            unchecked { nextLeafPosition += 1; }

            entry.leafPosition = uint32(leafPosition);
            entry.ownerNullifierKeyHash = ownerNullifierKeyHash;
            entry.noteSecretSeedHash = noteSecretSeedHash;
            entry.policySetCommitment = policySetCommitment;
            ownerNullifierKeyHashIndex[ownerNullifierKeyHash] = msg.sender;
        } else {
            // Subsequent call — owner-key is immutable, only mutable
            // fields can rotate (per EIP §6.1 "Mutable fields").
            leafPosition = entry.leafPosition;
            if (entry.ownerNullifierKeyHash != ownerNullifierKeyHash) {
                revert OwnerNullifierKeyHashMismatch();
            }
            entry.noteSecretSeedHash = noteSecretSeedHash;
            entry.policySetCommitment = policySetCommitment;
        }

        // Compute the leaf hash: poseidon(AUTH_POLICY_DOMAIN, user,
        // ownerNullifierKeyHash, noteSecretSeedHash, policySetCommitment).
        uint256 leafValue = poseidon.poseidon5(
            AUTH_POLICY_DOMAIN,
            uint256(uint160(msg.sender)),
            ownerNullifierKeyHash,
            noteSecretSeedHash,
            policySetCommitment
        );
        if (leafValue == 0) revert LeafValueIsZero();

        // Snapshot prior root into history before mutating.
        _maybeSnapshot();

        // Write the leaf and recompute the root.
        leafValues[leafPosition] = leafValue;
        currentRoot = _recomputeRoot();

        emit AuthPolicySet(
            msg.sender,
            ownerNullifierKeyHash,
            noteSecretSeedHash,
            policySetCommitment,
            leafPosition,
            leafValue,
            currentRoot
        );
    }

    // ──────────────────────────────────────────────────────────────────
    // Root history per EIP §5.2.1
    // ──────────────────────────────────────────────────────────────────

    function _maybeSnapshot() internal {
        // First mutation in a new block: snapshot the prior root.
        // Subsequent same-block mutations: no new history entry.
        if (block.number > _lastSnapshotBlock) {
            uint256 slot =
                block.number % (AUTH_POLICY_ROOT_HISTORY_BLOCKS + 1);
            _rootHistory[slot] = RootSnapshot({
                root: currentRoot,
                blockNumber: block.number
            });
            _lastSnapshotBlock = block.number;
        }
    }

    function getCurrentAuthPolicyRoot()
        external
        view
        override
        returns (uint256)
    {
        return currentRoot;
    }

    function isAcceptedAuthPolicyRoot(uint256 root)
        external
        view
        override
        returns (bool)
    {
        if (root == 0) return false; // per EIP §5.2.1
        if (root == currentRoot) return true;
        // Check ring buffer for a non-stale entry.
        for (uint256 i = 0; i <= AUTH_POLICY_ROOT_HISTORY_BLOCKS; i++) {
            RootSnapshot storage s = _rootHistory[i];
            if (
                s.root == root &&
                block.number - s.blockNumber <= AUTH_POLICY_ROOT_HISTORY_BLOCKS
            ) {
                return true;
            }
        }
        return false;
    }

    function getAuthPolicyEntry(address user)
        external
        view
        override
        returns (bool registered, UserEntry memory entry)
    {
        entry = _userEntries[user];
        registered = entry.leafPosition != 0;
        if (!registered) entry = UserEntry(0, 0, 0, 0);
    }

    // ──────────────────────────────────────────────────────────────────
    // Internal: tree root recomputation
    // ──────────────────────────────────────────────────────────────────

    /// @dev Demo implementation: recomputes the root from all stored
    ///      leaves on every mutation. O(n × depth) per mutation; fine
    ///      for tests with hundreds of entries, NOT fine for production.
    ///      Production should maintain incremental Merkle state per
    ///      level and update only the affected path.
    function _recomputeRoot() internal view returns (uint256 root) {
        // For the demo, we hash all non-empty leaves into a single
        // commitment; this gives a deterministic root but is not a
        // depth-32 Merkle root structurally. Researchers replacing
        // MockPoseidon with a real Poseidon must also swap this for
        // a real Merkle update routine.
        uint256 n = nextLeafPosition;
        if (n <= 1) return _emptyTreeRoot();
        uint256 acc = 0;
        for (uint256 i = 1; i < n; i++) {
            uint256 leaf = leafValues[i];
            if (leaf != 0) {
                acc = poseidon.poseidon2(acc, leaf);
            }
        }
        return acc == 0 ? _emptyTreeRoot() : acc;
    }

    function _emptyTreeRoot() internal view returns (uint256) {
        // Empty depth-32 sparse tree root: EMPTY[32] in the
        // EMPTY ladder defined in EIP §3.4.
        // Per the EIP, EMPTY[0] = 0 and EMPTY[i+1] = poseidon(EMPTY[i], EMPTY[i]).
        // We compute it iteratively.
        uint256 v = 0;
        for (uint256 i = 0; i < TREE_DEPTH; i++) {
            v = poseidon.poseidon2(v, v);
        }
        return v;
    }
}
