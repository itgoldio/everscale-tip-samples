import ora from 'ora';
import chalk from 'chalk';
import prompts from 'prompts';
import { Address, zeroAddress } from 'locklift/.';
import { exit } from 'process';

async function main() {
  const spinner = ora();
  const signer = (await locklift.keystore.getSigner("0"))!;
  const response = await prompts([
    {
        type: 'text',
        name: 'collection',
        message: 'Collection',
        initial: zeroAddress
    },
    {
        type: 'text',
        name: 'wallet',
        message: 'Mint for wallet',
        initial: zeroAddress
    }
  ]);
  spinner.start("Mint");
  try {
    const accountsFactory = locklift.factory.getAccountsFactory("Wallet");
    const wallet = accountsFactory.getAccount(new Address(response.wallet), signer.publicKey);
    const collection = locklift.factory.getDeployedContract(
      "Collection",
      new Address(response.collection)
    );
    await wallet.runTarget(
      {
        contract: collection,
        value: locklift.utils.toNano(1),
      },
      collection =>
        collection.methods.mintNft({
          json: "NFT"
        }),
    );
    const totalSupply = await collection.methods.totalSupply({
        answerId: 0
    }).call();
    let id = Number(totalSupply.count) - 1;
    const nftAddr = await collection.methods.nftAddress({
        id: id,
        answerId: 0,
    }).call();
    spinner.succeed(chalk.green(`${chalk.bold.yellow('Nft')} minted at: ${nftAddr.nft}`));
  }
  catch(e) {
    spinner.fail(chalk.red('Mint failed'));
    console.log(e);
    exit();
  }
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
