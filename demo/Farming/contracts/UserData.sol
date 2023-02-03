pragma ton-solidity >= 0.58.1;

pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;

import 'interfaces/IUserData.sol';
import 'interfaces/IFarmingPool.sol';

contract UserData is IUserData {

    uint8 constant NOT_FARM_POOL = 101;

    uint128 constant SCALING_FACTOR = 1e18;
    uint32 constant MAX_VESTING_RATIO = 1000;

    address static _farmPool;
    address static _user;
    
    uint32 _lastRewardTime;
    uint32 _vestingPeriod;
    // number from 0 to 1000 (0% to 100%). 0 means vesting is disabled
    uint32 _vestingRatio;

    uint32 _vestingTime;
    uint128 _rewardDebt;
    uint128 _entitled;
    uint128 _poolDebt;

    /// nft addresses
    address[] public _deposits;

    constructor(
        uint32 vestingPeriod,
        uint32 vestingRatio
    ) public { 
        require(msg.sender == _farmPool);

        _vestingPeriod = vestingPeriod;
        _vestingRatio = vestingRatio;
    }

    function pendingReward(
        uint256 accRewardPerShare,
        uint32 poolLastRewardTime,
        uint32 farmEndTime
    ) external view override returns (uint128 entitled, uint128 vested, uint128 poolDebt, uint32 vestingTime) {
        (
            entitled,
            vested,
            vestingTime
        ) = _computeVesting(uint128(_deposits.length), _rewardDebt, accRewardPerShare, poolLastRewardTime, farmEndTime);

        return (entitled, vested, poolDebt, vestingTime);
    }
    
    function _isEven(uint64 num) internal pure returns (bool) {
        return (num / 2) == 0 ? true : false;
    }

    function _rangeSum(uint64 range) internal pure returns (uint64) {
        if (_isEven(range)) {
            return (range / 2) * range + (range / 2);
        }
        return ((range / 2) + 1) * range;
    }

    // interval should be less than max
    function _rangeIntervalAverage(uint32 interval, uint32 max) internal pure returns (uint256) {
        return (_rangeSum(uint64(interval)) * SCALING_FACTOR) / max;
    }

    // only applied if _interval is bigger than vestingPeriod, will throw integer overflow otherwise
    function _computeVestedForInterval(uint128 entitled, uint32 interval) internal view returns (uint128, uint128) {
        uint32 periodsPassed = ((interval / _vestingPeriod) - 1);
        uint32 fullVestedPart = periodsPassed * _vestingPeriod + interval % _vestingPeriod;
        uint32 partlyVestedPart = interval - fullVestedPart;

        // get part of entitled reward that already vested, because their vesting period is passed
        uint128 clearPart1 = uint128((((fullVestedPart * SCALING_FACTOR) / interval) * entitled) / SCALING_FACTOR);
        uint128 vestedPart = entitled - clearPart1;

        // now calculate vested share of remaining part
        uint256 clearPart2Share = _rangeIntervalAverage(partlyVestedPart, _vestingPeriod) / partlyVestedPart;
        uint128 clearPart2 = uint128(vestedPart * clearPart2Share / SCALING_FACTOR);
        uint128 remainingEntitled = vestedPart - clearPart2;

        return (clearPart1 + clearPart2, remainingEntitled);
    }

    function _computeVestedForNewlyEntitled(
        uint128 entitled, 
        uint32 poolLastRewardTime, 
        uint32 farmEndTime
    ) internal view returns (uint128 vested) {
        if (entitled == 0) {
            return 0;
        }
        if (farmEndTime == 0 || poolLastRewardTime < farmEndTime) {
            uint32 age = poolLastRewardTime - _lastRewardTime;

            if (age > _vestingPeriod) {
                (uint128 vestedPart, uint128 _) = _computeVestedForInterval(entitled, age);
                return vestedPart;
            } else {
                uint256 clearPartShare = _rangeIntervalAverage(age, _vestingPeriod) / age;
                return uint128(entitled * clearPartShare / SCALING_FACTOR);
            }
        } else {
            uint32 ageBefore = farmEndTime - _lastRewardTime;
            uint32 ageAfter = math.min(poolLastRewardTime - farmEndTime, _vestingPeriod);

            uint128 vestedBefore;
            uint128 entitledBefore;
            if (ageBefore > _vestingPeriod) {
                (vestedBefore, entitledBefore) = _computeVestedForInterval(entitled, ageBefore);
            } else {
                uint256 clearPartShare = _rangeIntervalAverage(ageBefore, _vestingPeriod) / ageBefore;
                vestedBefore = uint128(entitled * clearPartShare / SCALING_FACTOR);
                entitledBefore = entitled - vestedBefore;
            }

            uint128 vestedAfter = entitledBefore * ageAfter / _vestingPeriod;
            return (vestedBefore + vestedAfter);
        }
    }

    function _computeVesting(
        uint128 amount,
        uint128 rewardDebt,
        uint256 accRewardPerShare,
        uint32 poolLastRewardTime,
        uint32 farmEndTime
    ) internal view returns (uint128, uint128, uint32) {
        uint32 newVestingTime;
        uint128 newlyVested;
        uint128 updatedEntitled;
        uint128 newEntitled;

        uint256 reward = uint256(amount) * accRewardPerShare;
        newEntitled = uint128(reward / SCALING_FACTOR) - rewardDebt;
        if (_vestingRatio > 0) {
            uint128 vestingPart = (newEntitled * _vestingRatio) / MAX_VESTING_RATIO;
            uint128 clearPart = newEntitled - vestingPart;

            if (_lastRewardTime < farmEndTime || farmEndTime == 0) {
                newlyVested = _computeVestedForNewlyEntitled(vestingPart, poolLastRewardTime, farmEndTime);
            } else {
                // no new entitled rewards after farm end, nothing to compute
                newlyVested = 0;
            }

            uint32 age2 = poolLastRewardTime >= _vestingTime ? _vestingPeriod : poolLastRewardTime - _lastRewardTime;
            uint256 vested = uint256(_entitled) * age2;
            uint128 toVest = age2 >= _vestingPeriod
                ? _entitled
                : uint128(vested / (_vestingTime - _lastRewardTime));

            uint128 remainingEntitled = _entitled == 0 ? 0 : _entitled - toVest;
            uint128 unreleasedNewly = vestingPart - newlyVested;
            uint128 pending = remainingEntitled + unreleasedNewly;

            if (pending == 0) {
                newVestingTime = poolLastRewardTime;
            } else if (remainingEntitled == 0) {
                newVestingTime = poolLastRewardTime + _vestingPeriod;
            } else if (unreleasedNewly == 0) {
                newVestingTime = _vestingTime;
            } else {
                uint32 age3 = _vestingTime - poolLastRewardTime;
                uint32 period = uint32(((remainingEntitled * age3) + (unreleasedNewly * _vestingPeriod)) / pending);
                newVestingTime = poolLastRewardTime + math.min(period, _vestingPeriod);
            }

            newVestingTime = farmEndTime > 0 ? math.min(farmEndTime + _vestingPeriod, newVestingTime) : newVestingTime;
            updatedEntitled = _entitled + vestingPart - toVest - newlyVested;
            newlyVested += toVest + clearPart;
        } else {
            newlyVested = newEntitled;
        }

        return (updatedEntitled, newlyVested, newVestingTime);
    }

    function increasePoolDebt(uint128 poolDebt, address sendGasTo) external override {
        require(msg.sender == _farmPool, NOT_FARM_POOL);
        tvm.rawReserve(0, 4);

        _poolDebt += poolDebt;

        sendGasTo.transfer(0, false, 128);
    }

    function processDeposit(
        uint64 depositNonce,
        address nft, 
        uint256 accRewardPerShare, 
        uint32 poolLastRewardTime, 
        uint32 farmEndTime
    ) external override {
        require(msg.sender == _farmPool, NOT_FARM_POOL);
        tvm.rawReserve(0, 4);

        uint128 prevAmount = uint128(_deposits.length);
        uint128 prevRewardDebt = _rewardDebt;

        _deposits.push(nft);
        uint256 reward = _deposits.length * accRewardPerShare;
        _rewardDebt = uint128(reward / SCALING_FACTOR);

        (
            uint128 entitled,
            uint128 vested,
            uint32 vestingTime
        ) = _computeVesting(prevAmount, prevRewardDebt, accRewardPerShare, poolLastRewardTime, farmEndTime);
        _entitled = entitled;
        _vestingTime = vestingTime;
        _lastRewardTime = poolLastRewardTime;

        vested += _poolDebt;
        _poolDebt = 0;

        IFarmingPool(msg.sender).finishDeposit{value: 0, flag: 128}(depositNonce, vested);
    }

    function _withdraw(
        address nft,
        uint256 accRewardPerShare, 
        uint32 poolLastRewardTime, 
        uint32 farmEndTime, 
        address sendGasTo
    ) internal {
        uint128 prevAmount = uint128(_deposits.length);
        uint128 prevRewardDebt = _rewardDebt;

        for (uint i = 0; i < _deposits.length; i++) {
            if (nft == _deposits[i]) {
                delete _deposits[i];
                _deposits[i] = _deposits[_deposits.length - 1];
                _deposits.pop();
            }
        }

        uint256 reward = uint128(_deposits.length) * accRewardPerShare;
        _rewardDebt = uint128(reward / SCALING_FACTOR);

        (
            uint128 entitled,
            uint128 vested,
            uint32 vestingTime
        ) = _computeVesting(prevAmount, prevRewardDebt, accRewardPerShare, poolLastRewardTime, farmEndTime);
        _entitled = entitled;
        _vestingTime = vestingTime;
        _lastRewardTime = poolLastRewardTime;

        vested += _poolDebt;
        _poolDebt = 0;

        IFarmingPool(msg.sender).finishWithdraw{value: 0, flag: 128}(_user, vested, sendGasTo, nft);
    }

    function processWithdraw(
        address nft,
        uint256 accRewardPerShare,
        uint32 poolLastRewardTime,
        uint32 farmEndTime,
        address sendGasTo
    ) external override {
        require (msg.sender == _farmPool, NOT_FARM_POOL);
        tvm.rawReserve(0, 4);

        _withdraw(nft, accRewardPerShare, poolLastRewardTime, farmEndTime, sendGasTo);
    }

    function processClaimReward(
        uint256 accRewardPerShare, 
        uint32 poolLastRewardTime, 
        uint32 farmEndTime, 
        address sendGasTo
    ) external override {
        require (msg.sender == _farmPool, NOT_FARM_POOL);
        tvm.rawReserve(0, 4);

        _withdraw(address(0), accRewardPerShare, poolLastRewardTime, farmEndTime, sendGasTo);
    }

    function getInfo() public view override responsible returns(
        uint32 lastRewardTime,
        uint32 vestingPeriod,
        uint32 vestingRatio,
        uint128 amount,
        uint32 vestingTime,
        uint128 rewardDebt,
        uint128 entitled,
        uint128 poolDebt
    ) {
        return {value: 0, flag: 64, bounce: false} (
            _lastRewardTime,
            _vestingPeriod,
            _vestingRatio,
            uint128(_deposits.length),
            _vestingTime,
            _rewardDebt,
            _entitled,
            _poolDebt
        );
    }

}
