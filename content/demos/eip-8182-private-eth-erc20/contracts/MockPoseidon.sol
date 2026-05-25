// SPDX-License-Identifier: EVVM-NONCOMMERCIAL-1.0
pragma solidity 0.8.30;

/**
 * @title MockPoseidon — keccak-based Poseidon2 substitute for EIP-8182
 * @notice EIP-8182 §3.3 specifies Poseidon2 over the BN254 scalar field
 *         as the canonical hash. Poseidon2 is not an EVM opcode, and
 *         Solidity ports cost ~50k gas per hash — too expensive for
 *         Merkle tree updates in a research demo.
 *
 *         This contract implements the same call shape with keccak256
 *         under the hood, taking the result modulo the BN254 scalar
 *         field order p. Domain separators (the first input per the
 *         EIP §3.1 list) are honored as-is.
 *
 *         The substitution is collision-free and deterministic,
 *         sufficient for testing the contract state machine. It is
 *         NOT collision-equivalent to real Poseidon2 and is NOT
 *         suitable for any cryptographic claim about commitment
 *         binding strength.
 *
 *         Production swap: replace with a vendored Solidity Poseidon2
 *         (e.g., Aztec's port) or with a Poseidon precompile once one
 *         exists.
 */

interface IMockPoseidon {
    function poseidon(uint256[] memory inputs) external pure returns (uint256);
    function poseidon2(uint256 a, uint256 b) external pure returns (uint256);
    function poseidon3(uint256 a, uint256 b, uint256 c)
        external
        pure
        returns (uint256);
    function poseidon4(uint256 a, uint256 b, uint256 c, uint256 d)
        external
        pure
        returns (uint256);
    function poseidon5(uint256 a, uint256 b, uint256 c, uint256 d, uint256 e)
        external
        pure
        returns (uint256);
}

contract MockPoseidon is IMockPoseidon {
    /// @notice BN254 scalar field order p. Real Poseidon2 outputs are
    ///         in [0, p). We mod our keccak output to stay in range so
    ///         downstream public-input range checks (EIP §3.5) pass.
    uint256 internal constant BN254_FIELD_ORDER =
        0x30644E72E131A029B85045B68181585D2833E84879B9709143E1F593F0000001;

    function poseidon(uint256[] memory inputs)
        external
        pure
        override
        returns (uint256)
    {
        return uint256(keccak256(abi.encode(inputs))) % BN254_FIELD_ORDER;
    }

    // Convenience overloads — match the shapes used by ShieldedPool
    // and AuthRegistry. Reduce calldata vs. the array form.

    function poseidon2(uint256 a, uint256 b)
        external
        pure
        override
        returns (uint256)
    {
        return uint256(keccak256(abi.encode(a, b))) % BN254_FIELD_ORDER;
    }

    function poseidon3(uint256 a, uint256 b, uint256 c)
        external
        pure
        override
        returns (uint256)
    {
        return uint256(keccak256(abi.encode(a, b, c))) % BN254_FIELD_ORDER;
    }

    function poseidon4(uint256 a, uint256 b, uint256 c, uint256 d)
        external
        pure
        override
        returns (uint256)
    {
        return uint256(keccak256(abi.encode(a, b, c, d))) % BN254_FIELD_ORDER;
    }

    function poseidon5(uint256 a, uint256 b, uint256 c, uint256 d, uint256 e)
        external
        pure
        override
        returns (uint256)
    {
        return uint256(keccak256(abi.encode(a, b, c, d, e))) % BN254_FIELD_ORDER;
    }
}
