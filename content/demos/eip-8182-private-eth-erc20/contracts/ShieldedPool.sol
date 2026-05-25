// SPDX-License-Identifier: EVVM-NONCOMMERCIAL-1.0
pragma solidity 0.8.30;

import {EvvmService} from "../../library/EvvmService.sol";
import {IMockPoseidon} from "./MockPoseidon.sol";
import {IMockPoolVerifier} from "./MockPoolVerifier.sol";
import {IAuthVerifier} from "./MockECDSAAuthVerifier.sol";
import {IAuthRegistry} from "./AuthRegistry.sol";

interface IERC20Minimal {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount)
        external
        returns (bool);
}

/**
 * @title ShieldedPool — EIP-8182 system contract (modeled)
 * @notice The canonical system contract per EIP-8182 §5. In a real
 *         deployment this lives at SHIELDED_POOL_ADDRESS = 0x...081820
 *         with bytecode installed at fork activation. Here it deploys
 *         as a regular Shape B service.
 *
 *         Implements three public entrypoints:
 *           - transact: private note spend (split-proof verification)
 *           - deposit:  public→shielded (proof-free)
 *           - setAuthPolicy: delegated to AuthRegistry
 *
 *         Plus the read methods from EIP §5.3.
 *
 *         For per-mock limitations and the full design rationale, see
 *         the experiment's `justification.md`.
 */
