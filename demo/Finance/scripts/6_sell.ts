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
      name: 'wallet',
      message: 'Wallet owner',
      initial: zeroAddress
    },
    {
        type: 'text',
        name: 'nft',
        message: 'Nft address',
        initial: zeroAddress
    },
    {
        type: 'text',
        name: 'tip3SellRoot',
        message: 'TIP3SellRoot address',
        initial: zeroAddress
    },
    {
      type: 'number',
      name: 'price',
      message: 'TIP3 price',
      initial: 0
  }
  ]);
  spinner.start("Sell");
  try {
    const wallet = await locklift.factory.getDeployedContract(
      "Wallet",
      new Address(response.wallet)
    );

    const nft = await locklift.factory.getDeployedContract(
      "Nft",
      new Address(response.nft)
    );

    const tip3SellRoot = await locklift.factory.getDeployedContract(
      "TIP3SellRoot",
      new Address(response.tip3SellRoot)
    );

    const sellMsg = await tip3SellRoot.methods.buildSellMsg({
      answerId: 0,
      sendGasTo: wallet.address,
      price: response.price
    }).call();

    await wallet.methods.sendTransaction({
      dest: nft.address,
      value: locklift.utils.toNano(5),
      bounce: false,
      flags: 0,
      payload: sellMsg.value0
    }).sendExternal(
      {
        publicKey: signer.publicKey
      }
    );
    
    spinner.succeed(chalk.green(`Success!`));
  }
  catch(e) {
    spinner.fail(chalk.red('Failed'));
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
