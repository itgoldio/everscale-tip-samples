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
      message: 'Buy from wallet',
      initial: zeroAddress
    },
    {
      type: 'text',
      name: 'tokenRoot',
      message: 'Token root',
      initial: zeroAddress
    },
    {
      type: 'text',
      name: 'sellTokenWallet',
      message: 'TIP3 wallet of sell contract',
      initial: zeroAddress
    },
    {
      type: 'number',
      name: 'tokens',
      message: 'Tokens',
      initial: 0
    }
  ]);
  spinner.start("Buy");

  try {
    const accountsFactory = locklift.factory.getAccountsFactory("Wallet");
    const wallet = accountsFactory.getAccount(new Address(response.wallet), signer.publicKey);

    const tokenRoot = await locklift.factory.getDeployedContract(
      "TokenRoot",
      new Address(response.tokenRoot)
    );

    const tokenWalletAddress = await tokenRoot.methods.walletOf({
      answerId: 0,
      walletOwner: wallet.address
    }).call();

    const buyerTokenWallet = await locklift.factory.getDeployedContract(
      "TokenWallet",
      tokenWalletAddress.value0
    );
    console.log(tokenWalletAddress.value0)

    await wallet.runTarget(
      {
        contract: buyerTokenWallet,
        value: locklift.utils.toNano(1),
      },
      buyerTokenWallet =>
        buyerTokenWallet.methods.transferToWallet({
          amount: response.tokens,
          recipientTokenWallet: response.sellTokenWallet,
          remainingGasTo: wallet.address,
          notify: true,
          payload: ""
        }),
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
