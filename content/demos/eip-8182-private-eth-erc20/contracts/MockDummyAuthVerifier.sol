// SPDX-License-Identifier: EVVM-NONCOMMERCIAL-1.0
pragma solidity 0.8.30;

/**
 * @title MockDummyAuthVerifier — always-true auth verifier for adversarial tests
 * @notice EIP-8182 §11 specifies a pluggable IAuthVerifier interface.
 *         This implementation always returns `true`. Its purpose is to
 *         let researchers wire it into ShieldedPool and confirm that
 *         a broken auth circuit alone is not enough to compromise the
 *         pool — the Groth16 pool proof must also be valid.
 *
 *         BY DESIGN HAS NO SECURITY AT ALL.
 *         Existence in this folder is for negative testing only.
 */

interface IAuthVerifier {
    function verifyAuth(
        bytes calldata publicInputs,
        bytes calldata authProof
    ) external view returns (bool);
}

contract MockDummyAuthVerifier is IAuthVerifier {
    function verifyAuth(
        bytes calldata /* publicInputs */,
        bytes calldata /* authProof */
    ) external pure override returns (bool) {
        return true;
    }
}
