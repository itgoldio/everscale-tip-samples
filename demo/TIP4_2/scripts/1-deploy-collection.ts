import ora from 'ora';
import prompts from 'prompts';

async function main() {
  const signer = (await locklift.keystore.getSigner("0"))!;
  const spinner = ora();
  const response = await prompts([
    {
        type: 'text',
        name: 'ownerPubkey',
        message: 'Owner key',
        initial: signer.publicKey
    },
    {
      type: 'text',
      name: 'json',
      message: 'Collection json',
      initial: `{"field": "value"}`
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
        json: response.json,
        ownerPubkey: `0x` + response.ownerPubkey
      },
     value: locklift.utils.toNano(2),
    });
    spinner.succeed(`Deploy Collection`);
    console.log(`Collection deployed at: ${collection.address.toString()}`);
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