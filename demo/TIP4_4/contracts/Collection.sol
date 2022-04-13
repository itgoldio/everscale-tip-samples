pragma ton-solidity = 0.58.1;

pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;


import '@itgold/everscale-tip/contracts/TIP4_4/TIP4_4Collection.sol';
import '@itgold/everscale-tip/contracts/access/OwnableExternal.sol';
import './Nft.sol';

contract Collection is TIP4_4Collection, OwnableExternal {

    /// _remainOnNft - the number of crystals that will remain after the entire mint 
    /// process is completed on the Nft contract
    uint128 _remainOnNft = 0.3 ton;

    constructor(
        TvmCell codeNft, 
        uint256 ownerPubkey,
        TvmCell codeStorage
    ) TIP4_1Collection (
        codeNft
    ) OwnableExternal (
        ownerPubkey
    ) TIP4_4Collection (
        codeStorage
    ) public {
        tvm.accept();
    }

    /// @param uploader - The address of the contract that will be able to upload chunks to storage
    function mintNft(
        address uploader,
        string mimeType,
        uint128 chunksNum
    ) external virtual {
        require(msg.value > _remainOnNft + _storageDeployValue, CollectionErrors.value_is_less_than_required);
        tvm.rawReserve(0, 4);

        address storageAddr = _deployStorage(uploader, mimeType, chunksNum);
        TvmCell codeNft = _buildNftCode(address(this));
        TvmCell stateNft = _buildNftState(codeNft, uint256(_totalSupply));
        _totalSupply++;

        address nftAddr = new Nft{
            stateInit: stateNft,
            value: 0,
            flag: 128
        }(
            msg.sender,
            msg.sender,
            _remainOnNft,
            storageAddr
        ); 

        emit NftCreated(
            _totalSupply, 
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
    ) internal virtual override pure returns (TvmCell) {
        return tvm.buildStateInit({
            contr: Nft,
            varInit: {_id: id},
            code: code
        });
    }

}