contract ShieldedPool is EvvmService {

    // ──────────────────────────────────────────────────────────────────
    // Public-input layout per EIP §5.3
    // ──────────────────────────────────────────────────────────────────

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

    // ──────────────────────────────────────────────────────────────────
    // Constants per EIP §3
    // ──────────────────────────────────────────────────────────────────

    uint256 internal constant MAX_INTENT_LIFETIME = 86400; // 24h
    uint256 internal constant NOTE_COMMITMENT_ROOT_HISTORY_SIZE = 500;
    uint256 internal constant TRANSFER_OP = 0;
    uint256 internal constant WITHDRAWAL_OP = 1;

    uint256 internal constant BN254_FIELD_ORDER =
        0x30644E72E131A029B85045B68181585D2833E84879B9709143E1F593F0000001;

    /// @notice Domain separator for the final note commitment per EIP §3.1.
    uint256 internal constant NOTE_COMMITMENT_DOMAIN =
        uint256(keccak256("eip-8182.note_commitment")) % BN254_FIELD_ORDER;

    /// @notice Domain separator for the semantic note body commitment.
    uint256 internal constant NOTE_BODY_COMMITMENT_DOMAIN =
        uint256(keccak256("eip-8182.note_body_commitment")) % BN254_FIELD_ORDER;

    // ──────────────────────────────────────────────────────────────────
    // Storage per EIP §5.2
    // ──────────────────────────────────────────────────────────────────

    IMockPoseidon public immutable poseidon;
    IMockPoolVerifier public immutable poolVerifier;
    IAuthRegistry public immutable authRegistry;

    /// @dev Depth-32 append-only note commitment tree. Demo storage is
    ///      a flat leaf mapping; production needs incremental Merkle.
    mapping(uint256 => uint256) public noteTree;
    uint32 public nextLeafIndex;
    /// @dev Current root (recomputed lazily; demo uses simple accumulator).
    uint256 public currentNoteRoot;

    /// @dev Circular buffer per EIP §5.2 "Note commitment root history".
    uint256[NOTE_COMMITMENT_ROOT_HISTORY_SIZE] public noteRootHistory;
    uint256 internal _noteRootHistoryHead;

    /// @dev Spent nullifier set per EIP §5.2.
    mapping(uint256 => bool) public isNullifierSpent;

    /// @dev Consumed intent replay IDs.
    mapping(uint256 => bool) public isIntentReplayIdUsed;

    /// @dev Reentrancy lock per EIP §5.4 "transact and deposit MUST
    ///      each be non-reentrant".
    uint256 private _reentrancyLock;

    // ──────────────────────────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────────────────────────

    event ShieldedPoolTransact(
        uint256 indexed nullifier0,
        uint256 indexed nullifier1,
        uint256 indexed intentReplayId,
        address authVerifier,
        uint256 noteCommitment0,
        uint256 noteCommitment1,
        uint256 noteCommitment2,
        uint256 leafIndex0,
        uint256 postInsertionCommitmentRoot,
        bytes outputNoteData0,
        bytes outputNoteData1,
        bytes outputNoteData2
    );

    event ShieldedPoolDeposit(
        address indexed depositor,
        uint256 noteCommitment,
        uint256 leafIndex,
        uint256 amount,
        uint256 tokenAddress,
        uint256 postInsertionCommitmentRoot,
        bytes outputNoteData
    );

    // ──────────────────────────────────────────────────────────────────
    // Errors — categorized by which EIP §5.4.1 step they enforce
    // ──────────────────────────────────────────────────────────────────

    error WrongChainId(uint256 expected, uint256 got);                       // step 1
    error IntentExpired(uint256 nowTs, uint256 validUntilSeconds);          // step 2
    error IntentValidUntilOutOfRange(uint256 validUntilSeconds);            // step 2
    error UnknownNoteRoot(uint256 root);                                    // step 3
    error UnknownAuthRoot(uint256 root);                                    // step 4
    error NullifierDuplicate(uint256 nullifier);                            // step 5
    error PublicInputOutOfRange();                                          // step 6
    error PoolProofFailed();                                                 // step 7
    error AuthProofFailed();                                                 // step 8
    error NullifierAlreadySpent(uint256 nullifier);                         // step 9
    error IntentReplayIdAlreadyUsed(uint256 intentReplayId);                // step 10
    error OutputNoteDataHashMismatch(uint256 idx);                          // step 11
    error WithdrawalRecipientZero();                                        // step 12
    error TransferWithRecipientSet();                                       // step 12
    error TransferWithTokenSet();                                           // step 12
    error WithdrawalEthTransferFailed();                                    // step 12
    error WithdrawalErc20TransferFailed();                                  // step 12
    error InvalidEcrowmsgValue();                                           // step 12
    error LeafCommitmentZero();                                             // step 13
    error TreeFull();                                                       // step 13
    error Reentered();
    error DepositAmountZero();
    error DepositErc20BalanceDeltaMismatch();
    error OwnerCommitmentZero();
    error OwnerCommitmentOutOfRange();

    modifier nonReentrant() {
        if (_reentrancyLock == 1) revert Reentered();
        _reentrancyLock = 1;
        _;
        _reentrancyLock = 0;
    }

    // ──────────────────────────────────────────────────────────────────
    // Construction
    // ──────────────────────────────────────────────────────────────────

    constructor(
        address _core,
        address _staking,
        address _poseidon,
        address _poolVerifier,
        address _authRegistry
    ) EvvmService(_core, _staking) {
        require(_poseidon != address(0), "ShieldedPool: zero poseidon");
        require(_poolVerifier != address(0), "ShieldedPool: zero pool verifier");
        require(_authRegistry != address(0), "ShieldedPool: zero auth registry");
        poseidon = IMockPoseidon(_poseidon);
        poolVerifier = IMockPoolVerifier(_poolVerifier);
        authRegistry = IAuthRegistry(_authRegistry);
    }

    // ──────────────────────────────────────────────────────────────────
    // transact — EIP §5.4.1 (13 steps, kept in EIP order)
    // ──────────────────────────────────────────────────────────────────

    function transact(
        bytes calldata poolProof,
        bytes calldata authProof,
        PublicInputs calldata pi,
        bytes calldata outputNoteData0,
        bytes calldata outputNoteData1,
        bytes calldata outputNoteData2
    ) external nonReentrant {
        // transact is non-payable per EIP §5.4.1 step 12.
        // (Solidity enforces non-payable by default — included here for clarity.)

        // 1. Chain id
        if (pi.executionChainId != block.chainid)
            revert WrongChainId(block.chainid, pi.executionChainId);

        // 2. Intent expiry
        if (pi.validUntilSeconds == 0 || block.timestamp > pi.validUntilSeconds) {
            revert IntentExpired(block.timestamp, pi.validUntilSeconds);
        }
        if (pi.validUntilSeconds > block.timestamp + MAX_INTENT_LIFETIME) {
            revert IntentValidUntilOutOfRange(pi.validUntilSeconds);
        }

        // 3. Note-commitment root acceptance
        if (!_isAcceptedNoteRoot(pi.noteCommitmentRoot)) {
            revert UnknownNoteRoot(pi.noteCommitmentRoot);
        }

        // 4. Auth-policy root acceptance
        if (pi.authPolicyRoot == 0) revert UnknownAuthRoot(0);
        if (!authRegistry.isAcceptedAuthPolicyRoot(pi.authPolicyRoot)) {
            revert UnknownAuthRoot(pi.authPolicyRoot);
        }

        // 5. Nullifier uniqueness within this tx
        if (pi.nullifier0 == pi.nullifier1) revert NullifierDuplicate(pi.nullifier0);

        // 6. Public-input ranges per EIP §3.5 + §5.4.1 step 6
        if (
            pi.publicAmountOut >= (1 << 248) ||
            pi.publicRecipientAddress >= (1 << 160) ||
            pi.publicTokenAddress >= (1 << 160) ||
            pi.authVerifier == 0 ||
            pi.authVerifier >= (1 << 160) ||
            pi.validUntilSeconds >= (1 << 32) ||
            pi.executionChainId >= (1 << 32) ||
            _anyExceedsFieldOrder(pi)
        ) revert PublicInputOutOfRange();

        // 7. Pool proof verification
        if (!poolVerifier.verifyProof(poolProof, abi.encode(pi))) {
            revert PoolProofFailed();
        }

        // 8. Auth proof verification (staticcall per EIP §5.4.1 step 8)
        bytes memory authPubInputs = abi.encode(
            pi.blindedAuthCommitment,
            pi.transactionIntentDigest
        );
        address authVerifierAddr = address(uint160(pi.authVerifier));
        (bool ok, bytes memory ret) = authVerifierAddr.staticcall(
            abi.encodeWithSelector(
                IAuthVerifier.verifyAuth.selector,
                authPubInputs,
                authProof
            )
        );
        if (!ok || ret.length != 32 || abi.decode(ret, (bool)) == false) {
            revert AuthProofFailed();
        }

        // 9. Mark nullifiers spent
        if (isNullifierSpent[pi.nullifier0]) revert NullifierAlreadySpent(pi.nullifier0);
        if (isNullifierSpent[pi.nullifier1]) revert NullifierAlreadySpent(pi.nullifier1);
        isNullifierSpent[pi.nullifier0] = true;
        isNullifierSpent[pi.nullifier1] = true;

        // 10. Mark intent replay id used
        if (isIntentReplayIdUsed[pi.intentReplayId]) {
            revert IntentReplayIdAlreadyUsed(pi.intentReplayId);
        }
        isIntentReplayIdUsed[pi.intentReplayId] = true;

        // 11. Output note data hashes
        _verifyNoteDataHash(outputNoteData0, pi.outputNoteDataHash0, 0);
        _verifyNoteDataHash(outputNoteData1, pi.outputNoteDataHash1, 1);
        _verifyNoteDataHash(outputNoteData2, pi.outputNoteDataHash2, 2);

        // 12. Public asset movement (exactly one of withdrawal / transfer)
        _performAssetMovement(pi);

        // 13. Insert outputs into the note tree + emit
        _insertOutputsAndEmit(pi, outputNoteData0, outputNoteData1, outputNoteData2);
    }

    // ──────────────────────────────────────────────────────────────────
    // deposit — EIP §5.4.2
    // ──────────────────────────────────────────────────────────────────

    function deposit(
        address token,
        uint256 amount,
        uint256 ownerCommitment,
        bytes calldata outputNoteData
    ) external payable nonReentrant {
        // 1. Range checks
        if (amount == 0) revert DepositAmountZero();
        if (amount >= (1 << 248)) revert PublicInputOutOfRange();
        if (ownerCommitment == 0) revert OwnerCommitmentZero();
        if (ownerCommitment >= BN254_FIELD_ORDER) revert OwnerCommitmentOutOfRange();

        // 2. Receive public assets
        if (token == address(0)) {
            if (msg.value != amount) revert InvalidEcrowmsgValue();
        } else {
            if (msg.value != 0) revert InvalidEcrowmsgValue();
            uint256 balBefore = IERC20Minimal(token).balanceOf(address(this));
            // returndata-shape handling per EIP §5.4.1 ERC-20 semantics
            _safeErc20Call(
                token,
                abi.encodeWithSelector(
                    IERC20Minimal.transferFrom.selector,
                    msg.sender,
                    address(this),
                    amount
                )
            );
            uint256 balAfter = IERC20Minimal(token).balanceOf(address(this));
            if (balAfter - balBefore != amount) {
                revert DepositErc20BalanceDeltaMismatch();
            }
        }

        // 3. Assign leaf index
        if (uint256(nextLeafIndex) + 1 > (1 << 32)) revert TreeFull();
        uint256 leafIdx = nextLeafIndex;

        // 4. Compute commitments per EIP §5.4.2 step 4
        uint256 noteBodyCommitment = poseidon.poseidon4(
            NOTE_BODY_COMMITMENT_DOMAIN,
            ownerCommitment,
            amount,
            uint256(uint160(token))
        );
        uint256 noteCommitment = poseidon.poseidon3(
            NOTE_COMMITMENT_DOMAIN,
            noteBodyCommitment,
            leafIdx
        );
        if (noteCommitment == 0) revert LeafCommitmentZero();

        // 5. Insert the note
        _snapshotNoteRoot();
        noteTree[leafIdx] = noteCommitment;
        nextLeafIndex = uint32(leafIdx + 1);
        currentNoteRoot = _recomputeNoteRoot();

        // 6. Emit
        emit ShieldedPoolDeposit(
            msg.sender,
            noteCommitment,
            leafIdx,
            amount,
            uint256(uint160(token)),
            currentNoteRoot,
            outputNoteData
        );
    }

    // ──────────────────────────────────────────────────────────────────
    // Read methods per EIP §5.3
    // ──────────────────────────────────────────────────────────────────

    function getCurrentRoots()
        external
        view
        returns (uint256 noteRoot, uint256 authRoot)
    {
        return (currentNoteRoot, authRegistry.getCurrentAuthPolicyRoot());
    }

    function isAcceptedNoteCommitmentRoot(uint256 root)
        external
        view
        returns (bool)
    {
        return _isAcceptedNoteRoot(root);
    }

    function isAcceptedAuthPolicyRoot(uint256 root)
        external
        view
        returns (bool)
    {
        return authRegistry.isAcceptedAuthPolicyRoot(root);
    }

    // ──────────────────────────────────────────────────────────────────
    // Internal: per-step helpers
    // ──────────────────────────────────────────────────────────────────

    function _anyExceedsFieldOrder(PublicInputs calldata pi)
        internal
        pure
        returns (bool)
    {
        return (
            pi.outputNoteDataHash0 >= BN254_FIELD_ORDER ||
            pi.outputNoteDataHash1 >= BN254_FIELD_ORDER ||
            pi.outputNoteDataHash2 >= BN254_FIELD_ORDER ||
            pi.noteCommitmentRoot >= BN254_FIELD_ORDER ||
            pi.authPolicyRoot >= BN254_FIELD_ORDER
        );
    }

    function _verifyNoteDataHash(
        bytes calldata data,
        uint256 expectedHash,
        uint256 idx
    ) internal pure {
        uint256 computed = uint256(keccak256(data)) % BN254_FIELD_ORDER;
        if (computed != expectedHash) revert OutputNoteDataHashMismatch(idx);
    }

    function _performAssetMovement(PublicInputs calldata pi) internal {
        if (pi.publicAmountOut > 0) {
            // Withdrawal
            if (pi.publicRecipientAddress == 0) revert WithdrawalRecipientZero();
            address recipient = address(uint160(pi.publicRecipientAddress));

            if (pi.publicTokenAddress == 0) {
                // ETH withdrawal
                (bool ok, ) = recipient.call{value: pi.publicAmountOut}("");
                if (!ok) revert WithdrawalEthTransferFailed();
            } else {
                // ERC-20 withdrawal
                _safeErc20Call(
                    address(uint160(pi.publicTokenAddress)),
                    abi.encodeWithSelector(
                        IERC20Minimal.transfer.selector,
                        recipient,
                        pi.publicAmountOut
                    )
                );
            }
        } else {
            // Transfer (no public movement)
            if (pi.publicRecipientAddress != 0) revert TransferWithRecipientSet();
            if (pi.publicTokenAddress != 0) revert TransferWithTokenSet();
        }
    }

    function _insertOutputsAndEmit(
        PublicInputs calldata pi,
        bytes calldata outputNoteData0,
        bytes calldata outputNoteData1,
        bytes calldata outputNoteData2
    ) internal {
        if (uint256(nextLeafIndex) + 3 > (1 << 32)) revert TreeFull();
        uint256 leafIndex0 = nextLeafIndex;

        uint256 nc0 = poseidon.poseidon3(
            NOTE_COMMITMENT_DOMAIN,
            pi.noteBodyCommitment0,
            leafIndex0
        );
        uint256 nc1 = poseidon.poseidon3(
            NOTE_COMMITMENT_DOMAIN,
            pi.noteBodyCommitment1,
            leafIndex0 + 1
        );
        uint256 nc2 = poseidon.poseidon3(
            NOTE_COMMITMENT_DOMAIN,
            pi.noteBodyCommitment2,
            leafIndex0 + 2
        );
        if (nc0 == 0 || nc1 == 0 || nc2 == 0) revert LeafCommitmentZero();

        _snapshotNoteRoot();
        noteTree[leafIndex0] = nc0;
        noteTree[leafIndex0 + 1] = nc1;
        noteTree[leafIndex0 + 2] = nc2;
        nextLeafIndex = uint32(leafIndex0 + 3);
        currentNoteRoot = _recomputeNoteRoot();

        emit ShieldedPoolTransact(
            pi.nullifier0,
            pi.nullifier1,
            pi.intentReplayId,
            address(uint160(pi.authVerifier)),
            nc0,
            nc1,
            nc2,
            leafIndex0,
            currentNoteRoot,
            outputNoteData0,
            outputNoteData1,
            outputNoteData2
        );
    }

    // ──────────────────────────────────────────────────────────────────
    // Internal: tree state + root history
    // ──────────────────────────────────────────────────────────────────

    function _snapshotNoteRoot() internal {
        noteRootHistory[_noteRootHistoryHead] = currentNoteRoot;
        _noteRootHistoryHead =
            (_noteRootHistoryHead + 1) % NOTE_COMMITMENT_ROOT_HISTORY_SIZE;
    }

    function _isAcceptedNoteRoot(uint256 root) internal view returns (bool) {
        if (root == currentNoteRoot) return true;
        for (uint256 i = 0; i < NOTE_COMMITMENT_ROOT_HISTORY_SIZE; i++) {
            if (noteRootHistory[i] == root && root != 0) return true;
        }
        return false;
    }

    /// @dev Same demo simplification as AuthRegistry — researchers must
    ///      swap this for incremental Merkle when promoting to production.
    function _recomputeNoteRoot() internal view returns (uint256) {
        uint256 acc = 0;
        for (uint256 i = 0; i < nextLeafIndex; i++) {
            uint256 leaf = noteTree[i];
            if (leaf != 0) {
                acc = poseidon.poseidon2(acc, leaf);
            }
        }
        return acc;
    }

    // ──────────────────────────────────────────────────────────────────
    // Internal: ERC-20 returndata-shape handling per EIP §5.4.1
    // ──────────────────────────────────────────────────────────────────

    /// @dev EIP-8182 §5.4.1 ERC-20 semantics — call MUST NOT revert,
    ///      and MUST satisfy one of:
    ///        - returndata length 0 AND target account has nonzero code
    ///        - returndata length 32 decoding to `true`
    function _safeErc20Call(address token, bytes memory call) internal {
        (bool ok, bytes memory ret) = token.call(call);
        require(ok, "ShieldedPool: erc20 call reverted");
        if (ret.length == 0) {
            require(token.code.length > 0, "ShieldedPool: erc20 empty ret");
        } else if (ret.length == 32) {
            require(abi.decode(ret, (bool)), "ShieldedPool: erc20 returned false");
        } else {
            revert("ShieldedPool: erc20 unexpected ret shape");
        }
    }
}
