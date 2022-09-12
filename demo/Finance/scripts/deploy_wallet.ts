import ora from 'ora';
import chalk from 'chalk';

async function main() {
  console.clear();
  const spinner = ora();
  const signer = (await locklift.keystore.getSigner("0"))!;
  spinner.start("Deploy Wallet");
  try {
    const { contract: wallet, tx } = await locklift.factory.deployContract({
      contract: "Wallet",
      publicKey: signer.publicKey,
      initParams: {
        _randomNonce: locklift.utils.getRandomNonce()
      },
      constructorParams: {},
      value: locklift.utils.toNano(1),
    });
  }
  catch(e) {
    spinner.fail(chalk.red('Failed deploy'));
    console.log(e);
  }
  const walletBalance = await locklift.provider.getBalance(wallet.address);
  spinner.succeed(chalk.green(`Wallet deployed at: ${wallet.address.toString()} (Balance: ${locklift.utils.fromNano(walletBalance)})`));
  console.log(tx);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
