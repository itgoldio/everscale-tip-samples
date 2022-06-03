# Standart web token sample

В данном разделе представлены контракты, которые фактически являются Standart web token с добавленной логикой лотереи. Подробнее про Standart web token можно почитать тут(https://github.com/nikitaghost/everscale-tip-samples/tree/main/demo/StandartWebToken/README.RU.MD). После минтинга nft менеджер контракта может вызвать метод `getPrize`, который "обратиться" к контракту коллекции для получения приза при выигрыше. Вызвать метод `getPrize` можно только 1 раз.
<br><br>
<h1>Collection</h1>

Данный контракт наследуется от всех родителей сэмпла `Standart Web Token` (https://github.com/nikitaghost/everscale-tip-samples/tree/main/demo/StandartWebToken/)

А так же реализует логику лотереи с помощью следующего публичного метода:
```solidity
    function getPrize(uint256 id) external;
```

<h1>Nft</h1>

Данный контракт наследуется от всех родителей сэмпла `Standart Web Token` (https://github.com/nikitaghost/everscale-tip-samples/tree/main/demo/StandartWebToken/)

А так же реализует логику лотереи с помощью следующих публичных методов:
```solidity
    function getPrize() external;
    function receivePrize(uint128 winningAmount) external;
```

<h1></h1>