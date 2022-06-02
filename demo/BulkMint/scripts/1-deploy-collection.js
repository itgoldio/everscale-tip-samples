async function main() {
  const Collection = await locklift.factory.getContract('Collection');
  const Nft = await locklift.factory.getContract('Nft');
  const [keyPair] = await locklift.keys.getKeyPairs();
  const ownerPubkey = "0xf1dff7f5636525721332fcedfc41910ba9008278c1b99323c460fb58c34ad132";
  const json = "{}"
  
  const collection = await locklift.giver.deployContract({
    contract: Collection,
    constructorParams: {
      codeNft: Nft.code,
      ownerPubkey: ownerPubkey,
      json: json
    },
    initParams: {},
    keyPair,
  }, locklift.utils.convertCrystal(100, 'nano'));
  
  console.log(`Collection deployed at: ${collection.address}`);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
