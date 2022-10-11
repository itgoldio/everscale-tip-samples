import prompts from 'prompts';
import ora from 'ora';
import { exit } from 'process';
import { Contract } from 'locklift/.';

async function main() {
  const spinner = ora();
  const signer = (await locklift.keystore.getSigner("0"))!;
  const response = await prompts([
    {
        type: 'text',
        name: 'ownerPubkey',
        message: 'Owner key',
        initial: 0
    },
    {
        type: 'text',
        name: 'json',
        message: 'Collection json',
        initial: ""
    },
  ]);
  spinner.start(`Deploy Collection`);
  try {
    const Nft = await locklift.factory.getContractArtifacts("Nft");
    const { contract: collection, tx } = await locklift.factory.deployContract({
      contract: "Collection",
      publicKey: signer.publicKey,
      initParams: {},
      constructorParams: {
        codeNft: Nft.code,
        ownerPubkey: `0x` + response.ownerPubkey,
        json: response.json
      },
      value: locklift.utils.toNano(1),
    });
    spinner.succeed(`Deploy Collection`);
  }
  catch(err) {
    spinner.fail(`Failed`);
    console.log(err);
    exit();
  }
  console.log(`Collection deployed at: ${collection.address.toString()}`);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
