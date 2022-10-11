pragma ton-solidity = 0.58.1;

/// @title Abstract contract for manage attribute params
abstract contract GameManager {

    /// @notice Flag for access to change state of attribute params
    bool _metadataAccess;

    /// @notice Address of manager, which can edit attribute params
    address _gameManager;

    /// @notice Event for change `_gameManager`
    /// @param oldGameManager Old `_gameManager` value
    /// @param newGameManager New `_gameManager` value
    event ChangeGameManager(address oldGameManager, address newGameManager);

    /// @notice Event for change access to change state of attribute params
    /// @param metadataAccess Access flag
    event ChangeMetadataAccess(bool metadataAccess);

    /// @notice Constructor
    /// @param gameManager Init `_gameManager` value
    constructor(address gameManager) public {
        emit ChangeGameManager(_gameManager, gameManager);
        _gameManager = gameManager;
        /// @dev `_metadataAccess` is `true` after init `_gameManager`
        _metadataAccess = true;
    }

    /// @notice Function for set new value for `_gameManager`
    /// @dev Only called from `_gameManager`
    /// @param newGameManager New `_gameManager` value
    function changeGameManager(address newGameManager) external virtual onlyGameManager {
        tvm.rawReserve(0, 4);
        emit ChangeGameManager(_gameManager, newGameManager);
        _gameManager = newGameManager;
        /// @dev Return gas to sender if enough to send (128 + 2)
        msg.sender.transfer({
            value: 0,
            flag: 128 + 2,
            bounce: false
        });
    }

    /// @notice Function for set new value for `_metadataAccess`
    /// @dev Only called from `_gameManager`
    /// @param metadataAccess New `_metadataAccess` value
    function changeMetadataAccess(bool metadataAccess) external virtual onlyGameManager {
        tvm.rawReserve(0, 4);
        emit ChangeMetadataAccess(metadataAccess);
        _metadataAccess = metadataAccess;
        /// @dev Return gas to sender if enough to send (128 + 2)
        msg.sender.transfer({
            value: 0,
            flag: 128 + 2,
            bounce: false
        });
    }

    /// @notice Getter for `_gameManager`
    /// @return gameManager Value of `_gameManager`
    function getGameManager() external responsible virtual view returns(address gameManager) {
        return{value: 0, flag: 64, bounce: false}(_gameManager);
    }

    /// @notice Getter for `_metadataAccess`
    /// @return metadataAccess Value of `_metadataAccess`
    function getMetadataAccess() external responsible virtual view returns(bool metadataAccess) {
        return{value: 0, flag: 64, bounce: false}(_metadataAccess);
    }

    /// @notice Modifier for access to change state of attribute params
    /// @param metadataAccess Expected value of `_metadataAccess`
    modifier metadataAccess(bool metadataAccess) virtual {
        require(_metadataAccess == metadataAccess, 101);
        _;
    }

    /// @notice Modifier for access to call function only from `_gameManager`
    modifier onlyGameManager() virtual {
        require(msg.sender == _gameManager, 100);
        _;
    }

}