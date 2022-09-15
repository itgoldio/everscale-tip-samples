pragma ton-solidity ^0.58.1;

pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;

import "@itgold/everscale-tip/contracts/TIP4_1/interfaces/INftChangeManager.sol";
import "@itgold/everscale-tip/contracts/TIP4_1/interfaces/INftTransfer.sol";
import "@itgold/everscale-tip/contracts/TIP4_1/interfaces/ITIP4_1NFT.sol";
import "broxus-ton-tokens-contracts/contracts/interfaces/IAcceptTokensTransferCallback.sol";
import "broxus-ton-tokens-contracts/contracts/interfaces/ITokenWallet.sol";
import "broxus-ton-tokens-contracts/contracts/interfaces/ITokenRoot.sol";
import "broxus-ton-tokens-contracts/contracts/interfaces/ITokenWallet.sol";
import "./interfaces/ITIP3SellRoot.sol";
import "./abstract/Checks.sol";

/// @notice Library with gas constants
library TIP3SellGas {
    /// @notice Value for deploy TIP3 token wallet
    uint128 constant DEPLOY_TIP3_WALLET_GAS = 0.3 ton;
    /// @notice Value for change NFT owner
    uint128 constant CONFIRM_OFFER_GAS = 0.5 ton;
    /// @notice Value for change NFT owner
    uint128 constant NFT_TRANSFER_GAS = 0.3 ton;
}

/// @notice Library with `Checks` constants
library TIP3SellChecks {
    /// @notice TIP3 token wallet for `TIP3Sell` success deployed
    uint8 constant CHECK_SELL_TIP3_WALLET = 1;
    /// @notice TIP3 token wallet for vendor success deployed
    uint8 constant CHECK_VENDOR_TIP3_WALLET = 2;
    /// @notice TIP3Sell is manager
    uint8 constant CHECK_SELL_IS_MANGER = 4;
}

