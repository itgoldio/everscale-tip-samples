pragma ton-solidity >= 0.58.1;

pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;


import 'broxus-ton-tokens-contracts/contracts/interfaces/ITokenRoot.sol';
import 'broxus-ton-tokens-contracts/contracts/interfaces/ITokenWallet.sol';
import 'broxus-ton-tokens-contracts/contracts/interfaces/IAcceptTokensTransferCallback.sol';
import '@itgold/everscale-tip/contracts/TIP4_1/interfaces/INftChangeManager.sol';
import '@itgold/everscale-tip/contracts/TIP4_1/interfaces/ITIP4_1NFT.sol';
import '@itgold/everscale-tip/contracts/TIP4_1/TIP4_1Nft.sol';


contract NFTFarming is INftChangeManager, IAcceptTokensTransferCallback {

    struct Deposit {
        address depositor;
        address sendGasTo;
        uint startDepositTime;
    }

    // constants
    uint128 constant TOKEN_WALLET_DEPLOY_VALUE = 0.5 ton;
    uint128 constant TOKEN_WALLET_DEPLOY_GRAMS_VALUE = 0.1 ton;
    uint128 constant TOKEN_TRANSFER_VALUE = 1 ton;

    // checks
    uint8 constant CHECK_WALLET_ADDR = 1;

    uint8 _checkList;
    bool public _active = false;

    address public _collection;
    TvmCell public _codeNft;

    address public _rewardTokenRoot;
    address public _rewardTokenWallet;
    uint128 public _rewardTokenWalletBalance;

    uint128 public _farmStartTime;
    uint128 public _rewardPerSecond;
    uint128 public _lockPeriod;

    uint128 public _lastRewardTime;
    uint128 public _accRewardPerShare;

    mapping(address => Deposit) public _deposits;
    mapping(address => uint128) public _balances;

    constructor(
        address collection,
        address rewardTokenRoot,
        TvmCell codeNft,
        uint128 lockPeriod,
        uint128 farmStartTime,
        uint128 rewardPerSecond
    ) public {
        require(address(this).balance > TOKEN_WALLET_DEPLOY_VALUE);
        tvm.accept();

        _collection = collection;
        _rewardTokenRoot = rewardTokenRoot;
        _codeNft = codeNft;
        _lockPeriod = lockPeriod;
        _farmStartTime = farmStartTime;
        _rewardPerSecond = rewardPerSecond;

        _setUp();
    }

    function _setUp() internal virtual {
        _createChecks();

        ITokenRoot(_rewardTokenRoot).deployWallet{value: TOKEN_WALLET_DEPLOY_VALUE, callback: NFTFarming.receiveTokenWalletAddress}(
            address(this),
            TOKEN_WALLET_DEPLOY_GRAMS_VALUE
        );
    }    

    function _createChecks() internal {
        _checkList = CHECK_WALLET_ADDR;
    }

    function _passCheck(uint8 check) internal {
        _checkList &= ~check;
        _isCheckListEmpty();
    }

    function _isCheckListEmpty() internal {
        if  (_checkList == 0) {
            _active = true;
        }
    }

    function receiveTokenWalletAddress(
        address wallet
    ) external virtual {
        require(msg.sender == _rewardTokenRoot);
        // tvm.rawReserve(0, 4);

        _rewardTokenWallet = wallet; 
        _passCheck(CHECK_WALLET_ADDR);
    }

    function onNftChangeManager(
        uint256 id,
        address owner, 
        address oldManager, 
        address newManager, 
        address collection, 
        address sendGasTo, 
        TvmCell payload
    ) external override {
        tvm.rawReserve(0, 4);

        if (!_active || _collection != collection || _resolveNft(id, collection) != msg.sender) {
            mapping(address => ITIP4_1NFT.CallbackParams) callbacks;
            ITIP4_1NFT(msg.sender).changeManager{value: 0, flag: 128}(
                oldManager,
                sendGasTo,
                callbacks
            );
            return;
        }

        _updatePoolInfo();

        _deposits[msg.sender] = Deposit(owner, sendGasTo, now);
        if (!_balances.exists(owner)) {
            _balances[owner] = 0;
        }

        sendGasTo.transfer({value: 0, flag: 128 + 2, bounce: false});
    }

    function _resolveNft(
        uint256 id,
        address collection
    ) internal virtual view returns(address nft) {
        TvmBuilder salt;
        salt.store(collection);
        TvmCell code = tvm.setCodeSalt(_codeNft, salt.toCell());
        TvmCell state = tvm.buildStateInit({
            contr: TIP4_1Nft,
            varInit: {_id: id},
            code: code
        });
        nft = address.makeAddrStd(collection.wid, tvm.hash(state));
    }

    function onAcceptTokensTransfer(
        address tokenRoot,
        uint128 amount,
        address sender,
        address senderWallet,
        address remainingGasTo,
        TvmCell payload
    ) external override {
        require(_rewardTokenWallet == msg.sender);
        tvm.rawReserve(0, 4);

        _rewardTokenWalletBalance += amount;

        _updatePoolInfo();
        remainingGasTo.transfer({value: 0, flag: 128 + 2});
    }

    function _transferReward(
        address depositor,
        uint128 amount,
        address sendGasTo
    ) internal virtual returns (uint128 reward){
        TvmCell empty;
        ITokenWallet(_rewardTokenWallet).transfer{value: TOKEN_TRANSFER_VALUE, flag: 0}(
            amount,
            depositor,
            TOKEN_WALLET_DEPLOY_VALUE,
            sendGasTo,
            true,
            empty
        );

        _balances[depositor] -= amount;
        _rewardTokenWalletBalance -= amount;

        if (_balances[depositor] == 0) {
            delete _balances[depositor];
        }
    }

    function finishDeposit(
        address nft
    ) external virtual {
        require (_deposits.exists(nft));
        require (_deposits[nft].startDepositTime + _lockPeriod < now);
        require (_deposits[nft].depositor == msg.sender);
        require (msg.value >= TOKEN_TRANSFER_VALUE);
        tvm.rawReserve(0, 4);

        _updatePoolInfo();

        Deposit deposit = _deposits[nft];
        delete _deposits[nft];

        mapping(address => ITIP4_1NFT.CallbackParams) callbacks;
        ITIP4_1NFT(nft).changeManager{value: 0, flag: 128}(
            deposit.depositor,
            deposit.sendGasTo,
            callbacks
        );
    }

    function withdrawReward(
        uint128 amount
    ) external virtual {
        require (_balances.exists(msg.sender));
        require (msg.value > TOKEN_TRANSFER_VALUE);
        tvm.rawReserve(0, 4);
        
        _updatePoolInfo();
        require (_balances[msg.sender] >= amount && _rewardTokenWalletBalance >= amount);

        _transferReward(
            msg.sender,
            amount,
            msg.sender
        );

        msg.sender.transfer({value: 0, flag: 128 + 2});
    }

    function _getDepositsNum() internal virtual view returns(uint128) {
        uint128 counter;
        for ((address nft, Deposit deposit) : _deposits) {
            counter++; 
        }
        return counter;
    }

    function _updatePoolInfo() internal virtual {
        (uint128 lastRewardTime, uint128 accRewardPerShare) = calculateRewardData();
            
        _lastRewardTime = lastRewardTime;
        _accRewardPerShare = accRewardPerShare;

        if (_accRewardPerShare != 0) {
            _payReward();
        }
    }

    function _payReward() internal virtual {
        for ((address nft, Deposit deposit) : _deposits) {
            _balances[deposit.depositor] += _accRewardPerShare;
        }
    }

    function calculateRewardData() public virtual responsible returns(uint128 lastRewardTime, uint128 accRewardPerShare) {
        lastRewardTime = _lastRewardTime;
        accRewardPerShare = _accRewardPerShare;
    
        // reward rounds still not started, nothing to calculate
        if (now < _farmStartTime) {
            lastRewardTime = now;
            return (lastRewardTime, accRewardPerShare);
        }

        if (now > _farmStartTime) {
            if (lastRewardTime < _farmStartTime) {
                lastRewardTime = _farmStartTime;
            }

            uint128 numOfDeposits = _getDepositsNum();
            if (numOfDeposits > 0) {
                uint128 reward = _rewardPerSecond * (now - lastRewardTime);
                accRewardPerShare = reward / numOfDeposits;
                lastRewardTime = now;
            }
        }

        return {value: 0, flag: 64, bounce: false} (lastRewardTime, accRewardPerShare);
    }

    onBounce(TvmSlice slice) external virtual {
        tvm.accept();

        uint32 functionId = slice.decode(uint32);
        if (functionId == tvm.functionId(ITokenRoot.deployWallet)) {
            ITokenRoot(_rewardTokenRoot).deployWallet{value: TOKEN_WALLET_DEPLOY_VALUE, callback: NFTFarming.receiveTokenWalletAddress}(
                address(this),
                TOKEN_WALLET_DEPLOY_GRAMS_VALUE
            );
        }

    }

    function getDetails() public view responsible returns(
        bool active,
        address collection,
        address rewardTokenRoot,
        address rewardTokenWallet,
        uint128 rewardTokenWalletBalance,
        uint128 farmStartTime,
        uint128 rewardPerSecond,
        uint128 lockPeriod,
        uint128 lastRewardTime,
        uint128 accRewardPerShare
    ) {
        return {value: 0, flag: 64, bounce: false} (
            _active,
            _collection,
            _rewardTokenRoot,
            _rewardTokenWallet,
            _rewardTokenWalletBalance,
            _farmStartTime,
            _rewardPerSecond,
            _lockPeriod,
            _lastRewardTime,
            _accRewardPerShare
        );
    }

    modifier onlyActive() {
        require(_active);
        _;
    }

}
