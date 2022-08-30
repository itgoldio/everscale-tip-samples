import prompts from 'prompts';
import { Address } from "everscale-inpage-provider";

import {
    isValidEverAddress,
    isNumeric
} from './utils';
// import { zeroAddress } from 'constants';
import BigNumber from 'bignumber.js';
BigNumber.config({EXPONENTIAL_AT: 257});

const zeroAddress = "0:0000000000000000000000000000000000000000000000000000000000000000";

async function main() {
    const promptsData = [];

    promptsData.push({
        type: 'text',
        name: 'rootOwner',
        message: 'Root owner',
        validate: value => isValidEverAddress(value) ? true : 'Invalid Ever address'
    });

    promptsData.push({
        type: 'text',
        name: 'name',
        message: 'Name',
        validate: value => !!value
    });

    promptsData.push({
        type: 'text',
        name: 'symbol',
        message: 'Symbol',
        validate: value => !!value
    });

    promptsData.push({
        type: 'text',
        name: 'decimals',
        message: 'Decimals',
        validate: value => isNumeric(value) && (+value) <= 18 ? true : 'Invalid number'
    });

    let disableMint;
    promptsData.push({
        type: 'select',
        name: 'disableMint',
        message: 'Disable mint (fixed supply)',
        choices: [
            { title: 'No', value: 'false' },
            { title: 'Yes',  value: 'true' }
        ],
    });

    let disableBurnByRoot;
    promptsData.push({
        type: 'select',
        name: 'disableBurnByRoot',
        message: 'Disable burn by root owner',
        choices: [
            { title: 'Yes',  value: 'true' },
            { title: 'No', value: 'false' }
        ],
    });

    let pauseBurn;
    promptsData.push({
        type: 'select',
        name: 'pauseBurn',
        message: 'Pause burn',
        choices: [
            { title: 'No', value: 'false' },
            { title: 'Yes',  value: 'true' }
        ],
    });

    promptsData.push({
        type: 'text',
        name: 'initialSupplyTo',
        message: 'Initial supply to address (default: NO INITIAL SUPPLY)',
        validate: value => value === '' || isValidEverAddress(value) ? true : 'Invalid Ever address'
    });

    const response = await prompts(promptsData);

    const initialSupplyTo = response.initialSupplyTo || zeroAddress;
    const rootOwner = new Address(response.rootOwner);
    const name = response.name;
    const symbol = response.symbol;
    const decimals = +response.decimals;
    disableMint = typeof(disableMint) === 'boolean' ? disableMint : response.disableMint === 'true';
    disableBurnByRoot = typeof(disableBurnByRoot) === 'boolean' ? disableBurnByRoot : response.disableBurnByRoot === 'true';
    pauseBurn = typeof(pauseBurn) === 'boolean' ? pauseBurn : response.pauseBurn === 'true';

    let initialSupply;
    if (initialSupplyTo !== zeroAddress) {
        initialSupply = (await prompts({
            type: 'text',
            name: 'initialSupply',
            message: 'Initial supply (amount)',
            validate: value => isNumeric(value) ? true : 'Invalid number'
        })).initialSupply || '0';
    } else {
        initialSupply = '0';
    }

    let keyPair = (await locklift.keystore.getSigner("0"))!;
    let TokenWallet = await locklift.factory.getContractArtifacts('TokenWallet'); 
    const { contract: tokenRoot, tx } = await locklift.factory.deployContract({
        contract: "TokenRoot",
        publicKey: keyPair.publicKey,
        constructorParams: {
            initialSupplyTo: new Address(initialSupplyTo),
            initialSupply: new BigNumber(initialSupply).shiftedBy(decimals).toFixed(),
            deployWalletValue: locklift.utils.toNano(0.1),
            mintDisabled: disableMint,
            burnByRootDisabled: disableBurnByRoot,
            burnPaused: pauseBurn,
            remainingGasTo: new Address(zeroAddress)
        },
        initParams: {
            deployer_: new Address(zeroAddress),
            randomNonce_: locklift.utils.getRandomNonce(),
            rootOwner_: rootOwner,
            name_: name,
            symbol_: symbol,
            decimals_: decimals,
            walletCode_: TokenWallet.code,
        },
        value: locklift.utils.toNano(10),
    });

    console.log(`TokenRoot deployed at: ${tokenRoot.address.toString()}`);
}
  
main()
.then(() => process.exit(0))
.catch(e => {
    console.log(e);
    process.exit(1);
});
