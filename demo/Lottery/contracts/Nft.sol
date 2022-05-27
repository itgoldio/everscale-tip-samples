pragma ton-solidity = 0.58.1;

pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;


import '@itgold/everscale-tip/contracts/TIP4_1/TIP4_1Nft.sol';
import '@itgold/everscale-tip/contracts/TIP4_2/TIP4_2Nft.sol';
import '@itgold/everscale-tip/contracts/TIP4_3/TIP4_3Nft.sol';
import './interfaces/ICollectionLottery.sol';
import './interfaces/INFTLottery.sol';
import './interfaces/ITokenBurned.sol';


contract Nft is TIP4_1Nft, TIP4_2Nft, TIP4_3Nft, INFTLottery {

    address _lotteryPlatfomAddress;
    bool _used;

    string[] _attributes;

    event TicketWon(uint128 winningAmount);
    event TicketLost();

    constructor(
        address owner,
        address sendGasTo,
        uint128 remainOnNft,
        string json,
        uint128 indexDeployValue,
        uint128 indexDestroyValue,
        TvmCell codeIndex,
        address lotteryPlatfomAddress  
    ) TIP4_1Nft(
        owner,
        sendGasTo,
        remainOnNft
    ) TIP4_2Nft (
        json
    ) TIP4_3Nft (
        indexDeployValue,
        indexDestroyValue,
        codeIndex
    ) public {
        _lotteryPlatfomAddress = lotteryPlatfomAddress;
        _attributes.push("Not used");
    }

    function _beforeTransfer(
        address to, 
        address sendGasTo, 
        mapping(address => CallbackParams) callbacks
    ) internal virtual override(TIP4_1Nft, TIP4_3Nft) {
        TIP4_3Nft._beforeTransfer(to, sendGasTo, callbacks);
    }   

    function _afterTransfer(
        address to, 
        address sendGasTo, 
        mapping(address => CallbackParams) callbacks
    ) internal virtual override(TIP4_1Nft, TIP4_3Nft) {
        TIP4_3Nft._afterTransfer(to, sendGasTo, callbacks);
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

    function burn(address dest) external virtual onlyManager {
        tvm.accept();
        ITokenBurned(_collection).onTokenBurned(_id, _owner, _manager);
        selfdestruct(dest);
    }
    
    function getPrize() external override {
        require(_lotteryPlatfomAddress.value != 0 && msg.sender == _lotteryPlatfomAddress);
        require(_owner == _manager);
        require(!_used);
        tvm.rawReserve(0, 4);   

        ICollectionLottery(_collection).getPrize{value: 0, flag: 128}(_id);
    }

    function receivePrize(uint128 winningAmount) external override {
        require(msg.sender == _collection);
        tvm.rawReserve(0, 4);

        _used = true;
        for (uint i = 0; i < _attributes.length; i++) {
            if (_attributes[i] == "Not used") {
                _attributes[i] = "Used";
            }
        }

        if (winningAmount == 0) {
            emit TicketLost();
        } else {
            emit TicketWon(winningAmount);
        }
        _owner.transfer({value: 0, flag: 128});
    }

    function getJson() external view override responsible returns (string json) {
        string args = "\"Attributes\":[";
        for (uint i = 0; i < _attributes.length; i++) {
            args += format("\"{}\"", _attributes[i]);
            if (i + 1 != _attributes.length) {
                args += ",";
            }
        }
        return {value: 0, flag: 64, bounce: false} (format("{},{}]}", _json.substr(0, _json.byteLength() - 1), args));
    }

}