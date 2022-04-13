async function main() {
  const Collection = await locklift.factory.getContract('Collection');
  const Nft = await locklift.factory.getContract('Nft');
  const Storage = await locklift.factory.getContract('../../../contracts/TIP4_4/compiled/Storage');
  const [keyPair] = await locklift.keys.getKeyPairs();
  /// Type your ownerPubkey
  const ownerPubkey = "0x" + keyPair.public;
  
  const collection = await locklift.giver.deployContract({
    contract: Collection,
    constructorParams: {
      codeNft : Nft.code, 
      ownerPubkey : ownerPubkey,
      codeStorage : Storage.code
    },
    initParams: {},
    keyPair,
  }, locklift.utils.convertCrystal(1, 'nano'));

  console.log(`Collection deployed at: ${collection.address}`);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
