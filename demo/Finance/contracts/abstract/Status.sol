pragma ton-solidity ^0.58.1;

/// @notice Status of TIP3Sell
enum StatusType {
    PENDING,
    READY,
    CLOSED
}

abstract contract Status {

    /// @notice Status of TIP3Sell
    StatusType private _status;

    /// @notice Set new status for TIP3Sell
    /// @param status New `StatusType` value
    function _setStatusType(StatusType status) internal {
        _status = status;
    }

    /// @notice Get `StatusType` value for TIP3Sell
    /// @return _status Value of status
    function getStatusType() public responsible view returns(StatusType) {
        return{
            value: 0, 
            flag: 64,
            bounce: true
        }(StatusType(_status));
    }

}