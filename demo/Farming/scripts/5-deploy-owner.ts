async function main() {
    let keyPair = (await locklift.keystore.getSigner("0"))!;
    let accountsFactory = locklift.factory.getAccountsFactory(
        "Wallet",
    );
    const {account: owner, tx} = await accountsFactory.deployNewAccount({
        publicKey: keyPair.publicKey,
        initParams: {
          _randomNonce: locklift.utils.getRandomNonce(),
        },
        constructorParams: {},
        value: locklift.utils.toNano(5)
    });

    console.log(`Owner wallet deployed at: ${owner.address.toString()}`);
}
  
main()
.then(() => process.exit(0))
.catch(e => {
    console.log(e);
    process.exit(1);
});
