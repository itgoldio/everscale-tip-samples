pragma ton-solidity ^0.58.1;

import "../TIP3Sell.sol";

abstract contract TIP3SellDeploy {

    /// @notice TIP3Sell code
    TvmCell _tip3SellCode;

    /// @param tip3SellCode Init value for `_tip3SellCode`
    constructor(TvmCell tip3SellCode) public {
        _tip3SellCode = tip3SellCode;
    }

    /// @notice Deploy TIP3Sell for NFT
    /// @param tip3TokenRoot Address of TIP3 token root
    /// @param nft Address of NFT
    /// @param owner Owner address of NFT
    /// @param sendGasTo The address where the funds will be sent
    /// @param price Price in TIP3 tokens
    function _deployTIP3Sell(
        address tip3TokenRoot,
        address nft,
        address owner,
        address sendGasTo,
        uint128 remainOnSell,
        uint128 price
    ) internal {
        TvmCell codeSell = _buildSellCode(address(this));
        TvmCell stateSell = _buildSellState(_tip3SellCode, nft);
        address sellAddr = new TIP3Sell {
            stateInit: stateSell,
            value: 0,
            flag: 128
        }(
            tip3TokenRoot,
            owner,
            owner,
            remainOnSell,
            price
        );
    }

    /// @notice Get TIP3Sell code with salt
    /// @return Salted code
    function sellCode() external view responsible returns (TvmCell) {
        return {value: 0, flag: 64, bounce: false} (_buildSellCode(address(this)));
    }

    /// @notice Get TIP3Sell codehash with salt
    /// @return Salted codehash
    function sellCodeHash() external view responsible returns (uint256) {
        return {value: 0, flag: 64, bounce: false} (tvm.hash(_buildSellCode(address(this))));
    }

    /// @notice Resolve TIP3Sell address for NFT
    /// @param nft Address of NFT
    /// @return Address of TIP3Sell
    function sellAddress(address nft) external view responsible returns (address) {
        return {value: 0, flag: 64, bounce: false} (_resolveSell(nft));
    }

    /// @notice Internal resolve TIP3Sell address for NFT
    /// @param nft Address of NFT
    /// @return Address of TIP3Sell
    function _resolveSell(
        address nft
    ) internal view returns (address) {
        TvmCell code = _buildSellCode(address(this));
        TvmCell state = _buildSellState(code, nft);
        uint256 hashState = tvm.hash(state);
        return (address.makeAddrStd(address(this).wid, hashState));
    }

    /// @notice Internal get TIP3Sell code with salt
    /// @param tip3SellRoot Address of TIP3 token root
    /// @return Salted code
    function _buildSellCode(address tip3SellRoot) internal virtual view returns (TvmCell) {
        TvmBuilder salt;
        salt.store(tip3SellRoot);
        return tvm.setCodeSalt(_tip3SellCode, salt.toCell());
    }

    /// @notice Internal get TIP3Sell stateInit
    /// @param code TIP3Sell code
    /// @param nft Address of NFT
    /// @return TIP3Sell stateInit
    function _buildSellState(
        TvmCell code,
        address nft
    ) internal pure returns (TvmCell) {
        return tvm.buildStateInit({
            contr: TIP3Sell,
            varInit: {_nft: nft},
            code: code
        });
    }

}