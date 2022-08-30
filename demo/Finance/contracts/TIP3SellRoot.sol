pragma ton-solidity >= 0.58.1;

pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;

import "@itgold/everscale-tip/contracts/access/OwnableExternal.sol";
import "@itgold/everscale-tip/contracts/TIP4_1/interfaces/INftChangeManager.sol";
import "@itgold/everscale-tip/contracts/TIP4_1/TIP4_1NFT.sol";
import "./abstract/TIP3Helper.sol";

/// @notice Object for pendings TIP3Sell
struct PendingOffer {
    address nft,
    address owner,
    address sendGasTo,
    uint128 price
}

/// @notice Library with IP3SellRoot gas constants
library TIP3SellRootGas {
    /// @notice Minimal gas value for proccessing
    uint128 constant MIN_PROCESSING_GAS = 1 ton;
    /// @notice Value for change NFT manager 
    uint128 constant CHANGE_MANAGER_GAS = 0.3 ton;
}

contract TIP3SellRoot is 
    OwnableExternal,
    TIP3Helper
    INftChangeManager
{

    /// @notice Address of TIP3 token root
    address _tip3TokenRoot;

    /// @notice Balance of TIP3Sell
    uint128 _remainOnSell = 0.2 ton;

    /// @notice Map of pendings TIP3Sell
    /// @dev (TIP3Sell address => PendingOffer)
    mapping(address=>PendingOffer) _m_pending_offers;

    /// @param ownerPubkey Owner key for this contract
    /// @param tip3TokenRoot Address of TIP3 token root
    /// @param tip3SellCode TIP3Sell code
    constructor(
        uint256 ownerPubkey,
        address tip3TokenRoot,
        TvmCelll tip3SellCode
    ) 
    OwnableExternal(ownerPubkey)
    TIP3Helper(tip3SellCode)
    public {
        tvm.accept();
        _tip3TokenRoot = tip3TokenRoot;
    }

    /// @notice Create payload to sell NFT (change manager to this contract)
    /// @dev Send this payload from NFT owner wallet to NFT
    /// @param sendGasTo The address where the funds will be sent
    /// @param price Price of NFT (TIP3 tokens)
    /// @return Payload
    function buildSellMsg( 
        address sendGasTo,
        uint128 price
    ) external override responsible view returns(TvmCell) {
        mapping(address => CallbackParams) callbacks;
        
        /// @dev Create custom payload for stored `price`
        TvmBuilder payload;
        payload.store(price);

        /// @dev Create callback from NFT
        callbacks[address.this] = CallbackParams(
            TIP3SellRootGas.MIN_PROCESSING_GAS +
            TIP3SellRootGas.CHANGE_MANAGER_GAS,
            payload.toCell()
        );

        return{
            value: 0,
            flag: 64,
            bounce: false
        }(
            tvm.encodeBody(
                ITIP4_1NFT.changeManager, 
                address(this),
                sendGasTo,
                callbacks
            );
        );
    }

    /// @notice Change owner callback processing
    /// @param id Unique NFT id
    /// @param owner Address of nft owner
    /// @param oldManager Address of nft manager before manager changed
    /// @param newManager Address of new nft manager
    /// @param collection Address of collection smart contract that mint the NFT
    /// @param sendGasTo - Address to send remaining gas
    /// @param payload - Custom payload
    function onNftChangeManager(
        uint256 id, 
        address owner, 
        address oldManager, 
        address newManager, 
        address collection, 
        address sendGasTo, 
        TvmCell payload
    ) external {
        tvm.rawReserve(0, 4);
        if(newManager == address(this)) {
            if(msg.value >= TIP3SellRootGas.MIN_PROCESSING_GAS) {
                
                /// @dev Decode `price` from custom payload
                (uint128 price) = payload.toSlice().decode(uint128);

                /// @dev Save offer data to map
                _m_pending_offers[_resolveSell(msg.sender)] = (
                    msg.sender,
                    owner,
                    sendGasTo,
                    price
                );

                /// @dev Deploy TIP3Sell contract
                _deployTIP3Sell(
                    _tip3TokenRoot,
                    msg.sender,
                    owner,
                    sendGasTo,
                    _remainOnSell,
                    price
                );
            }
            /// @dev Return manager to owner of NFT
            else {
                mapping(address => CallbackParams) callbacks;
                ITIP4_1NFT(msg.sender).changeManager{
                    value: 0,
                    flag: 128,
                    bounce: false
                }(
                    owner,
                    sendGasTo,
                    callbacks
                );
            }
        }
        else {
            sendGasTo.transfer({
                value: 0,
                flag: 128 + 2,
                bounce: false
            });
        }
    }

    /// @notice Send message to NFT for change manager to TIP3Sell
    /// @param nft Address of NFT
    /// @param sendGasTo Address to send remaining gas
    function changeManagerToSell(
        address nft,
        address sendGasTo
    ) external {
        tvm.rawReserve(0, 4);
        if(_m_pending_offers.exists(_resolveSell(msg.sender))) {
            mapping(address => CallbackParams) callbacks;
            TvmCell empty;
            callbacks[msg.sender] = CallbackParams(
                TIP3SellRootGas.CHANGE_MANAGER_GAS,
                empty
            );
            ITIP4_1NFT(nft).changeManager{
                value: 0,
                flag: 128,
                bounce: false
            }(
                msg.sender,
                sendGasTo,
                callbacks
            );
            delete _m_pending_offers[_resolveSell(nft)];
        }
        else {
            sendGasTo.transfer({
                value: 0,
                flag: 128 + 2,
                bounce: false
            });
        }
    }

}