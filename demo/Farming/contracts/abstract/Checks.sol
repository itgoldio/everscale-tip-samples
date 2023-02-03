/// We recommend using the compiler version 0.58.1. 
/// You can use other versions, but we do not guarantee compatibility of the compiler version.
pragma ton-solidity >= 0.58.1;

pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;


abstract contract Checks {

    uint8 _checkList;

    constructor(
        uint8 checkList
    ) public {
        _checkList = checkList;
    }
    
    function _passCheck(uint8 check) internal virtual {
        _checkList &= ~check;
    }

    function _isCheckListEmpty() internal virtual returns(bool) {
        return (_checkList == 0);
    }

}