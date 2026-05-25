// SPDX-License-Identifier: EVVM-NONCOMMERCIAL-1.0
pragma solidity 0.8.30;

/**
 * @title NonceManager — system contract simulator (EIP-8250)
 * @author EIPLab (experiment scaffolding for EIP-8250)
 * @notice Holds keyed-nonce state per (sender, key) tuple. In a real
 *         EIP-8250 deployment this contract is installed by clients at
 *         fork activation at a canonical (TBD) address with reverting
 *         fallback code. Here we deploy it normally; Core points at it
 *         via the one-time initializeKeyedNonces(address) admin call.
 *
 *         Storage layout mirrors EIP §"Nonce State":
 *           slot(sender, nonce_key) = keccak256(
 *               left_pad_32(sender) || uint256_to_bytes32(nonce_key)
 *           )
 *         Solidity's nested-mapping layout produces the same slot
 *         derivation, so reviewers can verify the mapping is equivalent
 *         to the EIP's explicit `keccak256(...)` formula.
 *
 * @dev    Restricted: only the wired Core instance can advance nonces.
 *         Direct EOA reads of currentNonceSeq are allowed and harmless.
 *
 *         Limitations (see justification.md):
 *         - No fork-activation install semantics.
 *         - No reverting fallback bytecode (production would vm.etch
 *           the EIP's canonical 5-byte runtime: 0x60006000fd).
 */
contract NonceManager {
    /// @notice The Core instance authorized to mutate state.
    address public immutable core;

    /// @dev sender => key => current sequence number.
    ///      The protocol never writes 0; first use is detectable as a
    ///      zero-valued read (matches EIP §5.2 "Absent keyed slots
    ///      read as zero").
    mapping(address sender => mapping(uint256 key => uint64 seq))
        private currentSeq;

    /// @notice MAX_NONCE_SEQ per EIP §3 constants table.
    uint64 public constant MAX_NONCE_SEQ = type(uint64).max;

    /// @notice Emitted on every successful keyed-nonce consumption.
    /// @param wasFirstUse True if the prior value was zero (i.e., the
    ///        KEYED_NONCE_FIRST_USE_GAS surcharge applies on this call).
    event KeyedNonceConsumed(
        address indexed sender,
        uint256 indexed key,
        uint64 indexed newSeq,
        bool wasFirstUse
    );

    error OnlyCore();
    error SequenceMismatch(uint64 expected, uint64 got);
    error SequenceExhausted();

    modifier onlyCore() {
        if (msg.sender != core) revert OnlyCore();
        _;
    }

    constructor(address _core) {
        require(_core != address(0), "NonceManager: zero core");
        core = _core;
    }

    /// @notice Returns the next expected `nonce_seq` for (sender, key).
    /// @dev    Mirrors EIP §"Stateful Validity" `current_nonce_seq(...)`.
    ///         Returns 0 for unused (sender, key) tuples.
    function currentNonceSeq(address sender, uint256 key)
        external
        view
        returns (uint64)
    {
        return currentSeq[sender][key];
    }

    /// @notice Atomically validate-and-consume a keyed nonce.
    /// @return wasFirstUse True if the consumed slot was zero before
    ///         this call (i.e., the surcharge applies).
    /// @dev    Reverts if `seq != expected`. Reverts if the new
    ///         sequence would equal MAX_NONCE_SEQ (the EIP's exhausted
    ///         state — keys reaching it cannot advance further).
    function consume(address sender, uint256 key, uint64 seq)
        external
        onlyCore
        returns (bool wasFirstUse)
    {
        uint64 expected = currentSeq[sender][key];
        if (seq != expected) revert SequenceMismatch(expected, seq);

        unchecked {
            // Pre-increment overflow guarded by EIP's MAX_NONCE_SEQ.
            if (expected == MAX_NONCE_SEQ - 1) revert SequenceExhausted();
            wasFirstUse = (expected == 0);
            currentSeq[sender][key] = expected + 1;
        }

        emit KeyedNonceConsumed(sender, key, expected + 1, wasFirstUse);
    }
}
