// SPDX-License-Identifier: EVVM-NONCOMMERCIAL-1.0
pragma solidity 0.8.30;

/**
 * @title MockPoolVerifier — admin-controlled Groth16 stub for EIP-8182
 * @notice EIP-8182 §5.5 specifies pool proof verification with a fixed
 *         Groth16 BN254 verification key embedded in the system
 *         contract bytecode at fork-activation time, set by a
 *         trusted-setup ceremony.
 *
 *         For research-bench use, the trusted setup is impractical
 *         and ~250k gas per verify makes the contract state machine
 *         hard to exercise. This stub returns admin-set verdicts
 *         keyed on `keccak256(publicInputs)`, letting tests
 *         deterministically simulate valid and invalid proofs.
 *
 *         NO CRYPTOGRAPHIC SECURITY. Do not ship this to mainnet.
 */

interface IMockPoolVerifier {
    function verifyProof(
        bytes calldata proof,
        bytes calldata publicInputs
    ) external returns (bool);
}

contract MockPoolVerifier is IMockPoolVerifier {
    address public immutable admin;

    /// @dev publicInputsHash => verdict. Default false (unset = reject).
    mapping(bytes32 => bool) public verdict;

    /// @dev Counters for sanity-checking adversarial scenarios.
    uint256 public verifyCallCount;
    uint256 public verifyTrueCount;

    event VerdictSet(bytes32 indexed publicInputsHash, bool ok);

    error OnlyAdmin();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }

    constructor(address _admin) {
        require(_admin != address(0), "MockPoolVerifier: zero admin");
        admin = _admin;
    }

    /**
     * @notice Configure the verifier to return `true` for a specific
     *         public-input set. Tests use this to pre-populate
     *         "valid" proofs before submitting transact calls.
     */
    function setVerdict(bytes32 publicInputsHash, bool ok)
        external
        onlyAdmin
    {
        verdict[publicInputsHash] = ok;
        emit VerdictSet(publicInputsHash, ok);
    }

    /**
     * @notice Mock for Groth16 BN254 verification. `proof` is unused;
     *         the verdict is keyed only on the public inputs. This
     *         matches what a real verifier does at the API level
     *         (a single bool out per (proof, publicInputs) pair) but
     *         skips all the pairing math.
     *
     * @dev    Non-view so the call counters update — useful for
     *         "was this called?" assertions in tests.
     */
    function verifyProof(
        bytes calldata /* proof */,
        bytes calldata publicInputs
    ) external override returns (bool ok) {
        bytes32 h = keccak256(publicInputs);
        ok = verdict[h];
        unchecked {
            verifyCallCount++;
            if (ok) verifyTrueCount++;
        }
    }

    /// @notice Read-only equivalent for off-chain probes.
    function previewVerify(bytes calldata publicInputs)
        external
        view
        returns (bool)
    {
        return verdict[keccak256(publicInputs)];
    }
}
