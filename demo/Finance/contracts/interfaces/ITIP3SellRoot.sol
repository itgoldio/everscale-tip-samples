pragma ton-solidity ^0.58.1;

/// @notice Object for pendings TIP3Sell
struct PendingOffer {
    address nft;
    address owner;
    address sendGasTo;
    uint128 price;
}

interface ITIP3SellRoot {

    /// @notice Create payload to sell NFT (change manager to this contract)
    /// @dev Send this payload from NFT owner wallet to NFT
    /// @param sendGasTo The address where the funds will be sent
    /// @param price Price of NFT (TIP3 tokens)
    /// @return Payload
    function buildSellMsg( 
        address sendGasTo,
        uint128 price
    ) external responsible view returns(TvmCell);

    /// @notice Send message to NFT for change manager to TIP3Sell
    /// @param nft Address of NFT
    /// @param sendGasTo Address to send remaining gas
    function changeManagerToSell(
        address nft,
        address sendGasTo
    ) external;

    /// @notice Get contract info
    /// @return tip3TokenRoot Token root address
    /// @return m_pending_offers List of pinding offers
    function getInfo() external responsible view returns(
        address tip3TokenRoot,
        mapping(address=>PendingOffer) m_pending_offers
    );

    /// @notice Get gas prices
    /// @param totalPrice Sell process price
    /// @param processingPrice Gas for processing
    /// @param deployTIP3WalletPrice Gas for deploy token wallet
    /// @param changeNftManagerPrice Gas for change nft manager
    /// @param remainOnSell Balance of `TIP3Sell`
    function getGasPrice() external responsible view returns(
        uint128 totalPrice,
        uint128 processingPrice,
        uint128 deployTIP3WalletPrice,
        uint128 changeNftManagerPrice,
        uint128 remainOnSell
    );

}