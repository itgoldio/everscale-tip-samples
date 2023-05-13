import { Address, zeroAddress, WalletTypes, toNano } from 'locklift/.';
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
        initial: '{"field": "value"}'
    },
  ]);
  spinner.start(`Mint Nft`);
  try {
    const signer = (await locklift.keystore.getSigner("0"))!;
    const collection = await locklift.factory.getDeployedContract(
      "Collection",
      new Address(response.collectionAddr)
    );
    const {account} = await locklift.factory.accounts.addNewAccount({
      type: WalletTypes.EverWallet,
      publicKey: signer.publicKey,
      value: toNano(1)
    });

    await collection.methods.mintNft({json: response.json}).send({
      from: account.address,
      amount: toNano(0.5)
    });

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