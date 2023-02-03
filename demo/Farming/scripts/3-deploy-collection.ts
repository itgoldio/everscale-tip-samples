import { generateBip39Phrase, deriveBip39Phrase, makeBip39Path } from "everscale-crypto";

async function main() {
    let keyPair = (await locklift.keystore.getSigner("0"))!;
    let Nft = await locklift.factory.getContractArtifacts('Nft');
    // const randKeypair = await locklift.ton.client.crypto.generate_random_sign_keys();
    let phrase = generateBip39Phrase(12);
    phrase = "hero cave pencil nasty dolphin jewel try ridge valid away sell awesome";
    // console.log(phrase);
    let path = makeBip39Path(0x1);
    let randKeypair = deriveBip39Phrase(phrase, path);
    console.log(randKeypair);
    const { contract: collection, tx } = await locklift.factory.deployContract({
        contract: "Collection",
        publicKey: randKeypair.publicKey,
        constructorParams: {
            codeNft: Nft.code,
            ownerPubkey: "0x" + keyPair.publicKey
        },
        initParams: {},
        value: locklift.utils.toNano(5),
    });

    console.log(`Collection deployed at: ${collection.address.toString()}`);
}
  
main()
.then(() => process.exit(0))
.catch(e => {
    console.log(e);
    process.exit(1);
});
