// SPDX-License-Identifier: EVVM-NONCOMMERCIAL-1.0
pragma solidity 0.8.30;

/**
 * @title MockExpiryVerifier — bit-equivalent of EIP-8141 §"Expiry Verifier Frame"
 * @notice The canonical expiry verifier is specified by EIP-8141 as a
 *         system contract at address `EXPIRY_VERIFIER = 0x8141` with
 *         this exact 26-byte runtime bytecode:
 *
 *             0x60083614600a575f5ffd5b5f3560c01c4211601657005b5f5ffd
 *
 *         Disassembled, that bytecode is equivalent to:
 *
 *             if (calldata.length != 8) revert();
 *             expiry = uint64(bigEndian(calldata));
 *             if (block.timestamp > expiry) revert();
 *             stop();
 *
 *         This Solidity contract provides that behavior at a regular
 *         address. For production fidelity, a deploy script should
 *         vm.etch the canonical bytes at 0x...8141 instead.
 *
 * @dev    EIP-8141 permits the TIMESTAMP opcode in this contract as
 *         the documented exception to the general TIMESTAMP ban in
 *         VERIFY frames.
 */
contract MockExpiryVerifier {
    /// @notice Required calldata length per EIP §3 constants
    /// (EXPIRY_DATA_LENGTH = 8).
    uint256 internal constant EXPIRY_DATA_LENGTH = 8;

    /**
     * @notice Reverts unless the supplied expiry timestamp is in the future.
     * @dev    Mirrors the canonical bytecode's fallback behavior. Using
     *         a dedicated function (`verify`) instead of fallback because
     *         the auto-UI of scaffold-evvm prefers explicit functions for
     *         display, but production should use the canonical fallback.
     */
    function verify(bytes calldata expiryBigEndian) external view {
        if (expiryBigEndian.length != EXPIRY_DATA_LENGTH) revert();
        uint64 expiry = _decodeBigEndian8(expiryBigEndian);
        if (block.timestamp > expiry) revert();
        // implicit STOP — function returns successfully
    }

    /// @dev Mirrors the canonical bytecode's CALLDATALOAD + SHR(0xc0) path.
    function _decodeBigEndian8(bytes calldata data) internal pure returns (uint64) {
        // Read first 32 bytes (zero-padded by Solidity's calldata access),
        // shift right by 192 (i.e., 0xc0) to keep the top 8 bytes only.
        bytes32 word;
        assembly { word := calldataload(data.offset) }
        return uint64(uint256(word) >> 0xc0);
    }
}
