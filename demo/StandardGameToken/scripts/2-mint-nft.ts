import { Address, zeroAddress } from 'locklift/.';
import ora from 'ora';
import prompts from 'prompts';

async function main() {
  const spinner = ora();
  const json = {
    "type": "Basic NFT",
    "name": "Sample Name",
    "description": "Hello world!",
    "preview": {
      "source": "https://everscale.network/images/Backgrounds/Main/main-hero.png",
      "mimetype": "image/png"
    },
    "files": [
      {
        "source": "https://everscale.network/images/Backgrounds/Main/main-hero.png",
        "mimetype": "image/png"
      }
    ],
    "external_url": "https://everscale.network"
  };
  const response = await prompts([
    {
        type: 'text',
        name: 'collectionAddr',
        message: 'Collection address',
        initial: zeroAddress
    },
    {
        type: 'number',
        name: 'points',
        message: 'Game points',
        initial: 0
    },
    {
      type: 'text',
      name: 'rarity',
      message: 'Game rarity',
      initial: ""
    }
  ]);
  spinner.start(`Mint Nft`);
  try {
    const signer = (await locklift.keystore.getSigner("0"))!;
    const collection = await locklift.factory.getDeployedContract(
      "Collection",
      new Address(response.collectionAddr)
    );
    const accountsFactory = await locklift.factory.getAccountsFactory(
      "Wallet",
    );

    const {account: account, tx} = await accountsFactory.deployNewAccount({
      publicKey: signer.publicKey,
      initParams: {
        _randomNonce: locklift.utils.getRandomNonce(),
      },
      constructorParams: {},
      value: locklift.utils.toNano(2)
    }); 

    await account.runTarget(
      {
        contract: collection,
        value: locklift.utils.toNano(1),
      },
      collection =>
      collection.methods.mintNft({
        json: JSON.stringify(json)
      }),
    );

    const nftId = await collection.methods.totalSupply({answerId:0}).call();
    const nftAddr = await collection.methods.nftAddress({answerId:0, id:(Number(nftId.count) - 1).toString()}).call();

    const nft = await locklift.factory.getDeployedContract(
      "Nft",
      new Address(nftAddr.nft.toString())
    );

    await account.runTarget(
      {
        contract: nft,
        value: locklift.utils.toNano(0.2),
      },
      nft =>
      nft.methods.setPoints({
        points: response.points
      }),
    );

    await account.runTarget(
      {
        contract: nft,
        value: locklift.utils.toNano(0.2),
      },
      nft =>
      nft.methods.setRarity({
        rarity: response.rarity
      }),
    );

    const nftJson = await nft.methods.getJson({answerId:0}).call();

    spinner.succeed(`Mint Nft`);
    console.log(`Nft minted at: ${nftAddr.nft.toString()}`);
    console.log(`Set Points to: ${response.points.toString()}`);
    console.log(`Set Rarity to: ${response.rarity.toString()}`);
    console.log(`Nft JSON: ${nftJson.json.toString()}`);
  }
  catch(err) {
    spinner.fail(`Failed`);
    console.log(err);
  }
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });