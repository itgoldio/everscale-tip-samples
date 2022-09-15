import ora from 'ora';
import chalk from 'chalk';
import prompts from 'prompts';
import { zeroAddress } from 'locklift/.';

async function main() {
  const spinner = ora();
  const signer = (await locklift.keystore.getSigner("0"))!;
  const tip3SellArtifact = await locklift.factory.getContractArtifacts("TIP3Sell");
  const response = await prompts([
    {
        type: 'text',
        name: 'tip3TokenRoot',
        message: 'TIP3TokenRoot',
        initial: zeroAddress
    },
  ]);
  spinner.start("Deploy TIP3Sell");
  try {
    const { contract: tip3SellRoot, tx } = await locklift.factory.deployContract({
      contract: "TIP3SellRoot",
      publicKey: signer.publicKey,
      initParams: {
      },
      constructorParams: {
        ownerPubkey: '0x' + signer.publicKey,
        tip3TokenRoot: response.tip3TokenRoot,
        tip3SellCode: tip3SellArtifact.code
      },
      value: locklift.utils.toNano(2),
    });
    const tip3SellRootBalance = await locklift.provider.getBalance(tip3SellRoot.address);
    spinner.succeed(chalk.green(`${chalk.bold.yellow('TIP3SellRoot')} deployed at: ${tip3SellRoot.address.toString()} (Balance: ${locklift.utils.fromNano(tip3SellRootBalance)})`));
    //console.log(tx);
  }
  catch(e) {
    spinner.fail(chalk.red('Failed deploy'));
    console.log(e);
  }
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
