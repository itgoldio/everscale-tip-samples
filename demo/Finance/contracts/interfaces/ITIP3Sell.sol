pragma ton-solidity ^0.58.1;

import "../abstract/Status.sol";

interface ITIP3Sell {

    /// @notice Function for cancel and destroy this contract
    /// @param sendGasTo The address where the funds will be sent
    function cancelSell(address sendGasTo) external;

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
    );

    /// @notice Get gas price
    /// @return confirmSellPrice Min gas for confirm this offer
    /// @return cancelSellPrice Min gas for cancel this offer
    /// @return transferNftPrice Gas for transfer nft to address
    /// @return processingPrice Gas for proccessing
    /// @return transferTokensPrice Gas for transfer tokens
    /// @return tokenWalletDestroyPrice Gas for destroy token wallet
    /// @return changeNftManagerPrice Gas for change NFT mananger
    function getGasPrice() external responsible view returns(
        uint128 confirmSellPrice,
        uint128 cancelSellPrice,
        uint128 transferNftPrice,
        uint128 processingPrice,
        uint128 transferTokensPrice,
        uint128 tokenWalletDestroyPrice,
        uint128 changeNftManagerPrice
    );

}