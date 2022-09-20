pragma ton-solidity > 0.58.1;

interface IUserData {

    function increasePoolDebt(uint128 poolDebt, address sendGasTo) external;
    function processDeposit(
        uint64 depositNonce,
        address nft, 
        uint256 accRewardPerShare, 
        uint32 poolLastRewardTime, 
        uint32 farmEndTime
    ) external;
    function processWithdraw(
        address nft,
        uint256 accRewardPerShare,
        uint32 poolLastRewardTime,
        uint32 farmEndTime,
        address sendGasTo
    ) external;
    function processClaimReward(
        uint256 accRewardPerShare, 
        uint32 poolLastRewardTime, 
        uint32 farmEndTime, 
        address sendGasTo
    ) external;
    function pendingReward(
        uint256 accRewardPerShare,
        uint32 poolLastRewardTime,
        uint32 farmEndTime
    ) external view returns (
        uint128 entitled, 
        uint128 vested, 
        uint128 poolDebt, 
        uint32 vestingTime
    );
    function getInfo() external view responsible returns(
        uint32 lastRewardTime,
        uint32 vestingPeriod,
        uint32 vestingRatio,
        uint128 amount,
        uint32 vestingTime,
        uint128 rewardDebt,
        uint128 entitled,
        uint128 poolDebt
    );

}