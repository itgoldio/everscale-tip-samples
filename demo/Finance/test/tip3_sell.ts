import { expect } from "chai";
const logger = require("mocha-logger");
import { Address, Contract, Signer, zeroAddress } from "locklift";
import { FactorySource } from "../build/factorySource";
import { SimpleKeystore } from "everscale-standalone-client/nodejs";
import { Account } from "locklift/factory";
import { 
    setupTokenRoot,
    setupCollection,
    deployAccount,
    TokenRoot,
    Collection,
    NFT,
    TokenWallet,
    setupTIP3SellRoot,
    TIP3SellRoot,
    TIP3Sell
} from "./utils";

const TIP3_TOKEN_PRICE = 100;
const INIT_BUYER_TOKENS = 1000;

let sellMsg: string;
let signer: Signer;

let ownerAccount: Account<FactorySource["Wallet"]>;
let vendorAccount: Account<FactorySource["Wallet"]>;
let buyerAccount: Account<FactorySource["Wallet"]>;

let buyerTokenWallet: TokenWallet;
let vendorTokenWallet : TokenWallet;

let tip3SellConfirm: TIP3Sell;
let tip3SellCancel: TIP3Sell;

let tip3SellConfirmTokenWallet : TokenWallet;
let tip3SellCancelTokenWallet : TokenWallet;

let tokenRoot: TokenRoot;
let tip3SellRoot: TIP3SellRoot;
let collection: Collection;
let nftBuyConfirm: NFT;
let nftBuyCancel: NFT;

