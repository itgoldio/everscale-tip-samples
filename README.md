# everscale-tip-samples

Данный репозиторий содержит набор сэмплов от команды itgold.io, работающих на стандарте TIP4. Подробнее про стандарт можно прочитать <a href="https://github.com/nftalliance/docs/blob/main/src/standard/TIP-4">тут.</a>

<h2>Список сэмплов:</h2>
  <li><a href="/demo/TIP4_1">TIP4_1</a> - базовый контракт, содержащий основные методы TIP4</li>
  <li><a href="/demo/TIP4_2">TIP4_2</a> - контракт, наследующий базовый контракт TIP4_1 и TIP4_2 (JSON)</li>
  <li><a href="/demo/TIP4_3">TIP4_3</a> - контракт, наследующий базовый контракт TIP4_1 и TIP4_3 (Работа с индексами)</li>
  <li><a href="/demo/StandartWebToken">Standart web token</a> - контракт, наследующий базовый контракт TIP4_1 TIP4_2 и TIP4_3</li>
  <li><a href="/demo/Lottery">Lottery</a> - контракт, за основу которого взят standart web token с добавленной логикой получения случайного приза в токенах сети</li>
  <li><a href="/demo/BulkMint">Bulk mint</a> - контракт, за основу которого взят standart web token с добавленной логикой минтинга большого количества подобных nft за раз </li>
</ol>

<h1>Как использовать с помощью everdev?</h1>
1. Установите everdev
`npm i -g everdev`

npm i -g everdev
everdev sol set --compiler 0.58.1
everdev se start
cd demo/StandartWebToken
npm install
npm run-script deploy