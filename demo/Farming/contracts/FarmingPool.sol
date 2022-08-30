pragma ever-solidity >= 0.58.1;

pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;

import 'broxus-ton-tokens-contracts/contracts/interfaces/ITokenRoot.sol';
import 'broxus-ton-tokens-contracts/contracts/interfaces/ITokenWallet.sol';
import 'broxus-ton-tokens-contracts/contracts/interfaces/IAcceptTokensTransferCallback.sol';
import '@itgold/everscale-tip/contracts/TIP4_1/interfaces/INftChangeManager.sol';
import '@itgold/everscale-tip/contracts/TIP4_1/interfaces/ITIP4_1NFT.sol';
import '@itgold/everscale-tip/contracts/TIP4_1/TIP4_1Nft.sol';
import '@itgold/everscale-tip/contracts/access/OwnableInternal.sol';
import 'abstract/Checks.sol';
import 'UserData.sol';

import 'interfaces/IUserData.sol';
import 'interfaces/IFarmingPool.sol';

contract FarmingPool is IFarmingPool, INftChangeManager, IAcceptTokensTransferCallback, Checks, OwnableInternal {

    struct PendingDeposit {
        address nft;
        address owner;
        address sendGasTo;
    }

    // constants
    uint128 constant TOKEN_WALLET_DEPLOY_VALUE = 0.5 ever;
    uint128 constant TOKEN_WALLET_DEPLOY_GRAMS_VALUE = 0.1 ever;
    uint128 constant TOKEN_TRANSFER_VALUE = 1 ever;
    uint128 constant CALLBACK_VALUE = 0.1 ever;
    uint128 constant SET_END_TIME_VALUE = 0.5 ever;
    uint128 constant MIN_CALL_MSG_VALUE = 1 ever;
    uint128 constant INCREASE_DEBTf_VALUE = 0.3 ever;
    uint128 constant USER_DATA_DEPLOY_VALUE = 0.5 ever;

    uint32 constant MAX_UINT32 = 0xFFFFFFFF;
    uint128 constant SCALING_FACTOR = 1e18;

    /// errors
    uint8 constant NOT_USER_DATA = 105;
    uint8 constant ZERO_AMOUNT_INPUT = 107;
    uint8 constant LOW_WITHDRAW_MSG_VALUE = 108;
    uint8 constant BAD_FARM_END_TIME = 115;
    uint8 constant WRONG_INTERVAL = 110;

    // checks
    uint8 constant CHECK_WALLET_ADDR = 1;

    address _rewardTokenRoot;
    address _rewardTokenWallet;
    uint128 _rewardTokenWalletBalance;

    address _collection;
    TvmCell _codeNft;
    TvmCell _codeUserData;

    bool _active = false;

    uint128 _totalDeposits = 0;
    uint64 _depositNonce = 0;
    /// depositNonce (key) => depositor
    mapping (uint64 => PendingDeposit) _deposits;

    uint32 _farmStartTime;
    uint32 _farmEndTime;
    uint128 _rewardPerSecond;

    uint32 _lastRewardTime;
    uint256 _accRewardPerShare;
    uint128 _unclaimedReward;

    /// in sec
    uint32 _vestingPeriod;
    /// 1000 = 100%, 100 = 10%
    uint32 _vestingRatio;

    event RewardDeposit(address tokenRoot, uint128 amount);
    event Deposit(uint64 depositNonce, address user, address nft, uint128 reward, uint128 rewardDebt);
    event Withdraw(address user, address nft, uint128 reward, uint128 reward_debt);
    event Claim(address user, uint128 reward, uint128 reward_debt);
    event FarmEndTimeSet(uint32 time);

    constructor(
        address owner,
        address collection,
        address rewardTokenRoot,
        TvmCell codeNft,
        TvmCell codeUserData,
        uint32 farmStartTime,
        uint128 rewardPerSecond,
        uint32 vestingPeriod,
        uint32 vestingRatio
    ) OwnableInternal (
        owner
    ) Checks( 
        CHECK_WALLET_ADDR
    ) public {
        require(address(this).balance > TOKEN_WALLET_DEPLOY_VALUE);

        tvm.accept();
        _collection = collection;
        _rewardTokenRoot = rewardTokenRoot;
        _codeNft = codeNft;
        _farmStartTime = farmStartTime;
        _rewardPerSecond = rewardPerSecond;
        _vestingPeriod = vestingPeriod;
        _vestingRatio = vestingRatio;
        _codeUserData = codeUserData;

        _setUp();
    }

    function _setUp() internal view virtual {
        // Deploy reward token wallet
        ITokenRoot(_rewardTokenRoot).deployWallet{value: TOKEN_WALLET_DEPLOY_VALUE, callback: FarmingPool.receiveTokenWalletAddress}(
            address(this), // owner
            TOKEN_WALLET_DEPLOY_GRAMS_VALUE
        );
    }  

    function _passCheck(uint8 check) internal virtual override {
        _checkList &= ~check;
        if (_isCheckListEmpty()) {
            _active = true;
        }   
    }

    function receiveTokenWalletAddress(
        address wallet
    ) external virtual {
        require(msg.sender == _rewardTokenRoot);
        
        _rewardTokenWallet = wallet; 
        _passCheck(CHECK_WALLET_ADDR);
    }

    function _transferReward(
        address userDataAddr,
        address receiverAddr,
        uint128 amount,
        address sendGasTo,
        address nft
    ) internal virtual returns (uint128 reward, uint128 rewardDebt){
        reward = amount;
        rewardDebt = 0;

        if (_rewardTokenWalletBalance < amount) {
            rewardDebt = amount - _rewardTokenWalletBalance;
            reward -= rewardDebt;
        }

        if (userDataAddr != address.makeAddrNone()) {
            if (rewardDebt > 0) {
                IUserData(userDataAddr).increasePoolDebt{value: INCREASE_DEBT_VALUE, flag: 0}(rewardDebt, sendGasTo);
            }
        }

        TvmBuilder builder;
        builder.store(nft);
        if (reward > 0) {
            ITokenWallet(_rewardTokenWallet).transfer{value: TOKEN_TRANSFER_VALUE, flag: 0}(
                reward,
                receiverAddr,
                0,
                sendGasTo,
                true,
                builder.toCell()
            );
            _rewardTokenWalletBalance -= reward;
        }

        return (reward, rewardDebt);
    }

    function onAcceptTokensTransfer(
        address tokenRoot,
        uint128 amount,
        address sender,
        address senderWallet,
        address remainingGasTo,
        TvmCell payload
    ) external override virtual {
        tvm.rawReserve(0, 4);
        tokenRoot;

        if (msg.sender == _rewardTokenWallet) {
            _rewardTokenWalletBalance += amount;

            emit RewardDeposit(_rewardTokenRoot, amount);
        } else {
            ITokenWallet(senderWallet).transfer{value: 0, flag: 128}(
                    amount,
                    sender,
                    0,
                    remainingGasTo,
                    true,
                    payload
                );
                return;
        }

        remainingGasTo.transfer(0, false, 128);
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
        payload;

        if (
            !_active || 
            _collection != collection || 
            _resolveNft(id, collection) != msg.sender ||
            newManager != address(this)
        ) {
            mapping(address => ITIP4_1NFT.CallbackParams) callbacks;
            ITIP4_1NFT(msg.sender).changeManager{value: 0, flag: 128, bounce: false}(
                oldManager,
                sendGasTo,
                callbacks
            );
            return;
        }

        _updatePoolInfo();
    
        _totalDeposits++;
        PendingDeposit deposit = PendingDeposit(msg.sender, owner, sendGasTo);
        _deposits[_depositNonce] = deposit;
        _depositNonce++;
    
        address userDataAddr = getUserDataAddress(owner);
        IUserData(userDataAddr).processDeposit{value: 0, flag: 128}(_depositNonce, msg.sender, _accRewardPerShare, _lastRewardTime, _farmEndTime);
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

    function finishDeposit(uint64 depositNonce, uint128 vested) external virtual override {
        PendingDeposit deposit = _deposits[depositNonce];
        address expectedAddr = getUserDataAddress(deposit.owner);
        require (expectedAddr == msg.sender, NOT_USER_DATA);
        tvm.rawReserve(0, 4);

        (
            uint128 reward,
            uint128 rewardDebt
        ) = _transferReward(expectedAddr, deposit.owner, vested, deposit.sendGasTo, deposit.nft);

        emit Deposit(depositNonce, deposit.owner, deposit.nft, reward, rewardDebt);
        delete _deposits[depositNonce];

        deposit.sendGasTo.transfer(0, false, 128);
    }

    function finishWithdraw(
        address user,
        uint128 vested,
        address sendGasTo,
        address nft
    ) external virtual override {
        address expectedAddr = getUserDataAddress(user);
        require (expectedAddr == msg.sender, NOT_USER_DATA);
        tvm.rawReserve(0, 4);

        (
        uint128 reward,
        uint128 rewardDebt
        ) = _transferReward(expectedAddr, user, vested, sendGasTo, nft);

        // withdraw is called
        if (nft.value != 0) {
            _totalDeposits -= 1;

            emit Withdraw(user, nft, reward, rewardDebt);
            mapping(address => ITIP4_1NFT.CallbackParams) callbacks;
            ITIP4_1NFT(nft).changeManager{value: 0, flag: 128, bounce: false}(
                user,
                sendGasTo,
                callbacks
            );
        // claim is called
        } else {
            emit Claim(user, reward, rewardDebt);
            sendGasTo.transfer(0, false, 128);
        }
    }

    function _updatePoolInfo() internal virtual {
        (uint32 lastRewardTime, uint256 accRewardPerShare, uint128 unclaimedReward) = calculateRewardData();
        _lastRewardTime = lastRewardTime;
        _accRewardPerShare = accRewardPerShare;
        _unclaimedReward = unclaimedReward;
    }

    function _getMultiplier(uint32 from, uint32 to) internal virtual view returns(uint32) {
        require (from <= to, WRONG_INTERVAL);

        uint32 farmEndTime = _farmEndTime > 0 ? _farmEndTime : MAX_UINT32;
        if ((from > _farmEndTime) || (to < _farmStartTime)) {
            return 0;
        }

        if (to > _farmEndTime) {
            to = _farmEndTime;
        }

        if (from < _farmStartTime) {
            from = _farmStartTime;
        }

        return to - from;
    }

    function calculateRewardData() public virtual view returns (uint32 lastRewardTime, uint256 accRewardPerShare, uint128 unclaimedReward) {
        lastRewardTime = _lastRewardTime;
        accRewardPerShare = _accRewardPerShare;
        unclaimedReward = _unclaimedReward;

        if (now < _farmStartTime) {
            lastRewardTime = now;
            return (lastRewardTime, accRewardPerShare, unclaimedReward);
        }

        if (now > lastRewardTime) {
            if (lastRewardTime < _farmStartTime) {
                lastRewardTime = math.min(_farmStartTime, now);
            }

            if (lastRewardTime >= _farmStartTime) {
                uint32 multiplier = _getMultiplier(lastRewardTime, now);
                uint128 newReward = _rewardPerSecond * multiplier;
                uint32 newRewardTime;
                newRewardTime = math.min(now, _farmEndTime);

                if (_totalDeposits == 0) {
                    unclaimedReward += newReward;
                } else {
                    uint256 scaledReward = uint256(newReward) * SCALING_FACTOR;
                    accRewardPerShare += scaledReward / _totalDeposits;

                }

                lastRewardTime = newRewardTime;
            }
        }
        return (lastRewardTime, accRewardPerShare, unclaimedReward);
    }

    function setEndTime(uint32 farmEndTime, address sendGasTo) external virtual onlyOwner {
        require (msg.value >= SET_END_TIME_VALUE);
        require (farmEndTime >= now, BAD_FARM_END_TIME);
        require (_farmEndTime == 0, BAD_FARM_END_TIME);

        tvm.rawReserve(0, 4);
        
        _farmEndTime = farmEndTime;
        emit FarmEndTimeSet(_farmEndTime);
        sendGasTo.transfer(0, false, 128);
    }

    function withdraw(address nft, address sendGasTo) external virtual {
        require (nft.value != 0, ZERO_AMOUNT_INPUT);
        require (msg.value >= MIN_CALL_MSG_VALUE + TOKEN_TRANSFER_VALUE, LOW_WITHDRAW_MSG_VALUE);
        tvm.rawReserve(0, 4);

        _updatePoolInfo();

        address userDataAddr = getUserDataAddress(msg.sender);
        IUserData(userDataAddr).processWithdraw{value: 0, flag: 128}(nft, _accRewardPerShare, _lastRewardTime, _farmEndTime, sendGasTo);
    }

    function withdrawUnclaimed(address to, address sendGasTo) external virtual onlyOwner {
        require (msg.value >= MIN_CALL_MSG_VALUE + TOKEN_TRANSFER_VALUE, LOW_WITHDRAW_MSG_VALUE);
        tvm.rawReserve(0, 4);

        _transferReward(address.makeAddrNone(), to, _unclaimedReward, sendGasTo, address.makeAddrNone());
        _unclaimedReward = 0;

        sendGasTo.transfer(0, false, 128);
    }

    function claimRewardForUser(address user, address sendGasTo) external {
        require (msg.value >= MIN_CALL_MSG_VALUE + TOKEN_TRANSFER_VALUE, LOW_WITHDRAW_MSG_VALUE);
        tvm.rawReserve(0, 4);

        _updatePoolInfo();

        address userDataAddr = getUserDataAddress(user);
        IUserData(userDataAddr).processClaimReward{value: 0, flag: 128}(_accRewardPerShare, _lastRewardTime, _farmEndTime, sendGasTo);
    }

    function claimReward(address sendGasTo) external virtual {
        require (msg.value >= MIN_CALL_MSG_VALUE + TOKEN_TRANSFER_VALUE, LOW_WITHDRAW_MSG_VALUE);
        tvm.rawReserve(0, 4);

        _updatePoolInfo();

        address userDataAddr = getUserDataAddress(msg.sender);
        IUserData(userDataAddr).processClaimReward{value: 0, flag: 128}(_accRewardPerShare, _lastRewardTime, _farmEndTime, sendGasTo);
    }

    function _buildUserInitData(address user) internal virtual view returns (TvmCell) {
        return tvm.buildStateInit({
            contr: UserData,
            varInit: {
                _farmPool: address(this),
                _user: user
            },
            code: _codeUserData
        });
    }

    function getUserDataAddress(address user) public virtual view responsible returns (address) {
        return { value: 0, flag: 64, bounce: false } address(tvm.hash(_buildUserInitData(user)));
    }

    function deployUserData(address userDataOwner) internal view virtual returns (address) {
        return new UserData{
            stateInit: _buildUserInitData(userDataOwner),
            value: USER_DATA_DEPLOY_VALUE
        }(
            _vestingPeriod,
            _vestingRatio
        );
    }

    function getInfo() public view responsible returns(
        bool active,
        uint128 totalDeposits,
        uint32 farmStartTime,
        uint32 farmEndTime,
        uint128 rewardPerSecond,
        uint32 lastRewardTime,
        uint256 accRewardPerShare,
        uint128 unclaimedReward,
        uint32 vestingPeriod,
        uint32 vestingRatio
    ) {
        return{
            value: 0,
            flag: 64,
            bounce: false
        }( 
            _active,
            _totalDeposits,
            _farmStartTime,
            _farmEndTime,
            _rewardPerSecond,
            _lastRewardTime,
            _accRewardPerShare,
            _unclaimedReward,
            _vestingPeriod,
            _vestingRatio
        );
    }

    onBounce(TvmSlice slice) external virtual {
        tvm.accept();

        uint32 functionId = slice.decode(uint32);
        // if processing failed - contract was not deployed. Deploy and try again
        if (functionId == tvm.functionId(UserData.processDeposit)) {
            tvm.rawReserve(0, 4);

            uint64 nonce = slice.decode(uint64);
            PendingDeposit deposit = _deposits[nonce];
            address userDataAddr = deployUserData(deposit.owner);
            ITokenRoot(_rewardTokenRoot).deployWallet{value: TOKEN_WALLET_DEPLOY_VALUE, callback: FarmingPool.dummy}(
                deposit.owner,
                TOKEN_WALLET_DEPLOY_GRAMS_VALUE // deploy grams
            );

            IUserData(userDataAddr).processDeposit{value: 0, flag: 128}(nonce, deposit.nft, _accRewardPerShare, _lastRewardTime, _farmEndTime);
        }
    }

    function dummy(address user_wallet) external view virtual { tvm.rawReserve(0, 4); }
}
