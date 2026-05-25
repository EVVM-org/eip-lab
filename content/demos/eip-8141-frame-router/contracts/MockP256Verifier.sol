// SPDX-License-Identifier: EVVM-NONCOMMERCIAL-1.0
pragma solidity 0.8.30;

/**
 * @title MockP256Verifier — vendor wrapper for EIP-8141 P256 signature scheme
 * @notice Thin wrapper around DaimoSoftware/p256-verifier. The FrameRouter
 *         calls into this contract when dispatching signatures with
 *         scheme = 0x1 (P256) per EIP-8141 §"Signature Schemes".
 *
 *         When EIP-7951 (secp256r1 precompile at canonical address)
 *         ships, this whole contract collapses to a single staticcall
 *         to the precompile. Until then, vendored Solidity is the
 *         only honest way to support P256 on stock EVM.
 *
 * @dev    Daimo's implementation has been audited; vendor (not mock)
 *         because cryptographic correctness must hold even when gas
 *         profile (~340k gas per verify) is unrealistic.
 *
 *         Production caveat: pin the Daimo p256-verifier version
 *         deployed at integration time; the interface is stable but
 *         the cost has been optimized across versions.
 */

interface IDaimoP256 {
    function verify(
        bytes32 message_hash,
        uint256 r,
        uint256 s,
        uint256 x,
        uint256 y
    ) external view returns (bool);
}

contract MockP256Verifier {
    /// @notice The deployed Daimo p256-verifier instance.
    /// @dev    Set at construction time; immutable to prevent
    ///         post-deployment swap of the cryptographic primitive.
    IDaimoP256 public immutable daimo;

    constructor(address _daimo) {
        require(_daimo != address(0), "MockP256: zero verifier");
        daimo = IDaimoP256(_daimo);
    }

    /**
     * @notice Verify a P256 signature against the canonical signature
     *         hash and the signer's public key.
     * @param  hash The signature hash (canonical sig hash or explicit
     *              32-byte digest, per EIP §"Signature Validation").
     * @param  r,s   The signature components (32 bytes each).
     * @param  qx,qy The signer's public key coordinates (32 bytes each).
     */
    function verify(
        bytes32 hash,
        uint256 r,
        uint256 s,
        uint256 qx,
        uint256 qy
    ) external view returns (bool) {
        return daimo.verify(hash, r, s, qx, qy);
    }

    /**
     * @notice Derive the EVM-style signer address from the P256 public
     *         key per EIP-8141 §"Signature Validation":
     *             signer == keccak256(qx || qy)[12:]
     */
    function signerFromPubkey(uint256 qx, uint256 qy)
        external
        pure
        returns (address)
    {
        return address(uint160(uint256(keccak256(abi.encodePacked(qx, qy)))));
    }
}
