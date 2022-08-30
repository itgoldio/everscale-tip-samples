import ora from 'ora';
import chalk from 'chalk';
import prompts from 'prompts';
import fs from 'fs';
import { Address } from 'locklift/.';

async function main() {
  console.clear();
  const spinner = ora();
  const signer = (await locklift.keystore.getSigner("0"))!;
  const response = await prompts([
    {
        type: 'number',
        name: 'deployValue',
        message: 'Initial EVER\'s',
        initial: 0
    },
  ]);
  spinner.start(chalk.bold("Deploy Wallet"));
  try {
    const { contract: wallet, tx } = await locklift.factory.deployContract({
      contract: "Wallet",
      publicKey: signer.publicKey,
      initParams: {
        _randomNonce: locklift.utils.getRandomNonce()
      },
      constructorParams: {},
      value: locklift.utils.toNano(response.deployValue),
    });
  }
  catch(e) {
    spinner.fail(chalk.bold.red(`Failed deploy\nexitCode: ${e.exitCode}`));
  }
  const walletBalance = await locklift.provider.getBalance(wallet.address);
  spinner.succeed(chalk.bold.green(`Wallet deployed at: ${wallet.address.toString()} (Balance: ${locklift.utils.fromNano(walletBalance)})`));
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
