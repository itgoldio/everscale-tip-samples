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
    uint16 constant sender_is_not_collection = 104;
    uint16 constant amount_is_zero = 105;
}

contract Collection is TIP4_1Collection, TIP4_2Collection, OwnableExternal {

    /// ID_SEPARATOR_SLOT - a location slot of the insertion in the json template
    uint32 constant ID_SEPARATOR_SLOT = 39;

    /// JSON_TEMPLATE - json schema for an nft contract, modified during minting
    string constant JSON_TEMPLATE = "{\"type\":\"Basic NFT\",\"name\":\"Uniq Item #\",\"description\":\"BulkMint NFT\",\"preview\":{\"source\":\"https://ipfs.grandbazar.io/ipfs/hash\",\"width\":24,\"height\":24,\"size\":240,\"format\":\"png\",\"mimetype\":\"image/png\"},\"files\":[{\"source\":\"https://ipfs.grandbazar.io/ipfs/hash\",\"width\":24,\"height\":24,\"size\":240,\"format\":\"png\",\"mimetype\":\"image/png\"}],\"external_url\":\"https://grandbazar.io/item/address\"}";

    /// _remainOnNft - the number of crystals that will remain after the entire mint 
    /// process is completed on the Nft contract
    uint128 _remainOnNft = 0.3 ton;
    uint128 _mintNftValue = _remainOnNft + 0.1 ton;
    uint128 _processingValue = 0.1 ton;

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

    function bulkMintNft(uint32 amount) external view virtual {
        require(amount > 0, CustomCollectionErrors.amount_is_zero);
        require(msg.value >= (_mintNftValue + _processingValue) * amount, CustomCollectionErrors.value_is_less_than_required);
        tvm.rawReserve(0, 4);
        _invokeMint(msg.sender, amount, 0);
    }

    function _invokeMint(
        address owner,
        uint32 amount,
        uint32 currentIteration
    ) internal pure virtual {
        if(currentIteration < amount) {
            Collection(address(this)).mintNft{value: 0, flag: 128}(owner, amount, currentIteration);
        } else {
            owner.transfer({value: 0, flag: 128, bounce: false});
        }
    }

    function mintNft(
        address owner,
        uint32 amount,
        uint32 currentIteration
    ) external virtual {
        require(msg.sender == address(this), CustomCollectionErrors.sender_is_not_collection);
        tvm.rawReserve(0, 4);
        uint256 id = uint256(_totalSupply);
        _totalSupply++;

        TvmCell codeNft = _buildNftCode(address(this));
        TvmCell stateNft = _buildNftState(codeNft, id);
        address nftAddr = new Nft{
            stateInit: stateNft,
            value: _mintNftValue,
            flag: 0
        }(
            owner,
            owner,
            _remainOnNft,
            getNftJson(id)
        ); 

        emit NftCreated(
            id, 
            nftAddr,
            owner,
            owner, 
            owner
        );

        currentIteration++;
        _invokeMint(owner, amount, currentIteration);
    }

    function getNftJson(uint256 id) public pure returns(string json) {
        string head = JSON_TEMPLATE.substr(0, ID_SEPARATOR_SLOT);
        string tail = JSON_TEMPLATE.substr(ID_SEPARATOR_SLOT);
        json = head + format("{}", id) + tail;
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