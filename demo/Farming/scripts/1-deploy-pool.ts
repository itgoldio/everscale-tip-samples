import prompts from 'prompts';
import { Address } from "everscale-inpage-provider";
import {
    isValidEverAddress,
} from './utils';

async function main() {
    const promptsData = [];

    promptsData.push({
        type: 'text',
        name: 'owner',
        message: 'Owner address',
        validate: value => isValidEverAddress(value) ? true : 'Invalid Ever address'
    });
    
    promptsData.push({
        type: 'text',
        name: 'collection',
        message: 'Collection address',
        validate: value => isValidEverAddress(value) ? true : 'Invalid Ever address'
    });

    promptsData.push({
        type: 'text',
        name: 'rewardTokenRoot',
        message: 'Reward token root address',
        validate: value => isValidEverAddress(value) ? true : 'Invalid Ever address'
    });

    promptsData.push({
        type: 'text',
        name: 'farmStartTime',
        message: 'Farm start time (default: now + 100sec)',
        validate: value => value === '' || !!value
    });

    promptsData.push({
        type: 'text',
        name: 'rewardPerSecond',
        message: 'Reward per second',
        validate: value => !!value
    });

    promptsData.push({
        type: 'text',
        name: 'vestingPeriod',
        message: 'Vesting period (in sec)',
        validate: value => !!value
    });

    promptsData.push({
        type: 'text',
        name: 'vestingRatio',
        message: 'Vesting ratio (1 = 0.1% 1000 = 100%)',
        validate: value => !!value
    });

    const response = await prompts(promptsData);

    let owner = response.owner;
    let collection = response.collection;
    let rewardTokenRoot = response.rewardTokenRoot;
    let farmStartTime = response.farmStartTime;
    let rewardPerSecond = response.rewardPerSecond;
    let vestingPeriod = response.vestingPeriod;
    let vestingRatio = response.vestingRatio;
    
    let keyPair = (await locklift.keystore.getSigner("0"))!;
    let UserData = await locklift.factory.getContractArtifacts('UserData');
    let Nft = await locklift.factory.getContractArtifacts('Nft');
    const { contract: farmingPool, tx } = await locklift.factory.deployContract({
        contract: "FarmingPool",
        publicKey: keyPair.publicKey,
        constructorParams: {
            owner: owner,
            collection: collection,
            rewardTokenRoot: rewardTokenRoot,
            codeNft: Nft.code,
            codeUserData: UserData.code,
            farmStartTime: farmStartTime,
            rewardPerSecond: rewardPerSecond,
            vestingPeriod: vestingPeriod,
            vestingRatio: vestingRatio,
        },
        initParams: {},
        value: locklift.utils.toNano(10)
    });

    console.log(`FarmingPool deployed at: ${farmingPool.address.toString()}`);
}
  
main()
.then(() => process.exit(0))
.catch(e => {
    console.log(e);
    process.exit(1);
});
