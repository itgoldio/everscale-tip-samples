// ItGold.io Contracts (v1.0.0) 

pragma ton-solidity = 0.58.1;

pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;


import '@itgold/everscale-tip/contracts/TIP4_1/TIP4_1Nft.sol';
import '@itgold/everscale-tip/contracts/TIP4_3/TIP4_3Nft.sol';
import '@itgold/everscale-tip/contracts/TIP4_4/TIP4_4Nft.sol';
import '@itgold/everscale-tip/contracts/TIP4_4/Storage.sol';
import './interfaces/ITokenBurned.sol';


contract Nft is TIP4_1Nft, TIP4_3Nft, TIP4_4Nft {

    /// Token params
    string _name;
    string _description;

    constructor(
        address owner,
        address sendGasTo,
        uint128 remainOnNft,
        string name,
        string description,
        uint128 indexDeployValue,
        uint128 indexDestroyValue,
        TvmCell codeIndex,
        address storageAddr
    ) TIP4_1Nft(
        owner,
        sendGasTo,
        remainOnNft
    ) TIP4_3Nft (
        indexDeployValue,
        indexDestroyValue,
        codeIndex
    ) TIP4_4Nft (
        storageAddr
    ) public {
        tvm.accept();
    
        _name = name;
        _description = description;
    }

    function _beforeChangeOwner(
        address oldOwner, 
        address newOwner,
        address sendGasTo, 
        mapping(address => CallbackParams) callbacks
    ) internal virtual override(TIP4_1Nft, TIP4_3Nft) {
        TIP4_3Nft._beforeChangeOwner(oldOwner, newOwner, sendGasTo, callbacks);
    }   

    function _afterChangeOwner(
        address oldOwner, 
        address newOwner,
        address sendGasTo, 
        mapping(address => CallbackParams) callbacks
    ) internal virtual override(TIP4_1Nft, TIP4_3Nft) {
        TIP4_3Nft._afterChangeOwner(oldOwner, newOwner, sendGasTo, callbacks);
    }

    function name() public view responsible returns(string nftName) {
        return {value: 0, flag: 64, bounce: false}(_name);
    }

    function description() public view responsible returns(string nftDescription) {
        return {value: 0, flag: 64, bounce: false}(_description);
    }

    function burn(address dest) external virtual onlyManager {
        tvm.accept();
        Storage(_storage).destruct(dest);
        ITokenBurned(_collection).onTokenBurned(_id, _owner, _manager);
        selfdestruct(dest);
    }

    modifier onlyManager virtual override(TIP4_1Nft, TIP4_4Nft) {
        require(msg.sender == _manager, NftErrors.sender_is_not_manager);
        require(_active);
        _;
    }

}