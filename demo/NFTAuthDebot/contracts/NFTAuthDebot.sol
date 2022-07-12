pragma ton-solidity = 0.58.1;
pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;

import "debot_imports/DeBot.sol";
import "debot_imports/Terminal.sol";
import "debot_imports/Sdk.sol";
import "debot_imports/Menu.sol";
import "debot_imports/UserInfo.sol";

import '@itgold/everscale-tip/contracts/access/OwnableExternal.sol';
import '@itgold/everscale-tip/contracts/TIP4_1/interfaces/ITIP4_1NFT.sol';

interface INFTIndexHelper {
    function indexCodeHash(
        address collection,
        address owner
    ) external view responsible returns (uint256 indexCodeHash);
}

contract NFTAuthDebot is DeBot, OwnableExternal {

    string _debotName = "Itgold NFT authentication deBot";
    address _supportAddr = address.makeAddrStd(0, 0x5fb73ece6726d59b877c8194933383978312507d06dda5bcf948be9d727ede4b);

    address _nftIndexHelper;
    address[] _nftList;
    address _collection;
    address _userAddr;
    uint128 _lastCheckNftId = 0;

    AccData[] _indexes;

    string constant _errorStr = "An error has occurred, please contact the developers";
    
    bytes _icon;

    constructor(
        uint256 ownerPubkey,
        address nftIndexHelper,
        address collection,
        address[] nftList
    ) OwnableExternal(ownerPubkey) public {
        tvm.accept();

        _nftIndexHelper = nftIndexHelper;
        _collection = collection;
        _nftList = nftList;
    }

    function start() public override {
        UserInfo.getAccount(tvm.functionId(setUserWallet));
    }

    function setUserWallet(address value) public {
        _userAddr = value;
        checkOwnershipUseRoot();
    }

    function checkOwnershipUseRoot() public {
        if (_collection.value != 0) {
            getIndexCodeHash();
        } else {
            checkOwnershipUseNfts();
        }
    }

    function getIndexCodeHash() public view {
        optional(uint256) none;
        INFTIndexHelper(_nftIndexHelper).indexCodeHash{
            sign: false,
            pubkey: none,
            time: uint64(now),
            expire: 0,
            callbackId: onGetCodeHashIndex,
            onErrorId: onErrorGetCodeHashIndex
        }(_collection, _userAddr).extMsg;
    }

    function onGetCodeHashIndex(uint256 indexCodeHash) public {
        Sdk.getAccountsDataByHash(
            tvm.functionId(onGetIndexesByHash),
            indexCodeHash,
            address.makeAddrStd(0, 0)
        );
    }

    function onGetIndexesByHash(AccData[] accounts) public {
        _indexes = accounts;
        checkIndexes();
    }

    function checkIndexes() public {
        if(_indexes.length > 0) {
            Sdk.getAccountType(tvm.functionId(checkIndexAccountStatus), _indexes[0].id);
        }
        else {
            checkOwnershipUseNfts();
        }
    }

    function checkIndexAccountStatus(int8 acc_type) public {
        if (checkIndexStatus(acc_type)) {
            foo();
        } else {
            _indexes[0] = _indexes[_indexes.length - 1];
            _indexes.pop();
            checkIndexes();
        }
    }

    function checkIndexStatus(int8 acc_type) public returns(bool) {
        if (acc_type == -1 || acc_type == 0 || acc_type == 2) {
            return false;
        } else {
            return true;
        }
    }

    function onErrorGetCodeHashIndex(uint32 sdkError, uint32 exitCode) public {
        sdkError;exitCode; //disable warnings
        checkOwnershipUseNfts();
    }

    function checkOwnershipUseNfts() public {
        if (_nftList.length != 0) {
            getNftInfo();
        } else {
            authFailed();
        }
    }

    function getNftInfo() public view {
        optional(uint256) none;
        ITIP4_1NFT(_nftList[_lastCheckNftId]).getInfo{
            sign: false,
            pubkey: none,
            time: uint64(now),
            expire: 0,
            callbackId: onGetNftInfo,
            onErrorId: onErrorGetNftInfo
        }().extMsg;
    }

    function onGetNftInfo(
        uint256 id, 
        address owner, 
        address manager,  
        address collection
    ) public {
        if (owner == _userAddr) {
            foo();
        } else {
            if (_lastCheckNftId < _nftList.length - 1) {
                _lastCheckNftId++;
                getNftInfo();
            } else {
                authFailed();
            }
        }
    }

    function onErrorGetNftInfo(uint32 sdkError, uint32 exitCode) public {
        sdkError;exitCode; //disable warnings
        if (_lastCheckNftId < _nftList.length - 1) {
                _lastCheckNftId++;
                getNftInfo();
        } else {
            authFailed();
        }
    }

    function foo() public  {
        Terminal.print(0, "Add the code here after successful authorization!");
    }

    function authFailed() public {
        Terminal.print(0, "Forbitten! You don't have the right NFT");
    }

    function getDebotInfo() public functionID(0xDEB) override view returns(
        string name, string version, string publisher, string caption, string author,
        address support, string hello, string language, string dabi, bytes icon
    ) {
        name = _debotName;
        version = "0.9";
        publisher = "https://itgold.io/";
        caption = "Tip4 auth Debot";
        author = "https://itgold.io/";
        support = _supportAddr;
        hello = "Hello, i'm itgold nft aithentication debot";
        language = "en";
        dabi = m_debotAbi.get();
        icon = _icon;
    }

    function setIcon(bytes icon) public onlyOwner {
        _icon = icon;
    }

    function getRequiredInterfaces() public view override returns (uint256[] interfaces) {
         return [Sdk.ID, Terminal.ID, Menu.ID, UserInfo.ID];
    }

}
