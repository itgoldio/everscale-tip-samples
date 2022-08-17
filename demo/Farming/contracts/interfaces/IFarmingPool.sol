pragma ton-solidity > 0.58.1;

interface IFarmingPool {
    function finishDeposit(uint64 depositNonce, uint128 vested) external;
    function finishWithdraw(
        address user,
        uint128 vested,
        address sendGasTo,
        address nft
    ) external;
}