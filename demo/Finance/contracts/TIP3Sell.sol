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
import "./abstract/Status.sol";

/// @notice Library with gas constants
library TIP3SellGas {
    /// @notice Value for change NFT owner
    uint128 constant NFT_TRANSFER_GAS = 0.3 ton;
    /// @notice Value for change NFT owner
    uint128 constant PROCESSING_GAS = 0.5 ton;
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

/// @notice Library with `Checks` constants
library TIP3SellErrors {
    /// @notice Low msg.value for processing
    uint16 constant LOW_VALUE = 102;
    /// @notice Code without salt
    uint16 constant CODE_SALT_IS_NOT_EXIST = 103;
    /// @notice Code salt is not TIP3SellRoot address
    uint16 constant WRONG_CODE_SALT = 104;
    /// @notice msg.sender != TIP3 token root address
    uint16 constant SENDER_IS_NOT_TIP3_TOKEN_ROOT = 105;
    /// @notice msg.sender != owner of nft
    uint16 constant SENDER_IS_NOT_NFT_OWNER = 106;
    /// @notice msg.sender != nft address
    uint16 constant SENDER_IS_NOT_NFT = 107;
    /// @notice msg.sender != TIP3Sell token wallet
    uint16 constant SENDER_IS_SELL_TIP3_WALLET= 108;
}

contract TIP3Sell is 
    Checks,
    Status,
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

    /// @notice Value for deploy TIP3 token wallet
    uint128 _deployTIP3WalletValue;

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
        uint128 price,
        uint128 deployTIP3WalletValue
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
        require(optSalt.hasValue(), TIP3SellErrors.CODE_SALT_IS_NOT_EXIST);
        (address tip3SellRoot) = optSalt.get().toSlice().decode(address);
        require(msg.sender == tip3SellRoot,TIP3SellErrors.WRONG_CODE_SALT);
        tvm.rawReserve(0, 4);

        _setStatusType(StatusType.PENDING);

        _tip3TokenRoot = tip3TokenRoot;
        _tip3SellRoot = tip3SellRoot;
        _owner = owner;
        _sendGasTo = sendGasTo;
        _remainOnSell = remainOnSell;
        _price = price;
        _deployTIP3WalletValue = deployTIP3WalletValue;

        /// @dev Deploy TIP3 token wallet for this TIP3Sell contract
        ITokenRoot(_tip3TokenRoot).deployWallet{
            value: 0,
            flag: 128,
            callback: TIP3Sell.onDeployTIP3SellWallet,
            bounce: true
        }(
            address(this),
            _deployTIP3WalletValue
        );
    }

    /// @notice Callback function from deploy TIP3 token wallet for this TIP3Sell contract
    /// @param tip3Wallet TIP3 token wallet of this contract
    function onDeployTIP3SellWallet(address tip3Wallet) external {
        require(msg.sender == _tip3TokenRoot, TIP3SellErrors.SENDER_IS_NOT_TIP3_TOKEN_ROOT);
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
            _deployTIP3WalletValue
        );
    }

    /// @notice Callback function from deploy TIP3 token wallet for vendor (owner of NFT)
    /// @param tip3Wallet TIP3 token wallet of vendor
    function onDeployTIP3VendorWallet(address tip3Wallet) external {
        require(msg.sender == _tip3TokenRoot, TIP3SellErrors.SENDER_IS_NOT_TIP3_TOKEN_ROOT);
        tvm.rawReserve(0, 4);
        _tip3VendorWallet = tip3Wallet;

        /// @dev TIP3 token wallet for vendor success deployed
        _passCheck(TIP3SellChecks.CHECK_VENDOR_TIP3_WALLET);

        _requestManager();
    }

    /// @notice Function for cancel and destroy this contract
    /// @param sendGasTo The address where the funds will be sent
    function declineSell(address sendGasTo) external {
        require(msg.sender == _owner, TIP3SellErrors.SENDER_IS_NOT_NFT_OWNER);
        (uint128 totalGasPrice,,,) = getGasPrice();
        require(msg.value >= totalGasPrice, TIP3SellErrors.LOW_VALUE);
        tvm.rawReserve(0, 4);
        mapping(address => ITIP4_1NFT.CallbackParams) callbacks;
        TvmCell empty;
        callbacks[address(this)] = ITIP4_1NFT.CallbackParams(
            TIP3SellGas.NFT_TRANSFER_GAS,
            empty
        );
        ITIP4_1NFT(_nft).changeManager{
            value: 0,
            flag: 128,
            bounce: true
        }(
            _owner,
            sendGasTo,
            callbacks
        );
        _setStatusType(StatusType.CLOSED);
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
        require(msg.sender == _nft, TIP3SellErrors.SENDER_IS_NOT_NFT);
        if(
            address(this) == newManager && 
            _nft == msg.sender && 
            _owner == owner &&
            getStatusType() == StatusType.PENDING
        ) {
            tvm.rawReserve(_remainOnSell, 0);
            /// @dev TIP3Sell is manager
            _passCheck(TIP3SellChecks.CHECK_SELL_IS_MANGER);
            sendGasTo.transfer({
                value: 0,
                flag: 128, 
                bounce: false
            });
            _setStatusType(StatusType.READY);
        }
        else if(
            newManager == _owner &&
            getStatusType() == StatusType.CLOSED
        ) {
            tvm.accept();
            selfdestruct(sendGasTo);
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
        require(msg.sender == _tip3SellWallet, TIP3SellErrors.SENDER_IS_SELL_TIP3_WALLET);
        tvm.rawReserve(0, 4);
        (uint128 totalGasPrice,,,) = getGasPrice();
        if(
            _isCheckListEmpty() &&
            _price >= amount &&
            msg.value >= totalGasPrice &&
            _tip3TokenRoot == tokenRoot &&
            getStatusType() == StatusType.READY
        ) {
            mapping(address => ITIP4_1NFT.CallbackParams) callbacks;
            TvmBuilder builder;
            builder.store(sender, senderWallet);
            callbacks[address(this)] = ITIP4_1NFT.CallbackParams(
                TIP3SellGas.NFT_TRANSFER_GAS,
                builder.toCell()
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
            _setStatusType(StatusType.PENDING);
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
        require(msg.sender == _nft, TIP3SellErrors.SENDER_IS_NOT_NFT);
        tvm.rawReserve(0, 4);
        (address buyerWallet, address buyerTip3Wallet) = payload.toSlice().decode(address, address);
        if(
            buyerWallet == newOwner &&
            getStatusType() == StatusType.PENDING
        ) {
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
            _setStatusType(StatusType.CLOSED);
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
        if(_checkList & uint8(0x03) == 0) {
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

    /// @notice Get info method
    /// @return nft Address of NFT
    /// @return tip3TokenRoot of TIP3 token root
    /// @return tip3SellRoot of TIP3SellRoot
    /// @return tip3VendorWallet Address of TIP3 token wallet for owner of NFT
    /// @return tip3SellWallet Address of TIP3 token wallet for this TIP3Sell contract
    /// @return owner Owner address of NFT
    /// @return sendGasTo The address where the funds will be sent after checks
    /// @return remainOnSell Balance after checks
    /// @return price Price in TIP3 tokens
    /// @return status Status of this contract
    function getInfo() external view responsible returns (
        address nft,
        address tip3TokenRoot,
        address tip3SellRoot,
        address tip3VendorWallet,
        address tip3SellWallet,
        address owner,
        address sendGasTo,
        uint128 remainOnSell,
        uint128 price,
        StatusType status
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
            _price,
            getStatusType()
        );
    }

    /// @notice Get gas price
    /// @return confirmSellPrice Min gas for confirm this offer
    /// @return cancelSellPrice Min gas for cancel this offer
    /// @return transferNftPrice Gas for transfer nft to address
    /// @return processingPrice Gas for proccessing
    function getGasPrice() public responsible view returns(
        uint128 confirmSellPrice,
        uint128 cancelSellPrice,
        uint128 transferNftPrice,
        uint128 processingPrice
    ) {
        return{
            value: 0,
            flag: 64,
            bounce: true
        }(
            (
                TIP3SellGas.NFT_TRANSFER_GAS +
                TIP3SellGas.PROCESSING_GAS
            ),
            (
                TIP3SellGas.NFT_TRANSFER_GAS +
                TIP3SellGas.PROCESSING_GAS
            ),
            TIP3SellGas.NFT_TRANSFER_GAS,
            TIP3SellGas.PROCESSING_GAS
        );
    }

}