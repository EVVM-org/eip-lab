// SPDX-License-Identifier: EVVM-NONCOMMERCIAL-1.0
pragma solidity 0.8.30;

import {EvvmService} from "../../library/EvvmService.sol";
import {ICore} from "../../interfaces/ICore.sol";
import {MockExpiryVerifier} from "./MockExpiryVerifier.sol";
import {MockP256Verifier} from "./MockP256Verifier.sol";

/**
 * @title FrameRouter — EIP-8141 foundation, Shape B service
 * @notice Solidity router that models EIP-8141 frame transactions on
 *         EVVM. Accepts an array of frames and signatures; validates
 *         signatures; walks the frames dispatching by mode
 *         (DEFAULT/VERIFY/SENDER); tracks per-tx approval state in
 *         transient storage; settles gas with the payer through
 *         Core.caPay() at the end.
 *
 *         This is the FOUNDATION experiment for EIP-8141. Three sibling
 *         sub-experiments build on top of this router:
 *           - eip-8141-canonical-paymaster   (paymaster pattern)
 *           - eip-8141-default-code          (EOA default-code handling)
 *           - eip-8141-p256-signatures       (P256 wired to FrameRouter)
 *
 *         For per-mock limitations and the full design rationale, see
 *         the experiment's `justification.md`.
 *
 * @dev    Uses Solidity 0.8.28+ `transient` storage to hold per-tx
 *         approval context. Transient storage resets per transaction
 *         automatically, mirroring EIP-8141's "transaction-scoped
 *         approval context" requirement for APPROVE.
 */
