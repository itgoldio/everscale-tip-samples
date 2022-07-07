const {
  isValidTonAddress
} = require('./utils');
const prompts = require('prompts');

async function main() {

  const promptsData = [];

  promptsData.push({
    type: 'text',
    name: 'collection',
    message: 'Collection address',
    validate: value => isValidTonAddress(value) ? true : 'Invalid TON address'
  });

  promptsData.push({
    type: 'text',
    name: 'rewardTokenRoot',
    message: 'RewardTokenRoot (TIP3 Root) address',
    validate: value => isValidTonAddress(value) ? true : 'Invalid TON address'
  });

  promptsData.push({
    type: 'text',
    name: 'lockPeriod',
    message: 'Lock period',
    validate: value => !!value
  });

  promptsData.push({
    type: 'text',
    name: 'farmStartTime',
    message: 'Farm start time',
    validate: value => !!value
  });

  promptsData.push({
    type: 'text',
    name: 'rewardPerSecond',
    message: 'Reward per second',
    validate: value => !!value
  });

  promptsData.push({
    type: 'text',
    name: 'owner',
    message: 'Owner address',
    validate: value => isValidTonAddress(value) ? true : 'Invalid TON address'
  });

  const Farming = await locklift.factory.getContract('NFTFarming');
  const Nft = await locklift.factory.getContract('Nft');
  const [keyPair] = await locklift.keys.getKeyPairs();

  const response = await prompts(promptsData);

  const collection = response.collection;
  const rewardTokenRoot = response.rewardTokenRoot;
  const lockPeriod = response.lockPeriod;
  const farmStartTime = response.farmStartTime;
  const rewardPerSecond = response.rewardPerSecond;
  const owner = response.owner;

  const farming = await locklift.giver.deployContract({
    contract: Farming,
    constructorParams: {
      owner: owner,
      collection: collection,
      rewardTokenRoot: rewardTokenRoot,
      codeNft: Nft.code,
      lockPeriod: lockPeriod,
      farmStartTime: farmStartTime,
      rewardPerSecond: rewardPerSecond
    },
    initParams: {
    },
    keyPair,
  });
  
  console.log(`Farming deployed at: ${farming.address}`);
}


main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
