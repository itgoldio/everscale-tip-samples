pragma ton-solidity = 0.58.1;

pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;


import '@itgold/everscale-tip/contracts/TIP4_1/TIP4_1Nft.sol';
import '@itgold/everscale-tip/contracts/TIP4_2/TIP4_2Nft.sol';
import '@itgold/everscale-tip/contracts/TIP4_3/TIP4_3Nft.sol';
import './interfaces/ITokenBurned.sol';
import './abstract/GameManager.sol';
import './libraries/JSONAttributes.sol';

contract Nft is TIP4_1Nft, TIP4_2Nft, TIP4_3Nft, GameManager {

    /// @notice Test game params for json attribute
    uint32 _points;
    string _rarity;

    constructor(
        address owner,
        address gameManager,
        address sendGasTo,
        uint128 remainOnNft,
        string json,
        uint128 indexDeployValue,
        uint128 indexDestroyValue,
        TvmCell codeIndex
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
    ) GameManager (
        gameManager
    )
    public {
        tvm.accept();
    }

    /// See interfaces/ITIP4_2JSON_Metadata.sol
    function getJson() external view override responsible returns (string json) {
        return {value: 0, flag: 64, bounce: false} (
            /// @dev Add attributes from contract storage to json
            /// Use JSONAttributes library to build json with dynamic attributes
            JSONAttributes.buildAdd(
                /// @dev Defualt `Nft` json
                _json,
                [
                    /// @dev Array of attribute types
                    ATTRIBUTE_TYPE.ANY,
                    ATTRIBUTE_TYPE.STRING
                ],
                [
                    /// @dev Array of attribute `trait_type`
                    "Points",
                    "Rarity"
                ],
                [
                    /// @dev Array of attribute `value`
                    /// All data must be formatted into a string
                    format("{}", _points),
                    _rarity
                ]
            )
        );
    }

    /// @notice Function for set `_points` attribute
    /// @param points New value for `_points`
    function setPoints(uint32 points) external onlyGameManager metadataAccess(true) {
        tvm.rawReserve(0, 4);
        _points = points;
        msg.sender.transfer({
            value: 0,
            flag: 128 + 2,
            bounce: false
        });
    }

    /// @notice Function for set `_rarity` attribute
    /// @param rarity New value for `_rarity`
    function setRarity(string rarity) external onlyGameManager metadataAccess(true) {
        tvm.rawReserve(0, 4);
        _rarity = rarity;
        msg.sender.transfer({
            value: 0,
            flag: 128 + 2,
            bounce: false
        });
    }

    /// @notice Getter for `_points`
    /// @return points Value of '_points' attribute
    function getPoints() external responsible view returns(uint32 points) {
        return{
            value: 0,
            flag: 64,
            bounce: false
        }(_points);
    }

    /// @notice Getter for `_rarity`
    /// @return rarity Value of '_rarity' attribute
    function getRarity() external responsible view returns(string rarity) {
        return{
            value: 0,
            flag: 64,
            bounce: false
        }(_rarity);
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

}