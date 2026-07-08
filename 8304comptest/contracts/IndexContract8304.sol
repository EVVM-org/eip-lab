// SPDX-License-Identifier: EVVM-NONCOMMERCIAL-1.0
pragma solidity 0.8.30;

/// @title IndexContract8304
/// @notice Simulates the EIP-8304 system index contract root-storage surface.
/// @dev Satisfies EIP-8304 "Index contract", "get", and "set" sections for EVVM testing.
/// @custom:why EIP-8304 requires clients to store index-table roots in a system contract during block processing; EVVM tests the contract-visible behavior with an authorized updater.
/// @custom:limitations This contract does not implement real client block processing, real calls from SYSTEM_ADDRESS, a fixed INDEX_CONTRACT_ADDRESS, receipt/log enumeration, SSZ table construction, or table merging.
contract IndexContract8304 {
    uint256 public constant TABLES_PER_LEVEL = 1024;

    uint256 public constant TABLE_SIZE_1 = 1;
    uint256 public constant TABLE_SIZE_4 = 4;
    uint256 public constant TABLE_SIZE_16 = 16;
    uint256 public constant TABLE_SIZE_64 = 64;
    uint256 public constant TABLE_SIZE_256 = 256;

    address public constant EIP8304_SYSTEM_ADDRESS =
        0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE;

    address public authorizedSystemUpdater;

    struct StoredTableRoot {
        uint256 firstBlock;
        uint256 tableSize;
        bytes32 tableRoot;
    }

    mapping(uint256 slotKey => StoredTableRoot root) private roots;

    event TableRootSet(
        uint256 indexed firstBlock,
        uint256 indexed tableSize,
        uint256 indexed slotKey,
        bytes32 tableRoot
    );

    event AuthorizedSystemUpdaterChanged(
        address indexed oldUpdater,
        address indexed newUpdater
    );

    error UnauthorizedSystemUpdater(address caller);
    error InvalidTableSize(uint256 tableSize);
    error InvalidFirstBlock(uint256 firstBlock, uint256 tableSize);
    error ZeroTableRoot();
    error TableRootUnavailable(uint256 firstBlock, uint256 tableSize);
    error TableRootOverwritten(
        uint256 requestedFirstBlock,
        uint256 requestedTableSize,
        uint256 storedFirstBlock,
        uint256 storedTableSize
    );

    modifier onlyAuthorizedSystemUpdater() {
        if (msg.sender != authorizedSystemUpdater) {
            revert UnauthorizedSystemUpdater(msg.sender);
        }
        _;
    }

    constructor(address initialAuthorizedSystemUpdater) {
        if (initialAuthorizedSystemUpdater == address(0)) {
            revert UnauthorizedSystemUpdater(address(0));
        }
        authorizedSystemUpdater = initialAuthorizedSystemUpdater;
    }

    /// @notice Changes the simulated system updater.
    /// @dev This is an EVVM-lab control plane for testing; EIP-8304 uses SYSTEM_ADDRESS instead.
    function setAuthorizedSystemUpdater(
        address newAuthorizedSystemUpdater
    ) external onlyAuthorizedSystemUpdater {
        if (newAuthorizedSystemUpdater == address(0)) {
            revert UnauthorizedSystemUpdater(address(0));
        }

        address oldUpdater = authorizedSystemUpdater;
        authorizedSystemUpdater = newAuthorizedSystemUpdater;

        emit AuthorizedSystemUpdaterChanged(oldUpdater, newAuthorizedSystemUpdater);
    }

    /// @notice Stores a table root in the EIP-8304 ring-buffer slot.
    /// @dev Simulates the EIP-8304 set operation normally invoked by block processing.
    function set(
        uint256 firstBlock,
        uint256 tableSize,
        bytes32 tableRoot
    ) external onlyAuthorizedSystemUpdater {
        _validateTableCoordinates(firstBlock, tableSize);

        if (tableRoot == bytes32(0)) {
            revert ZeroTableRoot();
        }

        uint256 slotKey = storageSlotFor(firstBlock, tableSize);

        roots[slotKey] = StoredTableRoot({
            firstBlock: firstBlock,
            tableSize: tableSize,
            tableRoot: tableRoot
        });

        emit TableRootSet(firstBlock, tableSize, slotKey, tableRoot);
    }

    /// @notice Returns the stored root for a valid non-overwritten table.
    /// @dev Reverts if the slot is empty or currently contains a different table range.
    function get(
        uint256 firstBlock,
        uint256 tableSize
    ) external view returns (bytes32) {
        _validateTableCoordinates(firstBlock, tableSize);

        uint256 slotKey = storageSlotFor(firstBlock, tableSize);
        StoredTableRoot memory stored = roots[slotKey];

        if (stored.tableRoot == bytes32(0)) {
            revert TableRootUnavailable(firstBlock, tableSize);
        }

        if (stored.firstBlock != firstBlock || stored.tableSize != tableSize) {
            revert TableRootOverwritten(
                firstBlock,
                tableSize,
                stored.firstBlock,
                stored.tableSize
            );
        }

        return stored.tableRoot;
    }

    /// @notice Returns full metadata for the ring-buffer slot addressed by a table.
    function getStoredTableRoot(
        uint256 firstBlock,
        uint256 tableSize
    ) external view returns (StoredTableRoot memory) {
        _validateTableCoordinates(firstBlock, tableSize);
        return roots[storageSlotFor(firstBlock, tableSize)];
    }

    /// @notice Computes the EIP-8304 storage slot formula for table roots.
    function storageSlotFor(
        uint256 firstBlock,
        uint256 tableSize
    ) public pure returns (uint256) {
        _validateTableCoordinates(firstBlock, tableSize);
        return
            tableSize *
            TABLES_PER_LEVEL +
            (firstBlock / tableSize) %
            TABLES_PER_LEVEL;
    }

    /// @notice Returns true if tableSize is one of the EIP-8304 protocol table sizes.
    function isValidTableSize(
        uint256 tableSize
    ) public pure returns (bool) {
        return
            tableSize == TABLE_SIZE_1 ||
            tableSize == TABLE_SIZE_4 ||
            tableSize == TABLE_SIZE_16 ||
            tableSize == TABLE_SIZE_64 ||
            tableSize == TABLE_SIZE_256;
    }

    function _validateTableCoordinates(
        uint256 firstBlock,
        uint256 tableSize
    ) internal pure {
        if (!isValidTableSize(tableSize)) {
            revert InvalidTableSize(tableSize);
        }

        if (firstBlock % tableSize != 0) {
            revert InvalidFirstBlock(firstBlock, tableSize);
        }
    }
}
