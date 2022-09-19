pragma ton-solidity ^0.58.1;

pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;

import "@itgold/everscale-tip/contracts/access/OwnableExternal.sol";
import "@itgold/everscale-tip/contracts/TIP4_1/interfaces/INftChangeManager.sol";
import "@itgold/everscale-tip/contracts/TIP4_1/TIP4_1Nft.sol";
import "./interfaces/ITIP3SellRoot.sol";
import "./abstract/TIP3SellDeploy.sol";

/// @notice Object for pendings TIP3Sell
struct PendingOffer {
    address nft;
    address owner;
    address sendGasTo;
    uint128 price;
}

/// @notice Library with IP3SellRoot gas constants
library TIP3SellRootGas {
    /// @notice Value for proccessing
    uint128 constant PROCESSING_GAS = 0.3 ton;
    /// @notice Value for deploy TIP3 token wallet
    uint128 constant DEPLOY_TIP3_WALLET_GAS = 0.3 ton;
    /// @notice Value for change NFT manager 
    uint128 constant CHANGE_NFT_MANAGER_GAS = 0.3 ton;
    /// @notice Balance of TIP3Sell
    uint128 constant REMAIN_ON_SELL = 0.2 ton;
}

contract TIP3SellRoot is 
    ITIP3SellRoot,
    OwnableExternal,
    TIP3SellDeploy,
    INftChangeManager
{

    /// @notice Address of TIP3 token root
    address _tip3TokenRoot;

    /// @notice Map of pendings TIP3Sell
    /// @dev (TIP3Sell address => PendingOffer)
    mapping(address=>PendingOffer) _m_pending_offers;

    /// @param ownerPubkey Owner key for this contract
    /// @param tip3TokenRoot Address of TIP3 token root
    /// @param tip3SellCode TIP3Sell code
    constructor(
        uint256 ownerPubkey,
        address tip3TokenRoot,
        TvmCell tip3SellCode
    ) 
    OwnableExternal(ownerPubkey)
    TIP3SellDeploy(tip3SellCode)
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
        mapping(address => ITIP4_1NFT.CallbackParams) callbacks;
        
        /// @dev Create custom payload for stored `price`
        TvmBuilder payload;
        payload.store(price);

        (uint128 totalGasPrice,,,,) = getGasPrice();

        /// @dev Create callback from NFT
        callbacks[address(this)] = ITIP4_1NFT.CallbackParams(
            totalGasPrice,
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
            )
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
    ) external override {
        tvm.rawReserve(0, 4);
        (uint128 totalGasPrice,,,,) = getGasPrice();
        if(newManager == address(this)) {
            if(msg.value >= totalGasPrice) {
                
                /// @dev Decode `price` from custom payload
                (uint128 price) = payload.toSlice().decode(uint128);

                /// @dev Save offer data to map
                _m_pending_offers[_resolveSell(msg.sender)] = PendingOffer(
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
                    TIP3SellRootGas.REMAIN_ON_SELL,
                    price,
                    TIP3SellRootGas.DEPLOY_TIP3_WALLET_GAS
                );
            }
            /// @dev Return manager to owner of NFT
            else {
                mapping(address => ITIP4_1NFT.CallbackParams) callbacks;
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
    ) external override {
        tvm.rawReserve(0, 4);
        if(_m_pending_offers.exists(_resolveSell(nft))) {
            mapping(address => ITIP4_1NFT.CallbackParams) callbacks;
            TvmCell empty;
            callbacks[msg.sender] = ITIP4_1NFT.CallbackParams(
                TIP3SellRootGas.CHANGE_NFT_MANAGER_GAS,
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

    function getInfo() external responsible view returns(
        address tip3TokenRoot,
        mapping(address=>PendingOffer) m_pending_offers
    ) {
        return{
            value: 0,
            flag: 64,
            bounce: false
        }(
            _tip3TokenRoot,
            _m_pending_offers
        );
    }

    function getGasPrice() public responsible view returns(
        uint128 totalPrice,
        uint128 processingPrice,
        uint128 deployTIP3WalletPrice,
        uint128 changeNftManagerPrice,
        uint128 remainOnSell
    ) {
        return{
            value: 0,
            flag: 64,
            bounce: false
        }(
        (
            TIP3SellRootGas.PROCESSING_GAS +
            (TIP3SellRootGas.DEPLOY_TIP3_WALLET_GAS * 2) +
            TIP3SellRootGas.CHANGE_NFT_MANAGER_GAS + 
            TIP3SellRootGas.REMAIN_ON_SELL
        ),
        TIP3SellRootGas.PROCESSING_GAS,
        TIP3SellRootGas.DEPLOY_TIP3_WALLET_GAS,
        TIP3SellRootGas.CHANGE_NFT_MANAGER_GAS,
        TIP3SellRootGas.REMAIN_ON_SELL);
    }

}