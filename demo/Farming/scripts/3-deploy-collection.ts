async function main() {
    let keyPair = (await locklift.keystore.getSigner("0"))!;
    let Nft = await locklift.factory.getContractArtifacts('Nft');
    const { contract: collection, tx } = await locklift.factory.deployContract({
        contract: "Collection",
        publicKey: keyPair.publicKey,
        constructorParams: {
            codeNft: Nft.code,
            ownerPubkey: "0x" + keyPair.publicKey
        },
        value: locklift.utils.toNano(10),
    });

    console.log(`Collection deployed at: ${collection.address.toString()}`);
}
  
main()
.then(() => process.exit(0))
.catch(e => {
    console.log(e);
    process.exit(1);
});