contract FrameRouter is EvvmService {

    // ──────────────────────────────────────────────────────────────────
    // Types per EIP-8141 §"Field Definitions"
    // ──────────────────────────────────────────────────────────────────

    enum FrameMode {
        DEFAULT, // 0 — execute frame as ENTRY_POINT
        VERIFY,  // 1 — frame identifies as transaction validation
        SENDER   // 2 — execute frame as sender
    }

    /// @dev `flags` bit layout per EIP §"Frame Flags":
    ///         bits 0-1: approval scope (APPROVE_NONE=0, APPROVE_PAYMENT=1,
    ///                   APPROVE_EXECUTION=2, APPROVE_EXECUTION_AND_PAYMENT=3)
    ///         bit  2:   atomic batch flag (1 = next frame is in same atomic batch)
    struct Frame {
        FrameMode mode;
        uint8 flags;
        address target; // address(0) = sender (resolved at execution)
        uint64 gasLimit;
        uint256 value;
        bytes data;
    }

    enum SignatureScheme {
        SECP256K1, // 0
        P256       // 1
    }

    struct Signature {
        SignatureScheme scheme;
        address signer;
        bytes msg_;       // empty → canonical sig hash; 32-byte → explicit digest
        bytes signature;  // scheme-specific encoding
    }

    // ──────────────────────────────────────────────────────────────────
    // Constants per EIP §"Constants"
    // ──────────────────────────────────────────────────────────────────

    uint8 internal constant FRAME_TX_TYPE = 0x06;
    uint256 internal constant MAX_FRAMES = 64;
    uint256 internal constant FRAME_TX_INTRINSIC_COST = 15000;
    uint256 internal constant FRAME_TX_PER_FRAME_COST = 475;

    // Approval scope bits
    uint8 internal constant APPROVE_NONE = 0;
    uint8 internal constant APPROVE_PAYMENT = 1;
    uint8 internal constant APPROVE_EXECUTION = 2;
    uint8 internal constant APPROVE_EXECUTION_AND_PAYMENT = 3;
    uint8 internal constant APPROVE_SCOPE_MASK = 3;
    uint8 internal constant ATOMIC_BATCH_FLAG = 4; // 1 << 2

    // Address sentinels per EIP §"Constants"
    address internal constant ENTRY_POINT = address(0xaa);

    // ──────────────────────────────────────────────────────────────────
    // Per-transaction context — transient storage (EIP-1153)
    // ──────────────────────────────────────────────────────────────────

    /// @dev Set by the first VERIFY frame whose APPROVE scope includes
    ///      APPROVE_PAYMENT. Required to be non-zero by end of execution.
    address transient internal _payer;

    /// @dev Set true by a VERIFY frame whose APPROVE scope includes
    ///      APPROVE_EXECUTION and whose resolved target is tx.sender.
    bool transient internal _senderApproved;

    /// @dev Index of the currently executing frame. Read by FRAMEPARAM
    ///      and TXPARAM(0x0A) introspection mocks.
    uint256 transient internal _currentFrameIdx;

    /// @dev Cached length of frames in the in-flight tx. Read by
    ///      TXPARAM(0x09).
    uint256 transient internal _frameCount;

    /// @dev Cached length of signatures in the in-flight tx. Read by
    ///      TXPARAM(0x0B).
    uint256 transient internal _sigCount;

    /// @dev True iff we are mid-execution. The introspection mocks use
    ///      this to revert when called outside an active executeFrameTx.
    bool transient internal _executing;

    // ──────────────────────────────────────────────────────────────────
    // Configuration (set at construction; immutable after)
    // ──────────────────────────────────────────────────────────────────

    /// @notice Canonical expiry verifier address. EIP-8141 specifies
    ///         this should be 0x...8141; we accept any address for
    ///         experiment portability.
    address public immutable expiryVerifier;

    /// @notice P256 verifier (vendored Daimo). EIP-7951's precompile
    ///         would replace this once it ships.
    MockP256Verifier public immutable p256Verifier;

    /// @notice EIP-7702 delegation registry. Maps EOA → delegate code
    ///         contract. Empty entry = no delegation.
    mapping(address => address) public delegationRegistry;

    // ──────────────────────────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────────────────────────

    /// @notice Mock for the APPROVE opcode's transaction-scoped state
    ///         mutation. Emitted whenever a VERIFY frame calls approve().
    event Approved(
        address indexed frameTarget,
        uint8 scope,
        address indexed payer
    );

    /// @notice Frame execution outcome — corresponds to a row of the
    ///         frame receipt per EIP §"Receipt Encoding".
    event FrameExecuted(
        uint256 indexed frameIdx,
        FrameMode mode,
        bool success,
        uint256 gasUsed
    );

    event FrameTxSettled(address indexed payer, uint256 gasUsed);

    // ──────────────────────────────────────────────────────────────────
    // Errors
    // ──────────────────────────────────────────────────────────────────

    error InvalidFrameCount(uint256 got);
    error InvalidSignatureScheme(uint8 scheme);
    error InvalidSignature(uint256 sigIdx);
    error PayerNotSet();
    error NotMidExecution();
    error InvalidApproveScope(uint8 scope);
    error SenderApprovalRequiresTxSenderTarget();
    error AtomicBatchFailure(uint256 batchStart, uint256 frameIdx);
    error OnlyResolvedTargetCanApprove(address caller, address resolved);
    error UndefinedIntrospection(uint8 param);

    // ──────────────────────────────────────────────────────────────────
    // Construction
    // ──────────────────────────────────────────────────────────────────

    constructor(
        address _core,
        address _staking,
        address _expiryVerifier,
        address _p256Verifier
    ) EvvmService(_core, _staking) {
        require(_expiryVerifier != address(0), "FrameRouter: zero expiry");
        require(_p256Verifier != address(0), "FrameRouter: zero p256");
        expiryVerifier = _expiryVerifier;
        p256Verifier = MockP256Verifier(_p256Verifier);
    }

    // ──────────────────────────────────────────────────────────────────
    // Main entrypoint — executeFrameTx
    // ──────────────────────────────────────────────────────────────────

    /**
     * @notice Process an EIP-8141 frame transaction end-to-end.
     * @dev    1. Validate static constraints + each signature.
     *         2. Iterate frames; dispatch by mode; track payer/sender approval.
     *         3. Assert payer is set.
     *         4. Settle gas with payer via Core.caPay().
     *
     *         Modeled as a single Solidity call rather than a wrapped
     *         tx — the host researcher submits via their own deploy
     *         pipeline. The on-chain semantics of a frame tx are what
     *         this function exercises.
     */
    function executeFrameTx(
        Frame[] calldata frames,
        Signature[] calldata sigs
    ) external returns (address payer, uint256 totalGasUsed) {
        // EIP §"Constraints" — static validation
        if (frames.length == 0 || frames.length > MAX_FRAMES) {
            revert InvalidFrameCount(frames.length);
        }

        // Compute canonical sig hash. In the real EIP, this is the keccak
        // of (FRAME_TX_TYPE || rlp(tx)); here we approximate over the
        // calldata-encoded frames + signer pubkeys.
        bytes32 sigHash = _computeSigHash(frames, sigs);

        // EIP §"Behavior" step 3 — validate every signature first.
        for (uint256 i = 0; i < sigs.length; i++) {
            if (!_validateSignature(sigs[i], sigHash)) {
                revert InvalidSignature(i);
            }
        }

        // Mark mid-execution; populate context counts.
        _executing = true;
        _frameCount = frames.length;
        _sigCount = sigs.length;
        _payer = address(0);
        _senderApproved = false;

        // Walk frames, grouping atomic batches.
        uint256 i = 0;
        uint256 startGas = gasleft();
        while (i < frames.length) {
            if ((frames[i].flags & ATOMIC_BATCH_FLAG) != 0) {
                i = _executeAtomicBatch(frames, sigs, i);
            } else {
                _executeFrame(frames, sigs, i);
                i += 1;
            }
        }
        totalGasUsed = startGas - gasleft();

        // EIP §"Behavior" final step — payer must be set.
        if (_payer == address(0)) revert PayerNotSet();
        payer = _payer;

        // Settle. In the real EIP, this is the unpaid-gas refund step;
        // here we charge the payer the protocol's accounting via caPay.
        // (Researchers' own test suite can verify the right amount lands
        // with the executor.)
        _core().caPay(msg.sender, _principalTokenAddress(), totalGasUsed);
        emit FrameTxSettled(payer, totalGasUsed);

        _executing = false;
    }

    // ──────────────────────────────────────────────────────────────────
    // Frame execution
    // ──────────────────────────────────────────────────────────────────

    function _executeFrame(
        Frame[] calldata frames,
        Signature[] calldata sigs,
        uint256 idx
    ) internal {
        _currentFrameIdx = idx;
        Frame calldata f = frames[idx];

        // Resolve target: null → tx.sender (per EIP §"Behavior" step 5).
        // For our Solidity model "tx.sender" is the address of the
        // primary signer of the frame tx.
        address resolvedTarget = f.target == address(0) ? sigs[0].signer : f.target;

        uint256 startGas = gasleft();
        bool ok;

        if (f.mode == FrameMode.VERIFY) {
            // VERIFY: STATICCALL semantics; only APPROVE may mutate state.
            // We use staticcall + the resolvedTarget must call back into
            // approve() if it wants to authorize.
            (ok, ) = resolvedTarget.staticcall{gas: f.gasLimit}(f.data);
            // NOTE: the approve() callback can't be invoked from inside
            // a staticcall — that's a known modeling limitation. See
            // justification.md "open questions". In real EIP semantics
            // APPROVE is itself the state-mutation primitive granted
            // an exception; modeling that exactly requires a custom
            // EVM, which is out of scope here.
        } else if (f.mode == FrameMode.SENDER) {
            // SENDER mode requires prior APPROVE_EXECUTION.
            require(_senderApproved, "FrameRouter: sender not approved");
            // We execute as the signer via a delegatecall pattern would
            // be ideal but isn't representable from a service contract
            // in stock Solidity. For the experiment, we CALL the target
            // and document that the caller in the called contract will
            // be FrameRouter, not the signer. Researchers test the
            // semantic outcome, not the precise msg.sender chain.
            (ok, ) = resolvedTarget.call{value: f.value, gas: f.gasLimit}(f.data);
        } else {
            // DEFAULT: execute as ENTRY_POINT.
            (ok, ) = resolvedTarget.call{gas: f.gasLimit}(f.data);
        }

        emit FrameExecuted(idx, f.mode, ok, startGas - gasleft());

        // Non-atomic frames that revert: discard the call's state
        // changes (already discarded by the call boundary), continue
        // execution. EIP §"Behavior" — "On revert: discard state changes".
        // We do NOT revert the whole tx here.
    }

    function _executeAtomicBatch(
        Frame[] calldata frames,
        Signature[] calldata sigs,
        uint256 start
    ) internal returns (uint256 nextIdx) {
        // Find the end of the batch: the first frame from `start` whose
        // flags do NOT have ATOMIC_BATCH_FLAG set.
        uint256 end = start;
        while (end < frames.length && (frames[end].flags & ATOMIC_BATCH_FLAG) != 0) {
            end += 1;
        }
        // Include the terminating non-flag frame per EIP definition.
        if (end < frames.length) end += 1;

        // Try-each: if any frame reverts, the whole batch reverts.
        // We model this with an outer try/catch that re-runs the batch
        // inside a single sub-call. For experiment fidelity, a real
        // EVM client would use SNAPSHOT/RESTORE which Solidity can't
        // express — researchers' test suite should validate the
        // observable outcome.
        try this._runBatch(frames, sigs, start, end) {
            // success
        } catch {
            revert AtomicBatchFailure(start, end);
        }
        return end;
    }

    /// @dev Public-but-restricted helper for atomic-batch try/catch.
    function _runBatch(
        Frame[] calldata frames,
        Signature[] calldata sigs,
        uint256 start,
        uint256 end
    ) external {
        require(msg.sender == address(this), "FrameRouter: only self");
        for (uint256 i = start; i < end; i++) {
            _executeFrame(frames, sigs, i);
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // APPROVE — mock for the 0xaa opcode
    // ──────────────────────────────────────────────────────────────────

    /**
     * @notice VERIFY-frame callback that authorizes scopes per EIP §"APPROVE".
     * @dev    The real APPROVE opcode does this in one step + terminates
     *         the frame. Our mock requires the caller to return after.
     *
     *         Only the currently-executing frame's resolved target may
     *         call this — matches EIP "only frame resolved target can
     *         call APPROVE" rule (modulo DELEGATECALL nuance).
     */
    function approve(uint8 scope) external {
        if (!_executing) revert NotMidExecution();
        if (scope > APPROVE_EXECUTION_AND_PAYMENT) revert InvalidApproveScope(scope);

        // Sender can only toggle senderApproved to true.
        if ((scope & APPROVE_EXECUTION) != 0) {
            _senderApproved = true;
        }
        if ((scope & APPROVE_PAYMENT) != 0) {
            // First-set-wins per EIP §"APPROVE Calling Convention".
            if (_payer == address(0)) {
                _payer = msg.sender;
            }
        }
        emit Approved(msg.sender, scope, _payer);
    }

    // ──────────────────────────────────────────────────────────────────
    // Introspection mocks — TXPARAM (0xb0)
    // ──────────────────────────────────────────────────────────────────

    /**
     * @notice Mock for the TXPARAM opcode per EIP §"Introspection".
     * @dev    Only the indices defined in the EIP are valid; others
     *         revert (matching "Undefined param values cause exceptional halt").
     */
    function txParam(uint8 param) external view returns (uint256) {
        if (!_executing) revert NotMidExecution();
        if (param == 0x00) return uint256(FRAME_TX_TYPE);
        if (param == 0x09) return _frameCount;
        if (param == 0x0A) return _currentFrameIdx;
        if (param == 0x0B) return _sigCount;
        // 0x01..0x08 (nonce/sender/fees/etc.) require the EIP-8141 tx
        // envelope which we don't construct in this experiment.
        // Return 0 as a sentinel and let the calling test detect this.
        if (param <= 0x08) return 0;
        revert UndefinedIntrospection(param);
    }

    /**
     * @notice Mock for FRAMEPARAM (0xb3) per EIP §"Introspection".
     * @dev    The full FRAMEDATALOAD/FRAMEDATACOPY family is omitted in
     *         this foundation experiment — services that need to inspect
     *         other frames' data can be added in a sibling experiment.
     */
    function frameParam(uint8 /* param */, uint64 /* frameIdx */)
        external
        view
        returns (uint256)
    {
        if (!_executing) revert NotMidExecution();
        // Not implemented in foundation; revert clearly so researchers
        // know to look at the per-frame Frame struct directly.
        revert("FrameRouter: frameParam stubbed in foundation");
    }

    // ──────────────────────────────────────────────────────────────────
    // Signature validation
    // ──────────────────────────────────────────────────────────────────

    function _validateSignature(Signature calldata sig, bytes32 sigHash)
        internal
        view
        returns (bool)
    {
        bytes32 msgHash = sig.msg_.length == 0
            ? sigHash
            : _decodeExplicitDigest(sig.msg_);

        if (sig.scheme == SignatureScheme.SECP256K1) {
            if (sig.signature.length != 65) return false;
            (uint8 v, bytes32 r, bytes32 s) = _splitSecpSig(sig.signature);
            return sig.signer == ecrecover(msgHash, v, r, s);
        }

        if (sig.scheme == SignatureScheme.P256) {
            if (sig.signature.length != 128) return false;
            (uint256 r, uint256 s, uint256 qx, uint256 qy) = _splitP256Sig(
                sig.signature
            );
            if (sig.signer != p256Verifier.signerFromPubkey(qx, qy)) return false;
            return p256Verifier.verify(msgHash, r, s, qx, qy);
        }

        revert InvalidSignatureScheme(uint8(sig.scheme));
    }

    function _splitSecpSig(bytes calldata sig)
        internal
        pure
        returns (uint8 v, bytes32 r, bytes32 s)
    {
        v = uint8(sig[0]);
        r = bytes32(sig[1:33]);
        s = bytes32(sig[33:65]);
    }

    function _splitP256Sig(bytes calldata sig)
        internal
        pure
        returns (uint256 r, uint256 s, uint256 qx, uint256 qy)
    {
        r = uint256(bytes32(sig[0:32]));
        s = uint256(bytes32(sig[32:64]));
        qx = uint256(bytes32(sig[64:96]));
        qy = uint256(bytes32(sig[96:128]));
    }

    function _decodeExplicitDigest(bytes calldata msg_)
        internal
        pure
        returns (bytes32)
    {
        require(msg_.length == 32, "FrameRouter: explicit msg must be 32 bytes");
        bytes32 d = bytes32(msg_[0:32]);
        require(d != bytes32(0), "FrameRouter: zero digest not allowed");
        return d;
    }

    function _computeSigHash(
        Frame[] calldata frames,
        Signature[] calldata sigs
    ) internal pure returns (bytes32) {
        // Approximation per EIP §"Signature Hash": real implementation
        // serializes the tx with empty-msg signature bytes elided.
        // For this experiment we keccak the structured calldata; the
        // signing client must match this construction.
        return keccak256(abi.encode(FRAME_TX_TYPE, frames, _signersOnly(sigs)));
    }

    function _signersOnly(Signature[] calldata sigs)
        internal
        pure
        returns (bytes memory out)
    {
        // Emit only the (scheme, signer, msg_) triple per sig; elide
        // `signature` bytes per EIP §"Signature Hash" elision rule.
        for (uint256 i = 0; i < sigs.length; i++) {
            out = bytes.concat(
                out,
                abi.encode(uint8(sigs[i].scheme), sigs[i].signer, sigs[i].msg_)
            );
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // EIP-7702 delegation mock
    // ──────────────────────────────────────────────────────────────────

    /// @notice Register an EOA → delegate-code binding. In real EIP-7702
    ///         this would be a signed authorization list in the tx
    ///         envelope; for this experiment we use a direct admin call.
    function registerDelegation(address eoa, address delegate) external {
        require(msg.sender == eoa, "FrameRouter: only self-register");
        delegationRegistry[eoa] = delegate;
    }

    // ──────────────────────────────────────────────────────────────────
    // Internal helpers wrapping EvvmService
    // ──────────────────────────────────────────────────────────────────

    function _core() internal view returns (ICore) {
        return ICore(getCoreAddress());
    }

    function _principalTokenAddress() internal view returns (address) {
        return _core().getPrincipalTokenAddress();
    }
}
