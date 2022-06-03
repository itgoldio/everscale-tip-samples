# TIP4_1 Sample

Подробнее о стандарте TIP4_1 можно прочитать <a href="https://github.com/nftalliance/docs/blob/main/src/standard/TIP-4/1.md">тут.</a>

В данном разделе представлены контракты, которые наследуются от TIP4_1 стандарта. (https://github.com/itgoldio/everscale-tip/tree/main/contracts/TIP4_1)
<br><br>
<h1>Collection</h1>

Данный контракт наследуется от TIP4_1Collection и OwnableExternal. 

TIP4_1Collection - это стандартный контракт, который реализует в себе методы стандарта TIP4_1 для коллекции.

```
    function totalSupply() external view responsible returns (uint128 count);

    function nftCode() external view responsible returns (TvmCell code);

    function nftCodeHash() external view responsible returns (uint256 codeHash);

    function nftAddress(uint256 id) external view responsible returns (address nft);
```

OwnableExternal - это абстрактный контракт, добавляющий роль внешнего владельца (публичный ключ). 

Так же контракт Collection имеет метод mintNft, который минтит(деплоит) контракты Nft при вызове. 

<h1>Nft</h1>

Данный контракт наследуется от TIP4_1Nft. 

TIP4_1Nft - это стандартный контракт, который реализует в себе методы стандарта TIP4_1 для nft.

```
    function getInfo() external view responsible returns(uint256 id, address owner, address manager,  address collection);

    function changeOwner(address newOwner, address sendGasTo, mapping(address => CallbackParams) callbacks) external;

    function changeManager(address newManager, address sendGasTo, mapping(address => CallbackParams)  callbacks) external;

    function transfer(address to, address sendGasTo, mapping(address => CallbackParams) callbacks) external;
```

<h1></h1>