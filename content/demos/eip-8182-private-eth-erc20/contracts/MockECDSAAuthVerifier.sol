// SPDX-License-Identifier: EVVM-NONCOMMERCIAL-1.0
pragma solidity 0.8.30;

/**
 * @title MockECDSAAuthVerifier — reference IAuthVerifier (EIP-8182 §11)
 * @notice Demonstrates the pluggable-verifier dispatch path. Real auth
 *         verifiers would wrap a ZK proof of credential possession;
 *         this one treats the `authProof` as an ECDSA signature over
 *         the `publicInputs` (the EIP's [blindedAuthCommitment,
 *         transactionIntentDigest] pair) and verifies it against a
 *         pre-registered signer.
 *
 *         Sufficient to exercise ShieldedPool's staticcall dispatch
 *         end-to-end. NOT a ZK proof — there is no
 *         knowledge-of-secret guarantee.
 */

interface IAuthVerifier {
    function verifyAuth(
        bytes calldata publicInputs,
        bytes calldata authProof
    ) external view returns (bool);
}

contract MockECDSAAuthVerifier is IAuthVerifier {
    /// @notice authDataCommitment => signer address.
    ///         The commitment in EIP-8182 is a Poseidon hash hiding the
    ///         underlying auth data. In this mock, we register signers
    ///         off-chain and use the commitment as the lookup key.
    mapping(uint256 => address) public signerOf;

    /// @notice Admin authorized to register signer bindings.
    address public immutable admin;

    event SignerRegistered(uint256 indexed authDataCommitment, address signer);

    error OnlyAdmin();
    error UnknownCommitment(uint256 authDataCommitment);
    error MalformedAuthProof();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }

    constructor(address _admin) {
        require(_admin != address(0), "MockECDSAAuthVerifier: zero admin");
        admin = _admin;
    }

    /**
     * @notice Register the ECDSA signer associated with an auth data
     *         commitment. In a real auth circuit, this binding is
     *         proven inside the ZK relation; here we trust the admin.
     */
    function registerSigner(uint256 authDataCommitment, address signer)
        external
        onlyAdmin
    {
        require(signer != address(0), "MockECDSAAuthVerifier: zero signer");
        signerOf[authDataCommitment] = signer;
        emit SignerRegistered(authDataCommitment, signer);
    }

    /**
     * @notice Verify the auth proof against the registered signer.
     * @param  publicInputs  ABI-encoded `(uint256 blindedAuthCommitment,
     *                       uint256 transactionIntentDigest)` per
     *                       EIP §8.1.
     * @param  authProof     Encoded as `(uint256 authDataCommitment,
     *                       uint8 v, bytes32 r, bytes32 s)`. The
     *                       signature is over `keccak256(publicInputs)`.
     */
    function verifyAuth(
        bytes calldata publicInputs,
        bytes calldata authProof
    ) external view override returns (bool) {
        if (publicInputs.length != 64) revert MalformedAuthProof();
        if (authProof.length != 32 + 1 + 32 + 32) revert MalformedAuthProof();

        // Decode authProof
        uint256 authDataCommitment;
        uint8 v;
        bytes32 r;
        bytes32 s;
        assembly {
            authDataCommitment := calldataload(authProof.offset)
            v := byte(0, calldataload(add(authProof.offset, 32)))
            r := calldataload(add(authProof.offset, 33))
            s := calldataload(add(authProof.offset, 65))
        }

        address registered = signerOf[authDataCommitment];
        if (registered == address(0)) revert UnknownCommitment(authDataCommitment);

        bytes32 msgHash = keccak256(publicInputs);
        // Wrap in the EIP-191 personal-sign envelope so off-chain
        // signing is straightforward with standard wallets.
        bytes32 envelope = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", msgHash)
        );

        address recovered = ecrecover(envelope, v, r, s);
        return recovered == registered;
    }
}
