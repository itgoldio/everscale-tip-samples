async function main() {
  const Farming = await locklift.factory.getContract('NFTFarming');
  const Nft = await locklift.factory.getContract('Nft');
  const [keyPair] = await locklift.keys.getKeyPairs();

  const collection = "0:9fbfac96c871df2ce4787585a3909a50ab0faa997bf5aecf13bd21709e4e69ab";
  const rewardTokenRoot = "0:ab4f35e5601ef16826b967ccb8defb6858a2459e908a307a0cb41289adaf8648";
  const lockPeriod = 1;
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
