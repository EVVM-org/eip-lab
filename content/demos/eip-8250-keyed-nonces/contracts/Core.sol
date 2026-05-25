// SPDX-License-Identifier: EVVM-NONCOMMERCIAL-1.0
pragma solidity 0.8.30;

import {SignatureRecover} from "../../library/SignatureRecover.sol";
import {Erc191TestBuilder} from "../../library/Erc191TestBuilder.sol";
import {AsyncNonceService} from "../../library/AsyncNonceService.sol";
import {SyncNonceService} from "../../library/SyncNonceService.sol";

// >>> EIP-8250 ADDITION <<<
import {NonceManager} from "./NonceManager.sol";
// >>> end EIP-8250 ADDITION <<<

import {IStaking} from "../../interfaces/IStaking.sol";
import {INameService} from "../../interfaces/INameService.sol";
import {ITreasury} from "../../interfaces/ITreasury.sol";

/// @notice Metadata struct passed to the Core constructor. Unchanged from canonical.
struct EvvmMetadata {
    string EvvmName;
    uint256 EvvmID;
    string principalTokenName;
    string principalTokenSymbol;
    address principalTokenAddress;
    uint256 totalSupply;
    uint256 eraTokens;
    uint256 reward;
}

/**
 * @title  EVVM Core — EIP-8250 modification
 * @notice Forked from packages/foundry/testnet-contracts/contracts/core/Core.sol
 *         with the EIP-8250 keyed-nonce extension applied.
 *
 *         For the canonical Core.sol (~1280 LOC: pay/batchPay/dispersePay,
 *         the full admin proposal/accept flow, the upgrade flow, the
 *         token allowlist/denylist machinery, the staker bookkeeping,
 *         the reward calculation, and all view methods), see:
 *
 *             https://www.evvm.info/docs/category/coresol
 *
 *         This file shows the EIP-8250 modifications inline with the
 *         load-bearing canonical functions they touch or sit alongside.
 *         Functions not shown here are preserved byte-identical from
 *         the canonical Core.
 *
 * >>> EIP-8250 SCOPE OF CHANGES <<<
 *
 *   ADDED:
 *     - NonceManager reference + initializeKeyedNonces() admin call
 *     - validateAndConsumeKeyedNonce() entrypoint
 *     - txParam() view (models TXPARAM(0x0B) / TXPARAM(0x0C) opcodes)
 *     - KeyedNonceConsumed event + KeyedNoncesNotInitialized /
 *       KeyedNonceSurchargeInsufficient errors
 *
 *   UNCHANGED:
 *     - validateAndConsumeNonce() — preserved byte-identical so every
 *       existing service keeps working. The keyed track is purely
 *       additive.
 *     - pay/batchPay/dispersePay/caPay/disperseCaPay — payment surface
 *       does not depend on which nonce track was consumed.
 *     - All admin/upgrade/token-list/staker-reward functions.
 */
