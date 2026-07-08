// SPDX-License-Identifier: EVVM-NONCOMMERCIAL-1.0
pragma solidity 0.8.30;

interface IIndexContract8304ForUpdater {
    function set(
        uint256 firstBlock,
        uint256 tableSize,
        bytes32 tableRoot
    ) external;
}

/// @title MockSystemUpdater8304
/// @notice Simulates EIP-8304 block-processing updates to the index contract.
/// @dev Satisfies the EVVM test need for a deterministic stand-in for SYSTEM_ADDRESS calls.
/// @custom:why EIP-8304 set calls are made by clients from SYSTEM_ADDRESS, which normal Solidity deployments cannot impersonate.
/// @custom:limitations This mock does not prove client-side indexing correctness, does not call from the real SYSTEM_ADDRESS, and does not deploy or assume the TBD INDEX_CONTRACT_ADDRESS.
contract MockSystemUpdater8304 {
    event MockTableRootSubmitted(
        address indexed indexContract,
        uint256 indexed firstBlock,
        uint256 indexed tableSize,
        bytes32 tableRoot
    );

    /// @notice Submits a table root to an IndexContract8304 that authorized this mock.
    function submitRoot(
        address indexContract,
        uint256 firstBlock,
        uint256 tableSize,
        bytes32 tableRoot
    ) external {
        IIndexContract8304ForUpdater(indexContract).set(
            firstBlock,
            tableSize,
            tableRoot
        );

        emit MockTableRootSubmitted(
            indexContract,
            firstBlock,
            tableSize,
            tableRoot
        );
    }

    /// @notice Submits multiple roots for ring-buffer overwrite tests.
    function submitRoots(
        address indexContract,
        uint256[] calldata firstBlocks,
        uint256[] calldata tableSizes,
        bytes32[] calldata tableRoots
    ) external {
        require(
            firstBlocks.length == tableSizes.length &&
                tableSizes.length == tableRoots.length,
            "EIP8304_LENGTH_MISMATCH"
        );

        for (uint256 i = 0; i < firstBlocks.length; i++) {
            IIndexContract8304ForUpdater(indexContract).set(
                firstBlocks[i],
                tableSizes[i],
                tableRoots[i]
            );

            emit MockTableRootSubmitted(
                indexContract,
                firstBlocks[i],
                tableSizes[i],
                tableRoots[i]
            );
        }
    }
}
