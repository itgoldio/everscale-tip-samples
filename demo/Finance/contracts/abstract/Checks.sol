pragma ton-solidity ^0.58.1;

pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;

abstract contract Checks {

    /// @notice list of checks
    uint8 _checkList;

    /// @param checkList Init list of checks
    constructor(
        uint8 checkList
    ) public {
        _checkList = checkList;
    }
    
    /// @notice Pass check
    /// @param check Check uint8 constant
    function _passCheck(uint8 check) internal virtual {
        _checkList &= ~check;
    }

    /// @notice Get true for `_checkList` is == 0
    /// @return Bool value if empty
    function _isCheckListEmpty() internal virtual returns(bool) {
        return (_checkList == 0);
    }

}