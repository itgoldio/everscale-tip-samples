const {
  isNumeric
} = require('./utils');
const prompts = require('prompts');

async function main() {

  const promptsData = [];

  promptsData.push({
    type: 'text',
    name: 'json',
    message: 'JSON',
    validate: value => !!value
  })

  promptsData.push({
      type: 'text',
      name: 'mintingFee',
      message: 'Minting Fee',
      validate: value => isNumeric(value) ? true : 'Invalid number'
  })

  const Collection = await locklift.factory.getContract('Collection');
  const Index = await locklift.factory.getContract('Index');
  const IndexBasis = await locklift.factory.getContract('IndexBasis');
  const Nft = await locklift.factory.getContract('Nft');
  const [keyPair] = await locklift.keys.getKeyPairs();

  const response = await prompts(promptsData);

  const ownerPubkey = "0x440d2f6fe861c43007fe4e16e1531291200d3245a6bc6dfb931edd97a68a2e63";
  const json = response.json;
  const mintingFee = response.mintingFee;

  console.log("Deploying...");

  const collection = await locklift.giver.deployContract({
    contract: Collection,
    constructorParams: {
      codeNft : Nft.code, 
      codeIndex : Index.code,
      codeIndexBasis : IndexBasis.code,
      ownerPubkey : ownerPubkey,
      json : json,
      mintingFee : mintingFee
    },
    initParams: {},
    keyPair,
  }, locklift.utils.convertCrystal(1, 'nano'));
  
  console.log(`Collection deployed at: ${collection.address}`);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
