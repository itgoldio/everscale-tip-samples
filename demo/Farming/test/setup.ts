import { expect } from "chai";
import { Contract, Signer } from "locklift";
import { FactorySource } from "../build/factorySource";
import { SimpleKeystore } from "everscale-standalone-client/nodejs";
import { Address } from "everscale-inpage-provider";
import { Account } from "locklift/factory";
import { 
    setupTokenRoot,
    setupCollection,
    setupPool
} from "./utils";

let signer: Signer;
let ownerAccount: Account<"Wallet">;
let tokenRoot;
let collection;
let nft;
let farmingPool;

describe("Setup test", async function () {

    before(async () => {
        let randKeypair = SimpleKeystore.generateKeyPair();
        await locklift.keystore.addKeyPair("random", randKeypair);    
        signer = (await locklift.keystore.getSigner("random"))!;
    
        let accountsFactory = locklift.factory.getAccountsFactory(
            "Wallet",
        );
        const {account: owner, tx} = await accountsFactory.deployNewAccount({
            publicKey: signer.publicKey,
            initParams: {
              _randomNonce: locklift.utils.getRandomNonce(),
            },
            constructorParams: {},
            value: locklift.utils.toNano(2)
        });
        ownerAccount = owner;
    });

    describe("Contracts", async function () {
        it("Deploy contracts", async function () {
            tokenRoot = await setupTokenRoot(signer, "Test", "TST", ownerAccount);
            collection = await setupCollection(signer);
            nft = await collection.mintNft(ownerAccount);
            farmingPool = await setupPool(ownerAccount, collection.collection, tokenRoot.tokenRoot, 0, 100000000, 3600, 100);
            await nft.changeManager(farmingPool, ownerAccount);

            const res = await farmingPool.farmPool.methods.getInfo({
                answerId: 0
            }).call();
            console.log(res.totalDeposits);
        });
    });
});