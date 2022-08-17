import {
    isValidEverAddress,
} from './utils';
import prompts from 'prompts';
import { Address } from "everscale-inpage-provider";

async function main() {

    const keyPair = (await locklift.keystore.getSigner("0"))!;

    const promptsData = [];

    promptsData.push({
        type: 'text',
        name: 'collection',
        message: 'Collection address',
        validate: value => isValidEverAddress(value) ? true : 'Invalid Ever address'
    });

    promptsData.push({
        type: 'text',
        name: 'owner',
        message: 'Owner address',
        validate: value => isValidEverAddress(value) ? true : 'Invalid Ever address'
    });

    const response = await prompts(promptsData);

    let accountsFactory = locklift.factory.getAccountsFactory(
        "Wallet",
    );
    let collectionOwner = await accountsFactory.getAccount(new Address(response.owner), keyPair.publicKey);

    let collection = await locklift.factory.getDeployedContract(
        "Collection",
        new Address(response.collection),
    );

    await collectionOwner.runTarget(
        {
            contract: collection,
            value: locklift.utils.toNano(3),
        },
        collection =>
        collection.methods.mintNft({}),
    );

    const totalSupply = await collection.methods.totalSupply({
        answerId: 0
    }).call();

    let id = totalSupply['count'] - 1;
    const nftAddr = await collection.methods.nftAddress({
        id: id,
        answerId: 0,
    }).call();

    console.log("Nft was successfully minted!");
    console.log("Address: " + nftAddr['nft']['_address']);
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
});