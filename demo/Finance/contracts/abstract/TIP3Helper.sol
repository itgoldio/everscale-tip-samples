pragma ton-solidity >= 0.58.1;

interface ITIP3TokenRoot {

    /// @notice Derive TokenWallet address from owner address
    /// @param owner TokenWallet owner address
    /// @return Token wallet address
    function walletOf(address owner) external view responsible returns (address);

    /// @notice Deploy new TokenWallet
    /// @dev Can be called by anyone
    /// @param owner Token wallet owner address
    /// @param deployWalletValue Gas value to deploy
    function deployWallet(
        address owner,
        uint128 deployWalletValue
    ) external responsible returns (address);

}

abstract contract TIP3Helper {

    /// @notice Deploy new TIP3 wallet
    /// @param tip3TokenRoot TIP3 token root address
    /// @param owner Token wallet owner address
    /// @param deployWalletValue Gas value to deploy
    /// @param callbackFunction Function to send callback from responsible method
    function _deployTIP3Wallet(
        address tip3TokenRoot,
        address owner,
        uint128 deployWalletValue,
        function () callbackFunction
    ) internal pure {
        ITIP3TokenRoot(tip3TokenRoot).deployWallet{
            value: 0,
            flag: 128,
            callback: callbackFunction,
            bounce: true
        }(
            owner,
            deployWalletValue
        );
    }

    /// @notice TokenWallet address from owner address
    /// @param tip3TokenRoot TIP3 token root address
    /// @param owner TokenWallet owner address
    /// @param callbackFunction Function to send callback from responsible method
    function _walletOf(
        address tip3TokenRoot,
        address owner, 
        function () callbackFunction
    ) internal pure {
        ITIP3TokenRoot(tip3TokenRoot).walletOf{
            value: 0,
            flag: 128,
            callback: callbackFunction,
            bounce: true
        }(
            owner
        );
    }
    
}