contract TIP3Sell is 
    Checks,
    IAcceptTokensTransferCallback
{

    /// @notice StateInit data field
    /// Address of NFT
    address static _nft;
    
    /// @notice Address of TIP3 token root
    address _tip3TokenRoot;

    /// @notice Address of TIP3SellRoot
    address _tip3SellRoot;

    /// @notice Address of TIP3 token wallet for owner of NFT
    address _tip3VendorWallet;

    /// @notice Address of TIP3 token wallet for this TIP3Sell contract
    address _tip3SellWallet;

    /// @notice Owner address of NFT
    address _owner;

    /// @notice The address where the funds will be sent after checks
    address _sendGasTo;

    /// @notice TIP3Sell balance after checks
    uint128 _remainOnSell;

    /// @notice Price of NFT (TIP3 tokens)
    uint128 _price;

    /// @param tip3TokenRoot Address of TIP3 token root
    /// @param owner Owner address of NFT
    /// @param sendGasTo The address where the funds will be sent after checks
    /// @param remainOnSell TIP3Sell balance after checks
    /// @param price Price of NFT (TIP3 tokens)
    constructor(
        address tip3TokenRoot,
        address owner,
        address sendGasTo,
        uint128 remainOnSell,
        uint128 price
    )
    Checks(
        uint8(
            TIP3SellChecks.CHECK_SELL_TIP3_WALLET |
            TIP3SellChecks.CHECK_VENDOR_TIP3_WALLET |
            TIP3SellChecks.CHECK_SELL_IS_MANGER
        )
    ) 
    public {

        /// @dev Decode salt from code
        optional(TvmCell) optSalt = tvm.codeSalt(tvm.code());
        require(optSalt.hasValue());
        (address tip3SellRoot) = optSalt.get().toSlice().decode(address);
        require(msg.sender == tip3SellRoot);
        tvm.rawReserve(0, 4);

        _tip3TokenRoot = tip3TokenRoot;
        _tip3SellRoot = tip3SellRoot;
        _owner = owner;
        _sendGasTo = sendGasTo;
        _remainOnSell = remainOnSell;
        _price = price;

        /// @dev Deploy TIP3 token wallet for this TIP3Sell contract
        ITokenRoot(_tip3TokenRoot).deployWallet{
            value: 0,
            flag: 128,
            callback: TIP3Sell.onDeployTIP3SellWallet,
            bounce: true
        }(
            address(this),
            TIP3SellGas.DEPLOY_TIP3_WALLET_GAS
        );
    }

    /// @notice Callback function from deploy TIP3 token wallet for this TIP3Sell contract
    /// @param tip3Wallet TIP3 token wallet of this contract
    function onDeployTIP3SellWallet(address tip3Wallet) external {
        tvm.rawReserve(0, 4);
        _tip3SellWallet = tip3Wallet;
        
        /// @dev TIP3 token wallet for `TIP3Sell` success deployed
        _passCheck(TIP3SellChecks.CHECK_SELL_TIP3_WALLET);

        /// @dev Deploy TIP3 token wallet for vendor (onwer of NFT)
        ITokenRoot(_tip3TokenRoot).deployWallet{
            value: 0,
            flag: 128,
            callback: TIP3Sell.onDeployTIP3VendorWallet,
            bounce: true
        }(
            _owner,
            TIP3SellGas.DEPLOY_TIP3_WALLET_GAS
        );
    }

    /// @notice Callback function from deploy TIP3 token wallet for vendor (owner of NFT)
    /// @param tip3Wallet TIP3 token wallet of vendor
    function onDeployTIP3VendorWallet(address tip3Wallet) external {
        tvm.rawReserve(0, 4);
        _tip3VendorWallet = tip3Wallet;

        /// @dev TIP3 token wallet for vendor success deployed
        _passCheck(TIP3SellChecks.CHECK_VENDOR_TIP3_WALLET);

        _requestManager();
    }

    /// @notice change owner callback processing
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
        require(msg.sender == _nft);
        tvm.rawReserve(_remainOnSell, 0);
        if(
            address(this) == newManager && 
            _nft == msg.sender && 
            _owner == owner
        ) {
            /// @dev TIP3Sell is manager
            _passCheck(TIP3SellChecks.CHECK_SELL_IS_MANGER);
            sendGasTo.transfer({
                value: 0,
                flag: 128, 
                bounce: false
            });
        }
        else {
            sendGasTo.transfer({
                value: 0,
                flag: 128,
                bounce: false
            });
        }
    } 

    /// @notice Callback from TokenWallet on receive tokens transfer
    /// @param tokenRoot TokenRoot of received tokens
    /// @param amount Received tokens amount
    /// @param sender Sender TokenWallet owner address
    /// @param senderWallet Sender TokenWallet address
    /// @param remainingGasTo Address specified for receive remaining gas
    /// @param payload Additional data attached to transfer by sender
    function onAcceptTokensTransfer(
        address tokenRoot,
        uint128 amount,
        address sender,
        address senderWallet,
        address remainingGasTo,
        TvmCell payload
    ) external override {
        require(msg.sender == _tip3SellWallet);
        tvm.rawReserve(0, 4);
        if(
            _isCheckListEmpty() &&
            _price >= amount &&
            msg.value >= TIP3SellGas.CONFIRM_OFFER_GAS &&
            _tip3TokenRoot == tokenRoot
        ) {
            mapping(address => ITIP4_1NFT.CallbackParams) callbacks;
            TvmCell empty;
            _tip3VendorWallet = senderWallet;
            callbacks[msg.sender] = ITIP4_1NFT.CallbackParams(
                TIP3SellGas.NFT_TRANSFER_GAS,
                empty
            );
            ITIP4_1NFT(_nft).transfer{
                value: 0,
                flag: 128,
                bounce: true
            }(
                sender,
                remainingGasTo,
                callbacks
            );
        }
        else {
            TvmCell empty;
            ITokenWallet(_tip3SellWallet).transferToWallet{
                value: 0, 
                flag: 128,
                bounce: false
            }(
                amount,
                senderWallet,
                remainingGasTo,
                true,
                empty
            );
        }
    }

    /// @notice change owner callback processing
    /// @param id Unique NFT id
    /// @param oldOwner Address of NFT owner before transfer
    /// @param newOwner Address of new NFT owner
    /// @param oldManager Address of NFT manager before transfer
    /// @param newManager Address of new NFT manager
    /// @param collection Address of collection smart contract that mint the NFT
    /// @param gasReceiver Address to send remaining gas
    /// @param payload Custom payload
    function onNftTransfer(
        uint256 id,
        address oldOwner,
        address newOwner,
        address oldManager,
        address newManager,
        address collection,
        address gasReceiver,
        TvmCell payload
    ) external {
        require(msg.sender == _nft);
        tvm.rawReserve(0, 4);
        if(_tip3VendorWallet == newOwner) {
            TvmCell empty;
            ITokenWallet(_tip3SellWallet).transferToWallet{
                value: 0, 
                flag: 128,
                bounce: false
            }(
                _price,
                _tip3VendorWallet,
                _sendGasTo,
                true,
                empty
            );
        }
        else {
            _sendGasTo.transfer({
                value: 0,
                flag: 128,
                bounce: false
            });
        }
    }

    /// @notice Request transfer manager to this contract from TIP3SellRoot, after TIP3 token wallets deploy
    function _requestManager() internal {
        if( _checkList & uint8(0x03) == 0) {
            ITIP3SellRoot(_tip3SellRoot).changeManagerToSell{
                value: 0,
                flag: 128,
                bounce: false
            }(
                _nft,
                _sendGasTo
            );
        }
    }

    function getInfo() external view responsible returns (
        address nft,
        address tip3TokenRoot,
        address tip3SellRoot,
        address tip3VendorWallet,
        address tip3SellWallet,
        address owner,
        address sendGasTo,
        uint128 remainOnSell,
        uint128 price
    ) {
        return{
            value: 0,
            flag: 64,
            bounce: false
        }(
            _nft,
            _tip3TokenRoot,
            _tip3SellRoot,
            _tip3VendorWallet,
            _tip3SellWallet,
            _owner,
            _sendGasTo,
            _remainOnSell,
            _price
        );
    }

}