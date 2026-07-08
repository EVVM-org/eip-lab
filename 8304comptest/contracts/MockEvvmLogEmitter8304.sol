// SPDX-License-Identifier: EVVM-NONCOMMERCIAL-1.0
pragma solidity 0.8.30;

/// @title MockEvvmLogEmitter8304
/// @notice Emits deterministic logs for EIP-8304 EVVM-lab indexing tests.
/// @dev Satisfies the optional EVVM log-source role for producing test entries.
/// @custom:why EVVM Core intentionally does not need modification for EIP-8304 Phase 1, so this mock provides indexable logs without changing Core.sol.
/// @custom:limitations This contract only emits logs; it does not index them, prove them, enumerate host-chain receipts, or claim that on-chain contracts can read historical logs.
contract MockEvvmLogEmitter8304 {
    event MockEvvmIndexedOperation(
        address indexed actor,
        bytes32 indexed operationHash,
        uint256 amount
    );

    /// @notice Emits a deterministic test log representing an EVVM-like indexed operation.
    function emitMockOperation(
        bytes32 operationHash,
        uint256 amount
    ) external {
        emit MockEvvmIndexedOperation(msg.sender, operationHash, amount);
    }
}
