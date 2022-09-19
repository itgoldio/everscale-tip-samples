import ora from 'ora';
import chalk from 'chalk';

async function main() {
  const spinner = ora();
  const signer = (await locklift.keystore.getSigner("0"))!;
  const nftArtifact = await locklift.factory.getContractArtifacts("Nft");
  const indexArtifact = await locklift.factory.getContractArtifacts("Index");
  const indexBasisArtifact = await locklift.factory.getContractArtifacts("IndexBasis");
  spinner.start("Deploy Collection");
  try {
    const { contract: collection, tx } = await locklift.factory.deployContract({
      contract: "Collection",
      publicKey: signer.publicKey,
      initParams: {},
      constructorParams: {
        codeNft: nftArtifact.code,
        codeIndex: indexArtifact.code,
        codeIndexBasis: indexBasisArtifact.code,
        ownerPubkey: '0x' + signer.publicKey,
        json: "",
        mintingFee: 0
      },
      value: locklift.utils.toNano(2),
    });
    const collectionBalance = await locklift.provider.getBalance(collection.address);
    spinner.succeed(chalk.green(`${chalk.bold.yellow('Collection')} deployed at: ${collection.address.toString()} (Balance: ${locklift.utils.fromNano(collectionBalance)})`));
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
