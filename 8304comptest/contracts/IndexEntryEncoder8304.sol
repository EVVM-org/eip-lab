// SPDX-License-Identifier: EVVM-NONCOMMERCIAL-1.0
pragma solidity 0.8.30;

/// @title IndexEntryEncoder8304
/// @notice Encodes EIP-8304 index entries using the specified big-endian binary layouts.
/// @dev Satisfies EIP-8304 "Entry types" and "Index tables" binary encoding requirements for test vectors.
/// @custom:why EVVM tests need deterministic entry bytes and SHA2 leaf hashes for table-root proof verification.
/// @custom:limitations This contract does not sort entries, build SSZ list roots, enumerate logs, enumerate transactions, or merge tables.
contract IndexEntryEncoder8304 {
    uint32 public constant ENTRY_TYPE_BLOCK = 0;
    uint32 public constant ENTRY_TYPE_TRANSACTION = 1;
    uint32 public constant ENTRY_TYPE_LOG_ADDRESS = 2;
    uint32 public constant ENTRY_TYPE_LOG_TOPIC_0 = 3;
    uint32 public constant ENTRY_TYPE_LOG_TOPIC_1 = 4;
    uint32 public constant ENTRY_TYPE_LOG_TOPIC_2 = 5;
    uint32 public constant ENTRY_TYPE_LOG_TOPIC_3 = 6;

    error InvalidTopicIndex(uint8 topicIndex);

    /// @notice Encodes a block entry: uint32 typeId || bytes32 blockHash || uint64 blockNumber.
    function encodeBlockEntry(
        bytes32 blockHash,
        uint64 blockNumber
    ) external pure returns (bytes memory) {
        return abi.encodePacked(ENTRY_TYPE_BLOCK, blockHash, blockNumber);
    }

    /// @notice Encodes a transaction entry: uint32 typeId || bytes32 txHash || uint64 blockNumber || uint32 txIndex || uint32 cumulativeLogCount.
    function encodeTransactionEntry(
        bytes32 txHash,
        uint64 blockNumber,
        uint32 txIndex,
        uint32 cumulativeLogCount
    ) external pure returns (bytes memory) {
        return
            abi.encodePacked(
                ENTRY_TYPE_TRANSACTION,
                txHash,
                blockNumber,
                txIndex,
                cumulativeLogCount
            );
    }

    /// @notice Encodes a log.address entry: uint32 typeId || address logAddress || uint64 blockNumber || uint32 txIndex || uint32 logIndex.
    function encodeLogAddressEntry(
        address logAddress,
        uint64 blockNumber,
        uint32 txIndex,
        uint32 logIndex
    ) external pure returns (bytes memory) {
        return
            abi.encodePacked(
                ENTRY_TYPE_LOG_ADDRESS,
                logAddress,
                blockNumber,
                txIndex,
                logIndex
            );
    }

    /// @notice Encodes a log.topic entry for topic indices 0..3.
    /// @dev Type id is 3 + topicIndex, matching EIP-8304 log.topics[0..3].
    function encodeLogTopicEntry(
        uint8 topicIndex,
        bytes32 topic,
        uint64 blockNumber,
        uint32 txIndex,
        uint32 logIndex
    ) external pure returns (bytes memory) {
        if (topicIndex > 3) {
            revert InvalidTopicIndex(topicIndex);
        }

        return
            abi.encodePacked(
                uint32(ENTRY_TYPE_LOG_TOPIC_0 + uint32(topicIndex)),
                topic,
                blockNumber,
                txIndex,
                logIndex
            );
    }

    /// @notice Returns the EIP-8304 leaf hash for an encoded entry.
    /// @dev EIP-8304 specifies SHA2 hashes of binary encoded entries.
    function entryHash(
        bytes memory encodedEntry
    ) external pure returns (bytes32) {
        return sha256(encodedEntry);
    }
}