describe("TIP3Sell Test", async function () {
    before(async () => {
        let randKeypair = SimpleKeystore.generateKeyPair();
        await locklift.keystore.addKeyPair("random", randKeypair);    
        signer = (await locklift.keystore.getSigner("random"))!;
    });

    describe("Deploy Contracts", async function () {
        describe("Users", async function () {
            it('Deploy Users Accounts', async function() {
                const INITIAL_BALANCE = 10;
                ownerAccount = await deployAccount(signer, "Base Owner", INITIAL_BALANCE);
                vendorAccount = await deployAccount(signer, "Vendor", INITIAL_BALANCE);
                buyerAccount = await deployAccount(signer, "Buyer", INITIAL_BALANCE);
            });
        });
        describe("Collection", async function () {
            it('Deploy collection', async function() {
                const INITIAL_BALANCE = 1;
                collection = await setupCollection(
                    signer,
                    INITIAL_BALANCE
                );
                expect(await locklift.provider.getBalance(collection.collection.address).then(balance => Number(balance))).to.be.above(0);
            });
            it('Mint NFT for Vendor', async function() {
                nftBuyConfirm = await collection.mintNft(vendorAccount);
                nftBuyCancel = await collection.mintNft(vendorAccount);
            
                const mintEvents = await collection.collection.getPastEvents({ filter: event => event.event === "NftCreated" });
                expect(mintEvents.events[0].data.id.toString()).equal('1');
                expect(mintEvents.events[1].data.id.toString()).equal('0');

                expect(await locklift.provider.getBalance(nftBuyConfirm.nft.address).then(balance => Number(balance))).to.be.above(0);
                expect(await locklift.provider.getBalance(nftBuyCancel.nft.address).then(balance => Number(balance))).to.be.above(0);
            });
        });
        describe("TIP3 Token Root", async function () {
            it('Deploy TIP3 Token Root', async function() {
                const INITIAL_SUPPLY = 0;
                const INITIAL_BALANCE = 3;
                tokenRoot = await setupTokenRoot(
                    signer,
                    "Test",
                    "Test",
                    ownerAccount,
                    INITIAL_SUPPLY,
                    INITIAL_BALANCE 
                );
                expect(await locklift.provider.getBalance(tokenRoot.tokenRoot.address).then(balance => Number(balance))).to.be.above(0);
            });
            it('Mint tokens to Buyer', async function() {
                buyerTokenWallet = await tokenRoot.mint(
                    INIT_BUYER_TOKENS,
                    buyerAccount
                );
                logger.log(`Mint ${INIT_BUYER_TOKENS} TOKENS to Buyer`);
                expect(await locklift.provider.getBalance(buyerTokenWallet.wallet.address).then(balance => Number(balance))).to.be.above(0);
            });
        });
        describe("TIP3 Sell Root", async function () {
            it('Deploy TIP3SellRoot', async function() {
                const INITIAL_BALANCE = 1;
                tip3SellRoot = await setupTIP3SellRoot(
                    signer,
                    tokenRoot.tokenRoot.address.toString(),
                    INITIAL_BALANCE
                );
                expect(await locklift.provider.getBalance(tip3SellRoot.sellRoot.address).then(balance => Number(balance))).to.be.above(0);
            });
        });
    });
    describe("Create sell offers", async function () {
        before(async () => {
            sellMsg = await tip3SellRoot.buildSellMsg(vendorAccount.address.toString(), TIP3_TOKEN_PRICE);

            let tip3SellConfirmAddress = await tip3SellRoot.sellAddress(nftBuyConfirm.nft.address.toString());
            let tip3SellCancelAddress = await tip3SellRoot.sellAddress(nftBuyCancel.nft.address.toString());

            tip3SellConfirm = await TIP3Sell.from_addr(
                tip3SellConfirmAddress.toString(),
                vendorAccount
            );

            tip3SellCancel = await TIP3Sell.from_addr(
                tip3SellCancelAddress.toString(),
                vendorAccount
            );
        });

        it('Sell NFTs', async function() {
            let gasSellRootPrices = await tip3SellRoot.getGasPrice();
            const ADVANCE_GAS = 0.1;
            let value: number = Number(gasSellRootPrices.totalPrice) + Number(locklift.utils.toNano(ADVANCE_GAS));
            await vendorAccount.accountContract.methods.sendTransaction({
                dest: nftBuyConfirm.nft.address,
                value: value,
                bounce: true,
                flags: 0,
                payload: sellMsg
              }).sendExternal(
                {
                  publicKey: signer.publicKey
                }
            );
            await vendorAccount.accountContract.methods.sendTransaction({
                dest: nftBuyCancel.nft.address,
                value: value,
                bounce: true,
                flags: 0,
                payload: sellMsg
              }).sendExternal(
                {
                  publicKey: signer.publicKey
                }
            );

            const deployEvents = await tip3SellRoot.sellRoot.getPastEvents({ filter: event => event.event === "SellCreated" });
            expect(deployEvents.events.length).equal(2);
            expect(deployEvents.events[0].data.sell.toString()).equal(tip3SellCancel.sell.address.toString());
            expect(deployEvents.events[1].data.sell.toString()).equal(tip3SellConfirm.sell.address.toString());

            expect(await locklift.provider.getFullContractState({ address: tip3SellConfirm.sell.address }).then(res => res.state?.isDeployed)).to.be.true;
            expect(await locklift.provider.getFullContractState({ address: tip3SellCancel.sell.address }).then(res => res.state?.isDeployed)).to.be.true;

            logger.log(`Create offer: ${tip3SellConfirm.sell.address}\nChange manager for NFT_1 to => ${tip3SellConfirm.sell.address}`);
            logger.log(`Create offer: ${tip3SellCancel.sell.address}\nChange manager for NFT_2 to => ${tip3SellCancel.sell.address}`);
        });

        it('Check sell offers', async function() {
            let managerNftSellConfirm = await nftBuyConfirm.manager();
            let managerNftSellCancel = await nftBuyCancel.manager();

            expect(managerNftSellConfirm.toString()).equal(await tip3SellConfirm.sell.address.toString());
            expect(managerNftSellCancel.toString()).equal(await tip3SellCancel.sell.address.toString());

            let vendorTip3TokenWalletAddress = await tokenRoot.walletAddr(vendorAccount.address);
            let sellConfirmTip3TokenWalletAddress = await tokenRoot.walletAddr(tip3SellConfirm.sell.address);
            let sellCancelTip3TokenWalletAddress = await tokenRoot.walletAddr(tip3SellCancel.sell.address);

            vendorTokenWallet = await TokenWallet.from_addr(
                vendorTip3TokenWalletAddress.toString(),
                vendorAccount
            );
            tip3SellConfirmTokenWallet = await TokenWallet.from_addr(
                sellConfirmTip3TokenWalletAddress.toString(),
                vendorAccount
            );
            tip3SellCancelTokenWallet = await TokenWallet.from_addr(
                sellCancelTip3TokenWalletAddress.toString(),
                vendorAccount
            );

            expect(await locklift.provider.getFullContractState({ address: vendorTokenWallet.wallet.address }).then(res => res.state?.isDeployed)).to.be.true;
            expect(await locklift.provider.getFullContractState({ address: tip3SellConfirmTokenWallet.wallet.address }).then(res => res.state?.isDeployed)).to.be.true;
            expect(await locklift.provider.getFullContractState({ address: tip3SellCancelTokenWallet.wallet.address }).then(res => res.state?.isDeployed)).to.be.true;

            const readyToSellConfirmEvents = await tip3SellConfirm.sell.getPastEvents({ filter: event => event.event === "ReadyToSell" });
            const readyToSellCancelEvents = await tip3SellCancel.sell.getPastEvents({ filter: event => event.event === "ReadyToSell" });
            expect(readyToSellConfirmEvents.events[0].data.owner.toString()).equal(vendorAccount.address.toString());
            expect(readyToSellCancelEvents.events[0].data.owner.toString()).equal(vendorAccount.address.toString());
            
            let infoSellConfim = await tip3SellConfirm.getInfo();
            let infoSellCancel = await tip3SellCancel.getInfo();

            function check(
                data: any,
                nft: NFT,
                tip3SellTokenWallet: TokenWallet
            ) {
                expect(data.nft.toString()).equal(nft.nft.address.toString());
                expect(data.tip3VendorWallet.toString()).equal(vendorTokenWallet.wallet.address.toString());
                expect(data.tip3SellWallet.toString()).equal(tip3SellTokenWallet.wallet.address.toString());
                expect(data.sendGasTo.toString()).equal(vendorAccount.address.toString());
                expect(data.price).equal(TIP3_TOKEN_PRICE.toString());
                expect(data.tip3SellRoot.toString()).equal(tip3SellRoot.sellRoot.address.toString());
                expect(data.tip3TokenRoot.toString()).equal(tokenRoot.tokenRoot.address.toString());
                expect(data.status).equal('1');
            }

            check(infoSellConfim, nftBuyConfirm, tip3SellConfirmTokenWallet);
            check(infoSellCancel, nftBuyCancel, tip3SellCancelTokenWallet);
        });
    });
    describe("Confirm offer", async function () {
        it('Buy', async function() {
            const ADVANCE_GAS = 0.1;
            let gasSellPrices = await tip3SellConfirm.getGasPrice();
            let gas: number = Number(locklift.utils.fromNano(gasSellPrices.confirmSellPrice)) + ADVANCE_GAS;
            await buyerTokenWallet.transfer(
                TIP3_TOKEN_PRICE,
                tip3SellConfirmTokenWallet.wallet.address,
                gas
            );

            const buyEvents = await tip3SellConfirm.sell.getPastEvents({ filter: event => event.event === "Buy" });
            expect(buyEvents.events.length).equal(1);
            expect(buyEvents.events[0].data.newOwner.toString()).equal(buyerAccount.address.toString());
            expect(buyEvents.events[0].data.oldOwner.toString()).equal(vendorAccount.address.toString());

            let manager = await nftBuyConfirm.manager();
            let owner = await nftBuyConfirm.owner();

            let vendorTokenWalletBalance = await vendorTokenWallet.balance();
            let buyerTokenWalletBalance = await buyerTokenWallet.balance();

            expect(manager.toString()).equal(owner.toString());
            expect(manager.toString()).equal(buyerAccount.address.toString());
            expect(Number(vendorTokenWalletBalance)).equal(TIP3_TOKEN_PRICE);
            expect(Number(buyerTokenWalletBalance)).equal(INIT_BUYER_TOKENS - TIP3_TOKEN_PRICE);

            expect(await locklift.provider.getFullContractState({ address: tip3SellConfirmTokenWallet.wallet.address }).then(res => res.state?.isDeployed)).to.be.undefined;
            expect(await locklift.provider.getFullContractState({ address: tip3SellConfirm.sell.address }).then(res => res.state?.isDeployed)).to.be.undefined;

            logger.log(`Confirm offer by: ${buyerAccount.address}\nChange owner for NFT_1 to => ${owner.toString()}\n\Vendor Token Wallet: ${vendorTokenWalletBalance} TOKENS\nBuyer Token Wallet: ${buyerTokenWalletBalance} TOKENS`);
        });
    });
    describe("Cancel offer", async function () {
        it('Cancel', async function() {
            const ADVANCE_GAS = 0.2;
            let gasSellPrices = await tip3SellCancel.getGasPrice();
            let gas: number = Number(locklift.utils.fromNano(gasSellPrices.cancelSellPrice)) + ADVANCE_GAS;
            await tip3SellCancel.cancelSell(
                vendorAccount,
                vendorAccount.address.toString(),
                gas
            );

            const buyEvents = await tip3SellCancel.sell.getPastEvents({ filter: event => event.event === "Cancel" });
            expect(buyEvents.events[0].data.owner.toString()).equal(vendorAccount.address.toString());

            let manager = await nftBuyCancel.manager();
            let owner = await nftBuyCancel.owner();

            expect(manager.toString()).equal(owner.toString());
            expect(manager.toString()).equal(vendorAccount.address.toString());

            expect(await locklift.provider.getFullContractState({ address: tip3SellCancelTokenWallet.wallet.address }).then(res => res.state?.isDeployed)).to.be.undefined;
            expect(await locklift.provider.getFullContractState({ address: tip3SellCancel.sell.address }).then(res => res.state?.isDeployed)).to.be.undefined;

            logger.log(`Cancel offer by owner: ${vendorAccount.address}\nChange owner for NFT_2 to => ${owner.toString()}`);
        });
    });
});