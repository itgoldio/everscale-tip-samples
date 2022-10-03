import ora from 'ora';
import prompts from 'prompts';

async function main() {
  const spinner = ora();
  const response = await prompts([
    {
        type: 'text',
        name: 'ownerPubkey',
        message: 'Owner key',
        initial: ""
    },
    {
      type: 'text',
      name: 'json',
      message: 'Collection json',
      initial: ""
    },
    {
      type: 'number',
      name: 'mintingFee',
      message: 'Minting fee (nano)',
      initial: 0
    },
  ]);
  spinner.start(`Deploy Collection`);
  try {
    const Nft = await locklift.factory.getContractArtifacts("Nft");
    const Index = await locklift.factory.getContractArtifacts("Index");
    const IndexBasis = await locklift.factory.getContractArtifacts("IndexBasis");
    const signer = (await locklift.keystore.getSigner("0"))!;
    const { contract: collection, tx } = await locklift.factory.deployContract({
      contract: "Collection",
      publicKey: signer.publicKey,
      initParams: {},
      constructorParams: {
        codeNft: Nft.code,
        codeIndex: Index.code,
        codeIndexBasis: IndexBasis.code,
        ownerPubkey: `0x` + response.ownerPubkey,
        json: response.json,
        mintingFee: response.mintingFee
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