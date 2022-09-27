const {
  isValidTonAddress
} = require('./utils');
const prompts = require('prompts');

async function main() {

  const Collection = await locklift.factory.getContract('Collection');
  const [keyPair] = await locklift.keys.getKeyPairs();

  const promptsData = [];

  promptsData.push({
    type: 'text',
    name: 'collection',
    message: 'Collection address',
    validate: value => isValidTonAddress(value) ? true : 'Invalid TON address'
  });

  promptsData.push({
    type: 'text',
    name: 'owner',
    message: 'Owner address',
    validate: value => isValidTonAddress(value) ? true : 'Invalid TON address'
  });

  const response = await prompts(promptsData);

  const collectionOwner = await locklift.factory.getAccount('SafeMultisigWallet', 'safemultisig');
  collectionOwner.setAddress(response.owner);

  const collection = Collection;
  collection.setAddress(response.collection);

  await collectionOwner.runTarget({
    contract: collection,
    method: 'mintNft',
    params: {},
    value: locklift.utils.convertCrystal(3, 'nano'),
    keyPair
  });

  const totalSupply = await collection.call({
    method: 'totalSupply',
    params: {},
  });

  const nftAddr = await collection.call({
    method: 'nftAddress',
    params: {
      id: totalSupply - 1
    },
  });

  console.log("Nft was successfully minted!");
  console.log("Address: " + nftAddr);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
