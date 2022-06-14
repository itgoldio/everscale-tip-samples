async function main() {
  const Farming = await locklift.factory.getContract('NFTFarming');
  const Nft = await locklift.factory.getContract('Nft');
  const [keyPair] = await locklift.keys.getKeyPairs();


  const collection = "0:379d50a829c0a8c080cab108aec4bbdd7ddfe9734b99cf892e02c005ffa6758e";
  const rewardTokenRoot = "0:afaf99f73266c86f4ff57354568801af39c3921999a29f2240c1daaaa7478264";
  const lockPeriod = 300;
  const farmStartTime = 1653947832;
  const rewardPerSecond = 100000;
  const owner = "0:488921925e7f2d103ba1fd0af0552f180ea94ce0df7b6f82eed69d27e7882106";

  const farming = await locklift.giver.deployContract({
    contract: Farming,
    constructorParams: {
      owner: owner,
      collection: collection,
      rewardTokenRoot: rewardTokenRoot,
      codeNft: Nft.code,
      lockPeriod: lockPeriod,
      farmStartTime: farmStartTime,
      rewardPerSecond: rewardPerSecond
    },
    initParams: {
    },
    keyPair,
  });
  
  console.log(`Farming deployed at: ${farming.address}`);
}


main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
