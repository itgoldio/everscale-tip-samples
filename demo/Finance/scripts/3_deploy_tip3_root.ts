import ora from 'ora';
import chalk from 'chalk';
import prompts from 'prompts';
import { zeroAddress } from 'locklift/.';

async function main() {
  const spinner = ora();
  const signer = (await locklift.keystore.getSigner("0"))!;
  const tip3TokenWalletArtifact = await locklift.factory.getContractArtifacts("TokenWallet");
  const response = await prompts([
    {
        type: 'text',
        name: 'initialSupplyTo',
        message: 'Initial supply to',
        initial: zeroAddress
    },
    {
      type: 'number',
      name: 'initialSupply',
      message: 'Initial supply value',
      initial: 0
    },
  ]);
  spinner.start("Deploy TokenRoot");
  try {
    const { contract: tip3tokenRoot, tx } = await locklift.factory.deployContract({
      contract: "TokenRoot",
      publicKey: signer.publicKey,
      initParams: {
        name_: "TEST",
        symbol_: "TEST",
        decimals_: 9,
        rootOwner_: zeroAddress,
        walletCode_: tip3TokenWalletArtifact.code,
        randomNonce_: locklift.utils.getRandomNonce(),
        deployer_: zeroAddress
      },
      constructorParams: {
        initialSupplyTo: response.initialSupplyTo,
        initialSupply: response.initialSupply,
        deployWalletValue: locklift.utils.toNano(0.2),
        mintDisabled: false,
        burnByRootDisabled: false,
        burnPaused: false,
        remainingGasTo: response.initialSupplyTo
      },
      value: locklift.utils.toNano(2),
    });
    const tip3TokenRootBalance = await locklift.provider.getBalance(tip3tokenRoot.address);
    spinner.succeed(chalk.green(`${chalk.bold.yellow('TokenRoot')} deployed at: ${tip3tokenRoot.address.toString()} (Balance: ${locklift.utils.fromNano(tip3TokenRootBalance)})`));
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
