// ItGold.io Contracts (v1.0.0) 

pragma ton-solidity = 0.58.1;

pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;


import '@itgold/everscale-tip/contracts/TIP4_1/TIP4_1Nft.sol';
import '@itgold/everscale-tip/contracts/TIP4_4/TIP4_4Nft.sol';

contract Nft is TIP4_1Nft, TIP4_4Nft {

    constructor(
        address owner,
        address sendGasTo,
        uint128 remainOnNft,
        address storageAddr
    ) TIP4_1Nft(
        owner,
        sendGasTo,
        remainOnNft
    ) TIP4_4Nft (
        storageAddr
    ) public {
        tvm.accept();
    }

    modifier onlyManager virtual override(TIP4_1Nft, TIP4_4Nft) {
        require(msg.sender == _manager, NftErrors.sender_is_not_manager);
        require(_active);
        _;
    }

}