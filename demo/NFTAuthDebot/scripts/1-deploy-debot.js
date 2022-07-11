const {
  isValidTonAddress
} = require('./utils');
const prompts = require('prompts');

async function main() {

  const promptsData = [];

  promptsData.push({
    type: 'text',
    name: 'ownerPubkey',
    message: 'Owner pubkey',
    validate: value => !!value
  });

  promptsData.push({
    type: 'text',
    name: 'collection',
    message: 'Collection address',
    validate: value => isValidTonAddress(value) ? true : 'Invalid TON address'
  });

  const response = await prompts(promptsData);

  const Debot = await locklift.factory.getContract('NFTAuthDebot');
  const [keyPair] = await locklift.keys.getKeyPairs();

  const ownerPubkey = response.ownerPubkey;
  const collection = response.collection;
  const nftIndexHelper = "0:4a6c2af0bcf6ca365ce7d63f55690ef300d1272d717983fc39a7603a5cde4365";
  const nftList = [];

  const debot = await locklift.giver.deployContract({
    contract: Debot,
    constructorParams: {
      ownerPubkey: ownerPubkey,
      nftIndexHelper: nftIndexHelper,
      collection: collection,
      nftList: nftList
    },
    initParams: {},
    keyPair,
  }, locklift.utils.convertCrystal(2, 'nano'));

  const debotAbi = Buffer.from(JSON.stringify(debot.abi), "utf8").toString("hex");
    
  await debot.run({
    method: 'setABI',
    params: {
      dabi: debotAbi
    },
    keyPair: keyPair
  });

  console.log(`Debot deployed at: ${debot.address}`);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
