pragma ever-solidity >= 0.58.1;

pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;


import '@itgold/everscale-tip/contracts/TIP4_1/TIP4_1Collection.sol';
import '@itgold/everscale-tip/contracts/access/OwnableExternal.sol';
import './Nft.sol';


contract Collection is TIP4_1Collection, OwnableExternal {

    /**
    * Errors
    **/
    uint8 constant sender_is_not_owner = 101;
    uint8 constant value_is_less_than_required = 102;

    /// _remainOnNft - the number of crystals that will remain after the entire mint 
    /// process is completed on the Nft contract
    uint128 _remainOnNft = 0.3 ton;

    constructor(
        TvmCell codeNft, 
        uint256 ownerPubkey
    ) OwnableExternal(
        ownerPubkey
    ) TIP4_1Collection (
        codeNft
    ) public {
        tvm.accept();
    }

    function mintNft() external virtual {
        require(msg.value > _remainOnNft + 0.1 ton, value_is_less_than_required);
        tvm.rawReserve(0, 4);

        uint256 id = uint256(_totalSupply);
        _totalSupply++;

        TvmCell codeNft = _buildNftCode(address(this));
        TvmCell stateNft = _buildNftState(codeNft, id);
        address nftAddr = new Nft{
            stateInit: stateNft,
            value: 0,
            flag: 128
        }(
            msg.sender,
            msg.sender,
            _remainOnNft
        ); 

        emit NftCreated(
            id, 
            nftAddr,
            msg.sender,
            msg.sender, 
            msg.sender
        );
    
    }

    function setRemainOnNft(uint128 remainOnNft) external virtual {
        require(TIP4_1Collection._isOwner(), sender_is_not_owner);
        _remainOnNft = remainOnNft;
    } 

    function _isOwner() internal override onlyOwner returns(bool){
        return true;
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