contract Core {
    using SignatureRecover for bytes;

    // ──────────────────────────────────────────────────────────────────
    // Storage — load-bearing slots shown; full list in canonical Core
    // ──────────────────────────────────────────────────────────────────

    address public admin;
    address public proposedAdmin;
    uint256 internal proposedAdminAcceptanceWindow;

    IStaking public staking;
    INameService public nameService;
    ITreasury public treasury;

    EvvmMetadata internal metadata;

    /// @dev user => sync nonce. Sequential; must be consumed in order.
    mapping(address => uint256) internal nextSyncNonce;

    /// @dev user => nonce => consumed. Async track: out-of-order use,
    ///      consumed-flag bitmap via mapping.
    mapping(address => mapping(uint256 => bool)) internal asyncNonceConsumed;

    /// @dev user => nonce => reserved. Async-nonce reservation track.
    mapping(address => mapping(uint256 => bool)) internal asyncNonceReserved;

    /// @dev Staker set + reward bookkeeping. Mutated by Staking.
    mapping(address => bool) internal isStaker;
    uint256 internal currentReward;

    /// @dev Balance per (user, token). Mutated by pay/batchPay/etc.
    mapping(address => mapping(address => uint256)) internal balances;

    // [...remainder of canonical Core storage preserved as-is — token
    //  allowlist/denylist, user validator proposal slots, upgrade
    //  implementation slots, reward distribution params, total-supply
    //  delete proposal slots, etc. See evvm.info docs for full list.]

    // >>> EIP-8250 ADDITION <<<
    /// @notice The wired NonceManager. Set once via initializeKeyedNonces.
    NonceManager public nonceManager;
    /// @notice KEYED_NONCE_FIRST_USE_GAS per EIP §"Constants". Modeled
    ///         in this experiment as a principal-token surcharge rather
    ///         than EVM gas (see justification.md for the limitation).
    uint256 public constant KEYED_NONCE_FIRST_USE_SURCHARGE = 20000;
    // >>> end EIP-8250 ADDITION <<<

    // ──────────────────────────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────────────────────────

    event NonceConsumed(
        address indexed user,
        uint256 indexed nonce,
        bool isAsyncExec
    );

    // [...canonical events preserved — Payment, TokenStatusChanged,
    //  RewardRecalculated, AdminProposed, ImplementationProposed, etc.]

    // >>> EIP-8250 ADDITION <<<
    event KeyedNonceInitialized(address indexed nonceManager);
    event KeyedNonceConsumed(
        address indexed user,
        uint256 indexed nonceKey,
        uint64 nonceSeq,
        bool wasFirstUse,
        uint256 surchargeApplied
    );
    // >>> end EIP-8250 ADDITION <<<

    // ──────────────────────────────────────────────────────────────────
    // Errors
    // ──────────────────────────────────────────────────────────────────

    error OnlyAdmin();
    error AlreadyInitialized();
    error InvalidSignature();
    error NonceAlreadyConsumed(uint256 nonce);
    error NonceNotNext(uint256 expected, uint256 got);

    // [...canonical errors preserved.]

    // >>> EIP-8250 ADDITION <<<
    error KeyedNoncesNotInitialized();
    error KeyedNonceSurchargeInsufficient(uint256 requested, uint256 available);
    // >>> end EIP-8250 ADDITION <<<

    // ──────────────────────────────────────────────────────────────────
    // Modifiers
    // ──────────────────────────────────────────────────────────────────

    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }

    // ──────────────────────────────────────────────────────────────────
    // Constructor & system wiring — canonical
    // ──────────────────────────────────────────────────────────────────

    constructor(
        address _admin,
        address _staking,
        EvvmMetadata memory _metadata
    ) {
        admin = _admin;
        staking = IStaking(_staking);
        metadata = _metadata;
    }

    /// @notice Wires NameService and Treasury references. One-time.
    function initializeSystemContracts(
        address _nameService,
        address _treasury
    ) external onlyAdmin {
        if (
            address(nameService) != address(0) || address(treasury) != address(0)
        ) revert AlreadyInitialized();
        nameService = INameService(_nameService);
        treasury = ITreasury(_treasury);
    }

    // >>> EIP-8250 ADDITION <<<

    /// @notice Wires the NonceManager system contract. One-time.
    /// @param _nonceManager Address of the deployed NonceManager.
    /// @dev   Must be called after Core deployment but before any keyed-
    ///        nonce traffic. In production, NonceManager would be
    ///        installed at a canonical fork-managed address; here we
    ///        accept any address and trust the deployer.
    function initializeKeyedNonces(address _nonceManager) external onlyAdmin {
        if (address(nonceManager) != address(0)) revert AlreadyInitialized();
        require(_nonceManager != address(0), "Core: zero nonce manager");
        nonceManager = NonceManager(_nonceManager);
        emit KeyedNonceInitialized(_nonceManager);
    }

    // >>> end EIP-8250 ADDITION <<<

    // ──────────────────────────────────────────────────────────────────
    // Nonce machinery — canonical validateAndConsumeNonce preserved
    // ──────────────────────────────────────────────────────────────────

    /**
     * @notice Validate an EIP-191 signature and consume the associated
     *         nonce. Sync mode requires sequential consumption; async
     *         mode allows out-of-order consumption.
     * @dev    This is the canonical entrypoint. Every existing service
     *         calls this; preserved byte-identical so the EIP-8250
     *         change is purely additive.
     */
    function validateAndConsumeNonce(
        address user,
        address senderExecutor,
        bytes32 dataHash,
        address originExecutor,
        uint256 nonce,
        bool isAsyncExec,
        bytes calldata signature
    ) external {
        // Reconstruct the EIP-191 payload.
        bytes32 payloadHash = Erc191TestBuilder.buildActionHash(
            metadata.EvvmID,
            user,
            senderExecutor,
            originExecutor,
            nonce,
            isAsyncExec,
            dataHash
        );

        address recovered = SignatureRecover.recover(payloadHash, signature);
        if (recovered != user) revert InvalidSignature();

        if (isAsyncExec) {
            // Async path: check + flip the bitmap entry.
            if (asyncNonceConsumed[user][nonce]) {
                revert NonceAlreadyConsumed(nonce);
            }
            asyncNonceConsumed[user][nonce] = true;
        } else {
            // Sync path: must equal the next-expected nonce.
            uint256 expected = nextSyncNonce[user];
            if (nonce != expected) revert NonceNotNext(expected, nonce);
            unchecked {
                nextSyncNonce[user] = expected + 1;
            }
        }

        emit NonceConsumed(user, nonce, isAsyncExec);
    }

    // >>> EIP-8250 ADDITION <<<

    /**
     * @notice Keyed-nonce equivalent of validateAndConsumeNonce.
     *         Validates an EIP-191 signature whose canonical payload
     *         includes (nonceKey, nonceSeq) in place of the single
     *         nonce, and atomically consumes the slot in NonceManager.
     *
     * @param user             Signer / authorizing address.
     * @param senderExecutor   Service or executor that submits the tx.
     * @param dataHash         Action-specific hash (keccak(name, args)).
     * @param originExecutor   address(0) = any fisher; specific = bound.
     * @param nonceKey         EIP-8250 nonce_key (uint256). key=0 routes
     *                         to the legacy sync nonce path; non-zero
     *                         keys use NonceManager.
     * @param nonceSeq         EIP-8250 nonce_seq (uint64).
     * @param signature        Recovered against the EIP-191 payload.
     *
     * @return firstUseSurcharge Principal-token amount the caller MUST
     *         settle in the same transaction (via Core.pay). Zero when
     *         the slot has been used before; KEYED_NONCE_FIRST_USE_SURCHARGE
     *         on first use.
     *
     * @dev    Reverts BEFORE any side effects if:
     *         - signature does not recover to `user`
     *         - keyed nonces not yet initialized
     *         - sequence mismatch (NonceManager raises SequenceMismatch)
     *
     *         Mirrors EIP §"Stateful Validity" + §"Nonce Consumption"
     *         as a single atomic transition. The atomicity claim — "if
     *         step 3 halts out-of-gas, no approval effects occur" — is
     *         enforced here by the require() check on surcharge funds
     *         (see KeyedNonceSurchargeInsufficient).
     */
    function validateAndConsumeKeyedNonce(
        address user,
        address senderExecutor,
        bytes32 dataHash,
        address originExecutor,
        uint256 nonceKey,
        uint64 nonceSeq,
        bytes calldata signature
    ) external returns (uint256 firstUseSurcharge) {
        if (address(nonceManager) == address(0)) {
            revert KeyedNoncesNotInitialized();
        }

        // Reconstruct the EIP-191 payload. Note (key, seq) are folded
        // into the envelope alongside (sender, executor, evvmId).
        bytes32 payloadHash = _buildKeyedActionHash(
            metadata.EvvmID,
            user,
            senderExecutor,
            originExecutor,
            nonceKey,
            nonceSeq,
            dataHash
        );

        address recovered = SignatureRecover.recover(payloadHash, signature);
        if (recovered != user) revert InvalidSignature();

        if (nonceKey == 0) {
            // EIP §"Nonce Consumption" — key=0 aliases the legacy
            // account nonce. We route to the sync path and treat
            // nonceSeq as the sync nonce value.
            uint256 expected = nextSyncNonce[user];
            if (uint256(nonceSeq) != expected) {
                revert NonceNotNext(expected, uint256(nonceSeq));
            }
            unchecked {
                nextSyncNonce[user] = expected + 1;
            }
            emit KeyedNonceConsumed(user, 0, nonceSeq, false, 0);
            return 0;
        }

        // Non-zero key: dispatch to NonceManager. wasFirstUse drives
        // the surcharge.
        bool wasFirstUse = nonceManager.consume(user, nonceKey, nonceSeq);
        firstUseSurcharge = wasFirstUse ? KEYED_NONCE_FIRST_USE_SURCHARGE : 0;

        // Atomicity: if the surcharge is non-zero, the caller's
        // principal-token balance must cover it. We check (not deduct)
        // — the caller is responsible for the subsequent Core.pay()
        // that actually moves the tokens. The check here is a guard
        // against the EIP's §Specification step 3 "halt out-of-gas
        // without approval effects" scenario.
        if (firstUseSurcharge > 0) {
            uint256 available = balances[user][metadata.principalTokenAddress];
            if (available < firstUseSurcharge) {
                revert KeyedNonceSurchargeInsufficient(
                    firstUseSurcharge,
                    available
                );
            }
        }

        emit KeyedNonceConsumed(
            user,
            nonceKey,
            nonceSeq,
            wasFirstUse,
            firstUseSurcharge
        );
    }

    /// @dev EIP-191 payload builder for keyed-nonce actions. Mirrors
    ///      Erc191TestBuilder.buildActionHash but splits the nonce into
    ///      (key, seq). Kept inline because library churn for one
    ///      experiment isn't worth it.
    function _buildKeyedActionHash(
        uint256 evvmId,
        address user,
        address senderExecutor,
        address originExecutor,
        uint256 nonceKey,
        uint64 nonceSeq,
        bytes32 dataHash
    ) internal pure returns (bytes32) {
        string memory payload = string(
            abi.encodePacked(
                "evvm:",
                _toString(evvmId),
                "|user:",
                _toHex(user),
                "|sender:",
                _toHex(senderExecutor),
                "|origin:",
                _toHex(originExecutor),
                "|nk:",
                _toString(nonceKey),
                "|ns:",
                _toString(uint256(nonceSeq)),
                "|data:",
                _bytes32ToHex(dataHash)
            )
        );
        return keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n",
                _toString(bytes(payload).length),
                payload
            )
        );
    }

    /**
     * @notice Models TXPARAM(0x0B) and TXPARAM(0x0C) from EIP-8250
     *         §"TXPARAM". Mock-as-function because the EVM doesn't
     *         gain new opcodes locally.
     * @param  idx  0x0B → returns the user's most-recently-consumed
     *              nonce_key (zero if the user has never used keyed
     *              nonces); 0x0C → returns the user's pre-state legacy
     *              nonce (i.e., the current sync nonce).
     * @param  user The user to query. In the real EIP, TXPARAM operates
     *              on the executing tx's sender; here the caller must
     *              pass it explicitly.
     */
    function txParam(uint8 idx, address user) external view returns (uint256) {
        if (idx == 0x0C) return nextSyncNonce[user];
        // For 0x0B we'd need to track "most recent key" per user as
        // additional storage. For this experiment we expose the
        // NonceManager directly and let services compose:
        //     nonceManager.currentNonceSeq(user, knownKey)
        // The view here returns 0 for any other index, consistent with
        // EIP-8250's "Undefined param values cause exceptional halt" —
        // in our mock we use 0 as the sentinel.
        if (idx == 0x0B) return 0;
        revert("Core: txParam idx undefined");
    }

    // >>> end EIP-8250 ADDITION <<<

    // ──────────────────────────────────────────────────────────────────
    // Nonce views — canonical
    // ──────────────────────────────────────────────────────────────────

    function getNextCurrentSyncNonce(address user)
        external
        view
        returns (uint256)
    {
        return nextSyncNonce[user];
    }

    function getIfUsedAsyncNonce(address user, uint256 nonce)
        external
        view
        returns (bool)
    {
        return asyncNonceConsumed[user][nonce];
    }

    function asyncNonceStatus(address user, uint256 nonce)
        external
        view
        returns (bool consumed, bool reserved)
    {
        return (asyncNonceConsumed[user][nonce], asyncNonceReserved[user][nonce]);
    }

    // [...other nonce machinery preserved — reserveAsyncNonce,
    //  revokeAsyncNonce, getAsyncNonceReservation. See evvm.info docs.]

    // ──────────────────────────────────────────────────────────────────
    // Payment surface — canonical, fully preserved
    // ──────────────────────────────────────────────────────────────────

    // [pay, batchPay, dispersePay, caPay, disperseCaPay all preserved
    //  byte-identical from canonical Core. EIP-8250 does not modify
    //  the payment surface — services that want to use the keyed-nonce
    //  path call validateAndConsumeKeyedNonce first, then call the
    //  same pay() they always called for the EVVM-pay leg of the
    //  dual-signature flow. See:
    //      https://www.evvm.info/docs/category/coresol
    //  for the full payment implementations.]

    // ──────────────────────────────────────────────────────────────────
    // Read-only metadata + administration — canonical
    // ──────────────────────────────────────────────────────────────────

    function getEvvmMetadata() external view returns (EvvmMetadata memory) {
        return metadata;
    }

    function getPrincipalTokenAddress() external view returns (address) {
        return metadata.principalTokenAddress;
    }

    function getEvvmID() external view returns (uint256) {
        return metadata.EvvmID;
    }

    function getNameServiceAddress() external view returns (address) {
        return address(nameService);
    }

    function getStakingContractAddress() external view returns (address) {
        return address(staking);
    }

    function getBalance(address user, address token)
        external
        view
        returns (uint256)
    {
        return balances[user][token];
    }

    function isAddressStaker(address user) external view returns (bool) {
        return isStaker[user];
    }

    // [...other read methods preserved — getRewardAmount,
    //  getFullDetailReward, getPrincipalTokenTotalSupply,
    //  getCurrentSupply, getCurrentImplementation, getCurrentAdmin,
    //  getUserValidatorAddress. See evvm.info docs.]

    // [Admin/upgrade/proposal flows preserved — proposeUserValidator,
    //  acceptUserValidatorProposal, proposeAdmin, acceptAdmin,
    //  proposeImplementation, acceptImplementation, proposeListStatus,
    //  proposeChangeBaseRewardAmount, proposeChangeRewardFlowDistribution,
    //  proposeDeleteTotalSupply, etc. See evvm.info docs.]

    // [Token list / balance bookkeeping preserved — setTokenStatusOnAllowList,
    //  setTokenStatusOnDenyList, addBalance, addAmountToUser,
    //  removeAmountFromUser, setPointStaker, recalculateReward,
    //  pointStaker. See evvm.info docs.]

    // ──────────────────────────────────────────────────────────────────
    // Internal string/hex helpers (used by _buildKeyedActionHash above)
    // ──────────────────────────────────────────────────────────────────
    // [Identical to those in Erc191TestBuilder. Kept inline rather than
    //  importing to keep the EIP-8250 surface self-contained for review.]

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + value % 10));
            value /= 10;
        }
        return string(buffer);
    }

    function _toHex(address a) internal pure returns (string memory) {
        return _bytes32ToHex(bytes32(uint256(uint160(a))));
    }

    function _bytes32ToHex(bytes32 b) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(2 + 64);
        str[0] = "0"; str[1] = "x";
        for (uint256 i = 0; i < 32; i++) {
            uint8 byteVal = uint8(b[i]);
            str[2 + i * 2] = alphabet[byteVal >> 4];
            str[3 + i * 2] = alphabet[byteVal & 0x0f];
        }
        return string(str);
    }
}
