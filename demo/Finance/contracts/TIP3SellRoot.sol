pragma ton-solidity ^0.58.1;

pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;

import "@itgold/everscale-tip/contracts/access/OwnableExternal.sol";
import "@itgold/everscale-tip/contracts/TIP4_1/interfaces/INftChangeManager.sol";
import "@itgold/everscale-tip/contracts/TIP4_1/TIP4_1Nft.sol";
import "@itgold/everscale-tip/contracts/TIP6/TIP6.sol";
import "./interfaces/ITIP3SellRoot.sol";
import "./abstract/TIP3SellDeploy.sol";

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

interface TIP3SellRootEvents {
    /// @notice Event for deploy TIP3Sell contract
    event SellCreated(address sell, address nft, uint128 price);
}

contract TIP3SellRoot is 
    ITIP3SellRoot,
    OwnableExternal,
    TIP3SellDeploy,
    INftChangeManager,
    TIP3SellRootEvents,
    TIP6
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

        /// @dev TIP6
        _supportedInterfaces[
            bytes4(tvm.functionId(ITIP3SellRoot.buildSellMsg)) ^
            bytes4(tvm.functionId(ITIP3SellRoot.changeManagerToSell)) ^
            bytes4(tvm.functionId(ITIP3SellRoot.getInfo)) ^
            bytes4(tvm.functionId(ITIP3SellRoot.getGasPrice))
        ] = true;

        _supportedInterfaces[
            bytes4(tvm.functionId(INftTransfer.onNftTransfer))
        ] = true;

        _supportedInterfaces[
            bytes4(tvm.functionId(ITIP6.supportsInterface))
        ] = true;
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
                address sell = _deployTIP3Sell(
                    _tip3TokenRoot,
                    msg.sender,
                    owner,
                    sendGasTo,
                    TIP3SellRootGas.REMAIN_ON_SELL,
                    price,
                    TIP3SellRootGas.DEPLOY_TIP3_WALLET_GAS
                );
                emit SellCreated(sell, msg.sender, price);
            }
            /// @dev Return manager to owner of NFT
            else {
                mapping(address => ITIP4_1NFT.CallbackParams) callbacks;
                ITIP4_1NFT(msg.sender).changeManager{
                    value: 0,
                    flag: 128,
                    bounce: false
                }(
                    oldManager,
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
        require(
            _m_pending_offers.exists(_resolveSell(nft)) &&
            _resolveSell(nft) == msg.sender
        );
        tvm.rawReserve(0, 4);
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

    /// @notice Get contract info
    /// @return tip3TokenRoot Token root address
    /// @return m_pending_offers List of pinding offers
    function getInfo() external override responsible view returns(
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

    /// @notice Get gas prices
    /// @param totalPrice Sell process price
    /// @param processingPrice Gas for processing
    /// @param deployTIP3WalletPrice Gas for deploy token wallet
    /// @param changeNftManagerPrice Gas for change nft manager
    /// @param remainOnSell Balance of `TIP3Sell`
    function getGasPrice() public override responsible view returns(
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

    /// @notice Clear pending offers map
    function clearPendingOffers() external onlyOwner {
        tvm.accept();
        delete _m_pending_offers;
    }

    /// @notice Method for withdrawing funds from a contract
    /// @param dest The address where the funds will be sent
    /// @param value Amount of funds
    /// @param bounce Safe withdraw flag
    function withdraw(address dest, uint128 value, bool bounce) external pure onlyOwner {
        tvm.accept();
        dest.transfer(value, bounce, 0);
    }

    /// @notice Method for destroy this contract
    /// @param dest The address where the funds will be sent
    function destroy(address dest) external onlyOwner {
        tvm.accept();
        selfdestruct(dest);
    }

}