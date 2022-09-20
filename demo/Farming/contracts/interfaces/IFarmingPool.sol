pragma ton-solidity > 0.58.1;

interface IFarmingPool {
    function finishDeposit(uint64 depositNonce, uint128 vested) external;
    function finishWithdraw(
        address user,
        uint128 vested,
        address sendGasTo,
        address nft
    ) external;
    function receiveTokenWalletAddress(address wallet) external;
    function setEndTime(uint32 farmEndTime, address sendGasTo) external;
    function withdraw(address nft, address sendGasTo) external;
    function withdrawUnclaimed(address to, address sendGasTo) external;
    function claimRewardForUser(address user, address sendGasTo) external;
    function claimReward(address sendGasTo) external;
    function getUserDataAddress(address user) external view responsible returns(address);
    function getInfo() external view responsible returns(
        bool active,
        uint128 totalDeposits,
        uint32 farmStartTime,
        uint32 farmEndTime,
        uint128 rewardPerSecond,
        uint32 lastRewardTime,
        uint256 accRewardPerShare,
        uint128 unclaimedReward,
        uint32 vestingPeriod,
        uint32 vestingRatio,
        address rewardTokenRoot,
        address rewardTokenWallet,
        uint128 rewardTokenWalletBalance
    );
}