pragma ton-solidity = 0.58.1;

interface INFTLottery {
    function getPrize() external;
    function receivePrize(uint128 winningAmount) external;
}