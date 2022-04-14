pragma ton-solidity = 0.58.1;

pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;

import '@itgold/everscale-tip/contracts/TIP4_1/TIP4_1Collection.sol';
import '@itgold/everscale-tip/contracts/TIP4_2/TIP4_2Collection.sol';
import '@itgold/everscale-tip/contracts/access/OwnableExternal.sol';
import './Nft.sol';

library CustomCollectionErrors {
    uint16 constant value_is_less_than_required = 103;
    uint16 constant wrong_bulk_mint_parameters = 104;
}

contract Collection is TIP4_1Collection, TIP4_2Collection, OwnableExternal {

    /// _remainOnNft - the number of crystals that will remain after the entire mint 
    /// process is completed on the Nft contract
    uint128 _remainOnNft = 0.3 ton;

    constructor(
        TvmCell codeNft, 
        uint256 ownerPubkey,
        string json
    ) OwnableExternal(
        ownerPubkey
    ) TIP4_1Collection (
        codeNft
    ) TIP4_2Collection (
        json
    ) public {
        tvm.accept();
    }

    function mintNft(
        uint256 quantity,
        string[] json
    ) external virtual {
        require(msg.value >= (_remainOnNft + 0.2 ton) * quantity, CustomCollectionErrors.value_is_less_than_required);
        require(json.length == quantity, CustomCollectionErrors.wrong_bulk_mint_parameters);
        tvm.rawReserve(0, 4);
        for(uint256 i = 0; i < quantity; i++){
            _mintNft(json[i]);
        }
    }

    function _mintNft(
        string json
    ) internal virtual {
        uint256 id = uint256(_totalSupply);
        _totalSupply++;

        TvmCell codeNft = _buildNftCode(address(this));
        TvmCell stateNft = _buildNftState(codeNft, id);
        address nftAddr = new Nft{
            stateInit: stateNft,
            value: _remainOnNft + 0.1 ton,
            flag: 1
        }(
            msg.sender,
            msg.sender,
            _remainOnNft,
            json
        ); 

        emit NftCreated(
            id, 
            nftAddr,
            msg.sender,
            msg.sender, 
            msg.sender
        );
    }

    function setRemainOnNft(uint128 remainOnNft) external virtual onlyOwner {
        _remainOnNft = remainOnNft;
    } 

    function _buildNftState(
        TvmCell code,
        uint256 id
    ) internal virtual override(TIP4_1Collection, TIP4_2Collection) pure returns (TvmCell) {
        return tvm.buildStateInit({
            contr: Nft,
            varInit: {_id: id},
            code: code
        });
    }

}