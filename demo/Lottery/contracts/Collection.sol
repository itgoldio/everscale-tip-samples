pragma ton-solidity = 0.58.1;

pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;


import '@itgold/everscale-tip/contracts/TIP4_2/TIP4_2Collection.sol';
import '@itgold/everscale-tip/contracts/TIP4_3/TIP4_3Collection.sol';
import '@itgold/everscale-tip/contracts/access/OwnableExternal.sol';
import './interfaces/ITokenBurned.sol';
import './interfaces/ICollectionLottery.sol';
import './interfaces/INFTLottery.sol';
import './Nft.sol';


contract Collection is TIP4_2Collection, TIP4_3Collection, OwnableExternal, ITokenBurned, ICollectionLottery {

    struct Award {
        uint128 numOfWinners;
        uint128 winningAmount;
    }

    /**
    * Errors
    **/
    uint8 constant sender_is_not_owner = 101;
    uint8 constant value_is_less_than_required = 102;
    uint8 constant all_nfts_have_been_created = 103;

    /// _remainOnNft - the number of crystals that will remain after the entire mint 
    /// process is completed on the Nft contract
    uint128 _remainOnNft = 0.3 ever;

    uint128 _lastTokenId;

    uint128 _mintingFee;

    uint128 _editionAmount;
    uint128 _ticketsNotPlayed;

    Award[] public _awards;

    event NftAwarded(address nft, uint128 random, uint128 winningAmount);

    constructor(
        TvmCell codeNft, 
        TvmCell codeIndex,
        TvmCell codeIndexBasis,
        uint256 ownerPubkey,
        string json,
        uint128 mintingFee,
        Award[] awards,
        uint128 editionAmount
    ) OwnableExternal(
        ownerPubkey
    ) TIP4_1Collection (
        codeNft
    ) TIP4_2Collection (
        json
    ) TIP4_3Collection (
        codeIndex,
        codeIndexBasis
    ) public {
        tvm.accept();

        _mintingFee = mintingFee;
        _awards = awards;
        _editionAmount = editionAmount;
        _ticketsNotPlayed = editionAmount;
    }

    function mintNft(
        string json,
        address delegatedPlayerAddress
    ) external virtual {
        require(msg.value > _remainOnNft + _mintingFee + (2 * _indexDeployValue), value_is_less_than_required);
        require(_lastTokenId < _editionAmount, all_nfts_have_been_created);
        /// reserve original_balance + _mintingFee 
        tvm.rawReserve(_mintingFee, 4);

        uint256 id = _lastTokenId;
        _totalSupply++;
        _lastTokenId++;

        TvmCell codeNft = _buildNftCode(address(this));
        TvmCell stateNft = _buildNftState(codeNft, id);
        address nftAddr = new Nft{
            stateInit: stateNft,
            value: 0,
            flag: 128
        }(
            msg.sender,
            msg.sender,
            _remainOnNft,
            json,
            _indexDeployValue,
            _indexDestroyValue,
            _codeIndex,
            delegatedPlayerAddress
        ); 

        emit NftCreated(
            id, 
            nftAddr,
            msg.sender,
            msg.sender, 
            msg.sender
        );
    }
    
    function getTotalParticipants() public view responsible returns(uint128 totalParticipants) {
        return {value: 0, flag: 64, bounce: false} (_ticketsNotPlayed);
    }

    function getPrize(uint256 id) external override {
        require(msg.sender == _resolveNft(id));

        uint128 random = _genNumber(_ticketsNotPlayed);

        uint128 countPrize = 0;
        uint128 prize = 0;
        bool break_ = false;

        for (uint i = 0; i < _awards.length; i++) {
            if (break_ == false)
            {
                countPrize += _awards[i].numOfWinners;
                if (countPrize > random)
                {
                    prize = _awards[i].winningAmount;
                    if (_awards[i].numOfWinners > 0) {
                        _awards[i].numOfWinners--;
                    }
                    _ticketsNotPlayed--;
                    break_ = true; 
                }
            }
        }
        
        emit NftAwarded(msg.sender, random, prize);
        INFTLottery(msg.sender).receivePrize{value: prize + msg.value, flag: 1}(prize);
    }

    function _genNumber(uint256 limit) private pure returns(uint128 number) {
        tvm.accept();

        rnd.shuffle();
        number = uint128(rnd.next(limit));
    }

    function genNumber(uint256 limit) public pure returns(uint128 number) {
        tvm.accept();

        rnd.shuffle();
        number = uint128(rnd.next(limit));
    }

    function withdraw(address dest, uint128 value) external pure onlyOwner {
        tvm.accept();
        dest.transfer(value, true);
    }

    function onTokenBurned(uint256 id, address owner, address manager) external override {
        require(msg.sender == _resolveNft(id));
        emit NftBurned(id, msg.sender, owner, manager);
        _totalSupply--;
    }

    function setRemainOnNft(uint128 remainOnNft) external virtual onlyOwner {
        _remainOnNft = remainOnNft;
    } 

    function setMintingFee(uint128 mintingFee) external virtual onlyOwner {
        _mintingFee = mintingFee;
    }

    function mintingFee() external view responsible returns(uint128) {
        return {value: 0, flag: 64, bounce: false}(_mintingFee);
    }

    function _isOwner() internal override onlyOwner returns(bool){
        return true;
    }

    function _buildNftState(
        TvmCell code,
        uint256 id
    ) internal virtual override(TIP4_2Collection, TIP4_3Collection) pure returns (TvmCell) {
        return tvm.buildStateInit({
            contr: Nft,
            varInit: {_id: id},
            code: code
        });
    }

}
