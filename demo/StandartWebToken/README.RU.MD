# Standart web token sample

В данном разделе представлены контракты, которые наследуются от определенного набора стандартный контрактов. Мы рекомендуем использовать этот сэмпл для публикации своец коллекции в блокчейне.
<br><br>
<h1>Collection</h1>

Данный контракт наследуется от `TIP4_1Collection`, `TIP4_2Collection`, `TIP4_3Collection` и `OwnableExternal`. 

`TIP4_1Collection` - это базовый контракт, который реализует в себе методы стандарта TIP4_1 для коллекции.

```solidity
    function totalSupply() external view responsible returns (uint128 count);

    function nftCode() external view responsible returns (TvmCell code);

    function nftCodeHash() external view responsible returns (uint256 codeHash);

    function nftAddress(uint256 id) external view responsible returns (address nft);
```

`TIP4_2Collection` - это стандартный контракт, который реализует в себе метод стандарта TIP4_2.

```solidity
    function getJson() external virtual view responsible retuerns (string json);
```

`1TIP4_3Collection` - это стандартный контракт, который реализует в себе методы стандарта TIP4_3. Данный подстандарт подразумевает работу с индексами для упрощенного поиска контрактов Nft в блокчейне.

```solidity
    function indexBasisCode() external view responsible returns (TvmCell code);

    function indexBasisCodeHash() external view responsible returns (uint256 hash);

    function indexCode() external view responsible returns (TvmCell code);

    function indexCodeHash() external view responsible returns (uint256 hash);

    function resolveIndexBasis() external view responsible returns (address indexBasis);
```

`OwnableExternal` - это абстрактный контракт, добавляющий роль внешнего владельца (публичный ключ). 

Так же контракт Collection имеет несколько дополнительных методов:<br>
    1. `mintNft`, который минтит(деплоит) контракты Nft при вызове, а так же позволяет брать комиссию (minting fee) за минтинг.<br>
    2. `withdraw`, который позволяет выводить токены(ever) с контракта.<br>
    3. `onTokenBurned`, который вызывается контрактов nft после уничтожения.

<h1>Nft</h1>

Данный контракт наследуется от TIP4_1Nft, TIP4_2Nft и TIP4_3Nft. 

TIP4_1Nft - это базовый контракт, который реализует в себе методы стандарта TIP4_1 для nft.

```solidity
    function getInfo() external view responsible returns(uint256 id, address owner, address manager,  address collection);

    function changeOwner(address newOwner, address sendGasTo, mapping(address => CallbackParams) callbacks) external;

    function changeManager(address newManager, address sendGasTo, mapping(address => CallbackParams)  callbacks) external;

    function transfer(address to, address sendGasTo, mapping(address => CallbackParams) callbacks) external;
```

TIP4_2Nft - это стандартный контракт, который реализует в себе метод стандарта TIP4_2.

```solidity
    function getJson() external virtual view responsible retuerns (string json);
```

TIP4_3Nft - это стандартный контракт, который реализует в себе методы стандарта TIP4_3.

```solidity
    function indexCode() external view responsible returns (TvmCell code);
    function indexCodeHash() external view responsible returns (uint256 hash);
    function resolveIndex(address collection, address owner) external view responsible returns (address index);
```
Так же контракт Collection имеет метод `burn`, позволяющий уничтожать Nft.

<h1></h1>