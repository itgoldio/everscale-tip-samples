import { Address, zeroAddress } from 'locklift/.';
import ora from 'ora';
import prompts from 'prompts';

async function main() {
  const spinner = ora();
  const response = await prompts([
    {
        type: 'text',
        name: 'collectionAddr',
        message: 'Collection address',
        initial: zeroAddress
    },
    {
        type: 'text',
        name: 'json',
        message: 'Nft json',
        initial: ""
    },
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
          json: response.json
      }),
    );

    const nftId = await collection.methods.totalSupply({answerId:0}).call();
    const nftAddr = await collection.methods.nftAddress({answerId:0, id:(Number(nftId.count) - 1).toString()}).call();
    spinner.succeed(`Mint Nft`);
    console.log(`Nft minted at: ${nftAddr.nft.toString()}`);
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