// SPDX-License-Identifier: EVVM-NONCOMMERCIAL-1.0
pragma solidity 0.8.30;

interface IIndexContract8304ForVerifier {
    function get(
        uint256 firstBlock,
        uint256 tableSize
    ) external view returns (bytes32);
}

/// @title IndexProofVerifier8304
/// @notice Verifies EIP-8304 encoded-entry membership proofs against roots stored in an index contract.
/// @dev Satisfies the EIP-8304 "get" proof-consumption use case for EVVM testing.
/// @custom:why Contracts can use a stored table root to trustlessly verify an off-chain supplied index-entry proof.
/// @custom:limitations This verifier checks a SHA2 binary Merkle path against a stored root; it does not build tables, sort entries, verify non-membership, prove SSZ list length mix-ins, or validate receipt/log correctness.
contract IndexProofVerifier8304 {
    /// @notice Verifies an encoded EIP-8304 entry against a table root fetched from an index contract.
    function verifyEntryInTable(
        address indexContract,
        uint256 firstBlock,
        uint256 tableSize,
        bytes calldata encodedEntry,
        bytes32[] calldata proof,
        uint256 leafIndex
    ) external view returns (bool) {
        bytes32 tableRoot = IIndexContract8304ForVerifier(indexContract).get(
            firstBlock,
            tableSize
        );

        bytes32 leaf = sha256(encodedEntry);
        return verifyLeaf(tableRoot, leaf, proof, leafIndex);
    }

    /// @notice Verifies a SHA2 binary Merkle proof.
    /// @dev leafIndex chooses pair order at each level; 0 bit means current node is left.
    function verifyLeaf(
        bytes32 root,
        bytes32 leaf,
        bytes32[] calldata proof,
        uint256 leafIndex
    ) public pure returns (bool) {
        bytes32 computed = leaf;
        uint256 index = leafIndex;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 sibling = proof[i];

            if (index & 1 == 0) {
                computed = sha256(abi.encodePacked(computed, sibling));
            } else {
                computed = sha256(abi.encodePacked(sibling, computed));
            }

            index >>= 1;
        }

        return computed == root;
    }
}
