# TIP4_3 Sample

Подробнее о стандарте TIP4_3 можно прочитать <a href="https://github.com/nftalliance/docs/blob/main/src/standard/TIP-4/3.md">тут.</a>

В данном разделе представлены контракты, которые наследуются от TIP4_3 стандарта. (https://github.com/itgoldio/everscale-tip/tree/main/contracts/TIP4_3)
<br><br>
<h1>Collection</h1>

Данный контракт наследуется от TIP4_1Collection, TIP4_3Collection и OwnableExternal. 

TIP4_1Collection - это базовый контракт, который реализует в себе методы стандарта TIP4_1 для коллекции.

```solidity
    function totalSupply() external view responsible returns (uint128 count);

    function nftCode() external view responsible returns (TvmCell code);

    function nftCodeHash() external view responsible returns (uint256 codeHash);

    function nftAddress(uint256 id) external view responsible returns (address nft);
```

TIP4_3Collection - это стандартный контракт, который реализует в себе методы стандарта TIP4_3. Данный подстандарт подразумевает работу с индексами для упрощенного поиска контрактов Nft в блокчейне.

```solidity
    function indexBasisCode() external view responsible returns (TvmCell code);

    function indexBasisCodeHash() external view responsible returns (uint256 hash);

    function indexCode() external view responsible returns (TvmCell code);

    function indexCodeHash() external view responsible returns (uint256 hash);

    function resolveIndexBasis() external view responsible returns (address indexBasis);
```

OwnableExternal - это абстрактный контракт, добавляющий роль внешнего владельца (публичный ключ). 

Так же контракт Collection имеет метод mintNft, который минтит(деплоит) контракты Nft при вызове. 

<h1>Nft</h1>

Данный контракт наследуется от TIP4_1Nft и TIP4_3Nft. 

TIP4_1Nft - это базовый контракт, который реализует в себе методы стандарта TIP4_1 для nft.

```solidity
    function getInfo() external view responsible returns(uint256 id, address owner, address manager,  address collection);

    function changeOwner(address newOwner, address sendGasTo, mapping(address => CallbackParams) callbacks) external;

    function changeManager(address newManager, address sendGasTo, mapping(address => CallbackParams)  callbacks) external;

    function transfer(address to, address sendGasTo, mapping(address => CallbackParams) callbacks) external;
```

TIP4_3Nft - это стандартный контракт, который реализует в себе методы стандарта TIP4_3.

```solidity
    function indexCode() external view responsible returns (TvmCell code);
    function indexCodeHash() external view responsible returns (uint256 hash);
    function resolveIndex(address collection, address owner) external view responsible returns (address index);
```

<h1>Команды</h1>

Используйте `npx locklift build` для сборки контрактов.
Используйте `npm run 1-deploy-collection` для деплоя контрактов в локальном блокчейне.