pragma ton-solidity = 0.58.1;

interface ITokenBurned {
    function onTokenBurned(uint256 id, address owner, address manager) external;
}