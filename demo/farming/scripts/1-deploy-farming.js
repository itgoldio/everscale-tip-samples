async function main() {
  const Farming = await locklift.factory.getContract('NFTFarming');
  const Nft = await locklift.factory.getContract('Nft');
  const [keyPair] = await locklift.keys.getKeyPairs();

  const collection = "0:82b814172643d9e51c6602f9bc847a7c3e961caabdc3179d1f5bfb398fdc20e8";
  const rewardTokenRoot = "0:04587638f14d3763087e0791b718e675d0d4bc448030c2b9c13bddab5d932795";
  const lockPeriod = 300;
  const farmStartTime = 1653947832;
  const rewardPerSecond = 10000000;

  const farming = await locklift.giver.deployContract({
    contract: Farming,
    constructorParams: {
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
