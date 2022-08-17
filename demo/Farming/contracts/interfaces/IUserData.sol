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
}