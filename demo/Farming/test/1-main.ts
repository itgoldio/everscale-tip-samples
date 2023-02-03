import { expect } from "chai";
import { Contract, Signer } from "locklift";
import { FactorySource } from "../build/factorySource";
import { SimpleKeystore } from "everscale-standalone-client/nodejs";
import { Address } from "everscale-inpage-provider";
import { Account } from "locklift/factory";
import { 
    setupTokenRoot,
    setupCollection,
    setupPool,
    deployAccount,
    TokenRoot,
    Collection,
    NFT,
    FarmingPool,
    TokenWallet,
    sleep,
    checkReward
} from "./utils";

let signer: Signer;
let adminAccount: Account<FactorySource["Wallet"]>;
let rewardTokenRoot: TokenRoot;
let collection: Collection;
let user1: Account<FactorySource["Wallet"]>;
let user2: Account<FactorySource["Wallet"]>;
let userNft1_1: NFT;
let userNft1_2: NFT;
let userNft2: NFT;
let farmPool: FarmingPool;
let farmPoolWallet: string;
let farmStart: number;
let farmEnd: number;
let rewardPerSec: number;
let adminRewardWallet: TokenWallet;
let event1;

describe("Setup test", async function () {
    before(async () => {
        let randKeypair = SimpleKeystore.generateKeyPair();
        await locklift.keystore.addKeyPair("random", randKeypair);    
        signer = (await locklift.keystore.getSigner("random"))!;
    });

    describe("Setup contracts", async function () {
        describe("TIP3 tokens", async function () {
            it('Deploy admin', async function() {
                adminAccount = await deployAccount();
            });

            it('Deploy roots', async function() {
                rewardTokenRoot = await setupTokenRoot(signer, "Reward token", "RT", adminAccount);
                collection = await setupCollection(signer);
            });

            it('Mint tokens', async function() {
                adminRewardWallet = await rewardTokenRoot.mint(1e18, adminAccount);
            });
        });

        describe("Users", async function () {
            it('Deploy users accounts', async function() {
                let users = [];
                for(let i of [1, 2]){
                    const user = await deployAccount();
                    users.push(user);
                }
                [user1, user2] = users;
            });

            it('Mint tip4 tokens(nft\'s)', async function() {
                userNft1_1 = await collection.mintNft(user1);
                userNft1_2 = await collection.mintNft(user1);
                userNft2 = await collection.mintNft(user2);

                expect(await locklift.provider.getBalance(userNft1_1.nft.address).then(balance => Number(balance))).to.be.above(0);
                expect(await locklift.provider.getBalance(userNft1_2.nft.address).then(balance => Number(balance))).to.be.above(0);
                expect(await locklift.provider.getBalance(userNft2.nft.address).then(balance => Number(balance))).to.be.above(0);
            });
        }); 
    });

    describe("Base staking pipeline testing", async function () {
        describe("Farm pool", async function () {
            it('Deploy farm pool', async function() {
                farmStart = Math.floor(Date.now() / 1000);
                farmEnd = Math.floor(Date.now() / 1000) + 10000;
                rewardPerSec = 1;

                farmPool = await setupPool(
                    adminAccount, 
                    collection.collection, 
                    rewardTokenRoot.tokenRoot, 
                    farmStart, 
                    rewardPerSec, 
                    0, 
                    0
                );

                farmPoolWallet = await farmPool.wallet();
            });

            it('Sending reward tokens to pool', async function() {
                const amount = (farmEnd - farmStart) * rewardPerSec;

                await farmPool.deposit(adminRewardWallet, amount);
                const pastEvents = await farmPool.farmPool.getPastEvents({ filter: event => event.event === "RewardDeposit" });
                [event1] = pastEvents.events;

                expect(Number(event1.data.amount)).to.be.equal(amount);
                expect(event1.data.tokenRoot.toString()).to.be.equal(rewardTokenRoot.tokenRoot.address.toString());

                const info = await farmPool.info();
                const rewardBalance = info.rewardTokenWalletBalance;

                expect(Number(rewardBalance)).to.be.equal(amount);
            });

            it('User1 deposit 1st token', async function() {
                await userNft1_1.changeManager(farmPool.farmPool, user1);

                const pastEvents = await farmPool.farmPool.getPastEvents({ filter: event => event.event === "Deposit" });
                let depositEvent = pastEvents.events[0];

                expect(depositEvent.data.user.toString()).to.be.equal(user1.address.toString()); 
                expect(depositEvent.data.nft.toString()).to.be.equal(userNft1_1.nft.address.toString()); 

                let expUserDataAddr = await farmPool.userDataAddress(user1.address.toString()); 
                expect(await locklift.provider.getBalance(expUserDataAddr).then(balance => Number(balance))).to.be.above(0);

                let expWalletAddr = await rewardTokenRoot.walletAddr(user1);
                expect(await locklift.provider.getBalance(expWalletAddr).then(balance => Number(balance))).to.be.above(0);
            });

            it('User1 deposit 2nd token', async function() {
                let preInfo = await farmPool.info();
                let user1Wallet = await rewardTokenRoot.wallet(user1);
                let userOldWalletBalance = await user1Wallet.balance();

                let user1Data = await farmPool.userData(user1);
                let prevRewardDebt = await user1Data.rewardDebt();
                let prevNumOfDeposits = await user1Data.numOfDeposits();

                await userNft1_2.changeManager(farmPool.farmPool, user1);
                let newInfo = await farmPool.info();
                expect(Number(newInfo.lastRewardTime)).to.be.above(Number(preInfo.lastRewardTime));

                await checkReward(
                    user1Wallet, 
                    Number(userOldWalletBalance),
                    prevRewardDebt,
                    Number(newInfo.accRewardPerShare),
                    prevNumOfDeposits
                );
            });

            it('User1 claim half of staked amount', async function() {
                let preInfo = await farmPool.info();
                let user1Wallet = await rewardTokenRoot.wallet(user1);
                let userOldWalletBalance = await user1Wallet.balance();

                await sleep(2000);

                let user1Data = await farmPool.userData(user1);
                let prevRewardDebt = await user1Data.rewardDebt();
                let prevNumOfDeposits = await user1Data.numOfDeposits();

                await farmPool.claimReward(user1);

                let newInfo = await farmPool.info();
                expect(Number(newInfo.lastRewardTime)).to.be.above(Number(preInfo.lastRewardTime));

                await checkReward(
                    user1Wallet, 
                    Number(userOldWalletBalance),
                    prevRewardDebt,
                    Number(newInfo.accRewardPerShare),
                    prevNumOfDeposits
                );
            });

            it('Withdraw tokens', async function() {
                let preInfo = await farmPool.info();
                let user1Wallet = await rewardTokenRoot.wallet(user1);
                let userOldWalletBalance = await user1Wallet.balance();

                let user1Data = await farmPool.userData(user1);
                let prevRewardDebt = await user1Data.rewardDebt();
                let prevNumOfDeposits = await user1Data.numOfDeposits();

                await farmPool.withdraw(user1, userNft1_1.nft.address);
                await userNft1_1.updateManager(user1);
                
                let newInfo = await farmPool.info();
                expect(Number(newInfo.lastRewardTime)).to.be.above(Number(preInfo.lastRewardTime));

                let reward = await checkReward(
                    user1Wallet, 
                    Number(userOldWalletBalance),
                    prevRewardDebt,
                    Number(newInfo.accRewardPerShare),
                    prevNumOfDeposits
                );

                let pastEvents = await farmPool.farmPool.getPastEvents({ filter: event => event.event === "Withdraw" });
                let withdrawEvent = pastEvents.events[0];

                expect(Number(newInfo.totalDeposits)).to.be.equal(Number(preInfo.totalDeposits) - 1);

                expect(withdrawEvent.data.user.toString()).to.be.equal(user1.address.toString());
                expect(withdrawEvent.data.nft.toString()).to.be.equal(userNft1_1.nft.address.toString());
                expect(Number(withdrawEvent.data.reward)).to.be.equal(reward);
                expect(Number(withdrawEvent.data.reward_debt)).to.be.equal(0);
                    
                preInfo = await farmPool.info();
                user1Wallet = await rewardTokenRoot.wallet(user1);
                userOldWalletBalance = await user1Wallet.balance();
                user1Data = await farmPool.userData(user1);
                prevRewardDebt = await user1Data.rewardDebt();
                prevNumOfDeposits = await user1Data.numOfDeposits();

                await farmPool.withdraw(user1, userNft1_2.nft.address);
                await userNft1_2.updateManager(user1);

                newInfo = await farmPool.info();

                reward = await checkReward(
                    user1Wallet, 
                    Number(userOldWalletBalance),
                    prevRewardDebt,
                    Number(newInfo.accRewardPerShare),
                    prevNumOfDeposits
                );

                pastEvents = await farmPool.farmPool.getPastEvents({ filter: event => event.event === "Withdraw" });
                withdrawEvent = pastEvents.events[0];

                expect(withdrawEvent.data.user.toString()).to.be.equal(user1.address.toString());
                expect(withdrawEvent.data.nft.toString()).to.be.equal(userNft1_2.nft.address.toString());
                expect(Number(withdrawEvent.data.reward)).to.be.equal(reward);
                expect(Number(withdrawEvent.data.reward_debt)).to.be.equal(0);
            });

            it('Multiple users farming', async function() {
                await userNft1_1.changeManager(farmPool.farmPool, user1);

                let pastEvents = await farmPool.farmPool.getPastEvents({ filter: event => event.event === "Deposit" });
                let depositEvent = pastEvents.events[0];

                expect(depositEvent.data.user.toString()).to.be.equal(user1.address.toString()); 
                expect(depositEvent.data.nft.toString()).to.be.equal(userNft1_1.nft.address.toString()); 

                let expUserDataAddr = await farmPool.userDataAddress(user1.address.toString()); 
                expect(await locklift.provider.getBalance(expUserDataAddr).then(balance => Number(balance))).to.be.above(0);
                let expWalletAddr = await rewardTokenRoot.walletAddr(user1);
                expect(await locklift.provider.getBalance(expWalletAddr).then(balance => Number(balance))).to.be.above(0);

                await userNft2.changeManager(farmPool.farmPool, user2);

                pastEvents = await farmPool.farmPool.getPastEvents({ filter: event => event.event === "Deposit" });
                depositEvent = pastEvents.events[0];

                expect(depositEvent.data.user.toString()).to.be.equal(user2.address.toString()); 
                expect(depositEvent.data.nft.toString()).to.be.equal(userNft2.nft.address.toString()); 

                expUserDataAddr = await farmPool.userDataAddress(user2.address.toString()); 
                expect(await locklift.provider.getBalance(expUserDataAddr).then(balance => Number(balance))).to.be.above(0);

                expWalletAddr = await rewardTokenRoot.walletAddr(user2);
                expect(await locklift.provider.getBalance(expWalletAddr).then(balance => Number(balance))).to.be.above(0);

                let preInfo = await farmPool.info();
                let user1Wallet = await rewardTokenRoot.wallet(user1);
                let userOldWalletBalance = await user1Wallet.balance();

                let user1Data = await farmPool.userData(user1);
                let prevRewardDebt = await user1Data.rewardDebt();
                let prevNumOfDeposits = await user1Data.numOfDeposits();

                await farmPool.withdraw(user1, userNft1_1.nft.address);
                await userNft1_1.updateManager(user1);
                
                let newInfo = await farmPool.info();
                expect(Number(newInfo.lastRewardTime)).to.be.above(Number(preInfo.lastRewardTime));

                let reward = await checkReward(
                    user1Wallet, 
                    Number(userOldWalletBalance),
                    prevRewardDebt,
                    Number(newInfo.accRewardPerShare),
                    prevNumOfDeposits
                );

                let withdrawEvents = await farmPool.farmPool.getPastEvents({ filter: event => event.event === "Withdraw" });
                let withdrawEvent = withdrawEvents.events[0];

                expect(Number(newInfo.totalDeposits)).to.be.equal(Number(preInfo.totalDeposits) - 1);

                expect(withdrawEvent.data.user.toString()).to.be.equal(user1.address.toString());
                expect(withdrawEvent.data.nft.toString()).to.be.equal(userNft1_1.nft.address.toString());
                expect(Number(withdrawEvent.data.reward)).to.be.equal(reward);
                expect(Number(withdrawEvent.data.reward_debt)).to.be.equal(0);
                    
                preInfo = await farmPool.info();
                let user2Wallet = await rewardTokenRoot.wallet(user2);
                userOldWalletBalance = await user2Wallet.balance();
                let user2Data = await farmPool.userData(user2);
                prevRewardDebt = await user2Data.rewardDebt();
                prevNumOfDeposits = await user2Data.numOfDeposits();

                await farmPool.withdraw(user2, userNft2.nft.address);
                await userNft2.updateManager(user2);

                newInfo = await farmPool.info();
                expect(Number(newInfo.lastRewardTime)).to.be.above(Number(preInfo.lastRewardTime));

                reward = await checkReward(
                    user2Wallet, 
                    Number(userOldWalletBalance),
                    prevRewardDebt,
                    Number(newInfo.accRewardPerShare),
                    prevNumOfDeposits
                );

                withdrawEvents = await farmPool.farmPool.getPastEvents({ filter: event => event.event === "Withdraw" });
                withdrawEvent = withdrawEvents.events[0];

                expect(Number(newInfo.totalDeposits)).to.be.equal(Number(preInfo.totalDeposits) - 1);

                expect(withdrawEvent.data.user.toString()).to.be.equal(user2.address.toString());
                expect(withdrawEvent.data.nft.toString()).to.be.equal(userNft2.nft.address.toString());
                expect(Number(withdrawEvent.data.reward)).to.be.equal(reward);
                expect(Number(withdrawEvent.data.reward_debt)).to.be.equal(0);
            });

            it('Withdraw unclaimed tokens', async function() {
                await userNft1_1.changeManager(farmPool.farmPool, user1);

                let info = await farmPool.info();
                let withdrawWallet = await rewardTokenRoot.wallet(adminAccount);
                let withdrawWalletBalance = await withdrawWallet.balance();
                let unclaimedReward = Number(info.unclaimedReward);

                if (Number(unclaimedReward) > 0) {
                    await farmPool.withdrawUnclaimed(adminAccount.address);

                    let newWithdrawWalletBalance = await withdrawWallet.balance();
                    let expectedBalance = Number(withdrawWalletBalance) + Number(unclaimedReward);

                    expect(Number(newWithdrawWalletBalance)).to.be.equal(expectedBalance);
                } 
            });
        });
    });
});