pragma ton-solidity >= 0.58.1;

import "@itgold/everscale-tip/contracts/TIP4_1/interfaces/ITIP4_1NFT.sol";

interface ITIP3SellRoot {

    /// @notice Create payload to sell NFT (change manager to this contract)
    /// @dev Send this payload from NFT owner wallet to NFT
    /// @param sendGasTo The address where the funds will be sent
    /// @param price Price of NFT (TIP3 tokens)
    /// @return Payload
    function buildSellMsg( 
        address sendGasTo,
        uint128 price
    ) external override responsible view returns(TvmCell);

    /// @notice Send message to NFT for change manager to TIP3Sell
    /// @param nft Address of NFT
    /// @param sendGasTo Address to send remaining gas
    function changeManagerToSell(
        address nft,
        address sendGasTo
    ) external;

}