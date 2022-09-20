const logger = require("mocha-logger");
import { Address } from "everscale-inpage-provider";
import { Contract, Signer } from "locklift";
import { FactorySource } from "../build/factorySource";
import { expect } from "chai";
import { Account } from "locklift/factory";
import { SimpleKeystore } from "everscale-standalone-client/nodejs";
import { LargeNumberLike } from "crypto";
const BigNumber = require("bignumber.js");


export const zeroAddress = new Address("0:0000000000000000000000000000000000000000000000000000000000000000");


// -------------------------- ENTITIES ----------------------------
export class TokenWallet {
    wallet: Contract<FactorySource["TokenWallet"]>;
    _owner: Account<FactorySource["Wallet"]>;

    constructor(walletContract: Contract<FactorySource["TokenWallet"]>, walletOwner: Account<FactorySource["Wallet"]>) {
        this.wallet = walletContract;
        this._owner = walletOwner;
    }

    static async from_addr(addr: string, owner: Account<FactorySource["Wallet"]>) {
        let userTokenWallet = await locklift.factory.getDeployedContract(
            'TokenWallet',
            new Address(addr),
        );

        return new TokenWallet(userTokenWallet, owner);
    }

    async owner() {
        const response = await this.wallet.methods.owner({answerId: 0}).call();
        return response.value0;
    }

    async root() {
        const response = await this.wallet.methods.root({answerId: 0}).call();
        return response.value0;
    }

    async balance() {
        const response = await this.wallet.methods.balance({answerId: 0}).call();
        return response.value0;
    }

    async transfer(amount: number, receiver_or_addr: any, notify: Boolean = false, payload='', tracing=null, allowed_codes={compute: []}) {
        let addr = receiver_or_addr.address;
        if (addr === undefined) {
            addr = receiver_or_addr;
        }

        if (tracing) {
            return await locklift.tracing.trace(
                this._owner.runTarget(
                    {
                        contract: this.wallet,
                        value: locklift.utils.toNano(5),
                    },
                    wallet =>
                    wallet.methods.transfer({
                        amount: amount,
                        recipient: addr,
                        deployWalletValue: 0,
                        remainingGasTo: this._owner.address,
                        notify: notify,
                        payload: payload            
                    }),
                ),
                {
                  allowedCodes: allowed_codes,
                },
            );
        } else {
            return await this._owner.runTarget(
                {
                    contract: this.wallet,
                    value: locklift.utils.toNano(5),
                },
                wallet =>
                wallet.methods.transfer({
                    amount: amount,
                    recipient: addr,
                    deployWalletValue: 0,
                    remainingGasTo: this._owner.address,
                    notify: notify,
                    payload: payload            
                }),
            );
        }
    
    }
}

export class TokenRoot {
    tokenRoot: Contract<FactorySource["TokenRoot"]>;
    owner: Account<FactorySource["Wallet"]>;

    constructor(token_contract: Contract<FactorySource["TokenRoot"]>, token_owner: Account<FactorySource["Wallet"]>) {
        this.tokenRoot = token_contract;
        this.owner = token_owner;
    }

    static async from_addr(addr: string, owner: Account<FactorySource["Wallet"]>) {
        let rootToken = await locklift.factory.getDeployedContract(
            'TokenRoot',
            new Address(addr),
        );
        return new TokenRoot(rootToken, owner);
    }

    async walletAddr(user_or_addr: any) {
        let addr = user_or_addr.address;
        if (addr === undefined) {
            addr = user_or_addr;
        }

        const walletOf = await this.tokenRoot.methods.walletOf({
            answerId: 0,
            walletOwner: addr
        }).call();

        return walletOf.value0;
    }

    async wallet(user: Account<FactorySource["Wallet"]>) {
        const wallet_addr = await this.walletAddr(user);
        return TokenWallet.from_addr(wallet_addr.toString(), user);
    }

    async deployWallet(account: Account<FactorySource["Wallet"]>) {

        await account.runTarget(
            {
                contract: this.tokenRoot,
                value: locklift.utils.toNano(2),
            },
            tokenRoot =>
            tokenRoot.methods.deployWallet({
                answerId: 0,
                walletOwner: account.address,
                deployWalletValue: locklift.utils.toNano(1),       
            }),
        );

        const addr = await this.walletAddr(account);

        logger.log(`User token wallet: ${addr}`);
        return TokenWallet.from_addr(addr.toString(), account);
    }

    async mint(mint_amount: number, user: Account<FactorySource["Wallet"]>) {
        await this.owner.runTarget(
            {
                contract: this.tokenRoot,
                value: locklift.utils.toNano(3),
            },
            tokenRoot =>
            tokenRoot.methods.mint({
                amount: mint_amount,
                recipient: user.address,
                deployWalletValue: locklift.utils.toNano(1),
                remainingGasTo: this.owner.address,
                notify: false,
                payload: ''       
            }),
        );

        const walletAddr = await this.walletAddr(user);

        logger.log(`User token wallet: ${walletAddr}`);
        return TokenWallet.from_addr(walletAddr.toString(), user);
    }
}  

export class NFT {
    nft: Contract<FactorySource["Nft"]>;
    _owner: Account<FactorySource["Wallet"]>;
    _manager: Account<FactorySource["Wallet"]>;

    constructor(nft_contract: Contract<FactorySource["Nft"]>, owner: Account<FactorySource["Wallet"]>) {
        this.nft = nft_contract;
        this._owner = owner;
        this._manager = owner;
    }

    static async from_addr(addr: string, owner: Account<FactorySource["Wallet"]>) {
        let userNft = await locklift.factory.getDeployedContract(
            'Nft',
            new Address(addr),
        );

        return new NFT(userNft, owner);
    }

    async owner() {
        const response = await this.nft.methods.getInfo({answerId: 0}).call();
        return response.owner;
    }

    async collection() {
        const response = await this.nft.methods.getInfo({answerId: 0}).call();
        return response.collection;
    }

    async manager() {
        const response = await this.nft.methods.getInfo({answerId: 0}).call();
        return response.manager;
    }

    async transfer(to, sendGasTo, tracing=null, allowed_codes={compute: []}) {
        let sendGas = sendGasTo.address;
        if (sendGas === undefined) {
            sendGas = sendGasTo;
        }
    
        if (tracing) {
            const res = await locklift.tracing.trace(
                this._manager.runTarget(
                    {
                        contract: this.nft,
                        value: locklift.utils.toNano(1),
                    },
                    nft =>
                    nft.methods.transfer({
                        to: to.address,
                        sendGasTo: sendGas,
                        callbacks: []
                    }),
                ),
                {
                  allowedCodes: allowed_codes,
                },
            );

            this._manager = to;
            this._owner = to;
            return res;
        } else {
            const res = await this._manager.runTarget(
                {
                    contract: this.nft,
                    value: locklift.utils.toNano(1),
                },
                nft =>
                nft.methods.transfer({
                    to: to.address,
                    sendGasTo: sendGas,
                    callbacks: []           
                }),
            );

            this._manager = to;
            this._owner = to;
            return res;
        }
    }

    async changeOwner(newOwner: Account<FactorySource["Wallet"]>, sendGasTo: any, tracing=null, allowed_codes={compute: []}, callbacks = []) {
        let sendGas = sendGasTo.address;
        if (sendGas === undefined) {
            sendGas = sendGasTo;
        }
    
        if (tracing) {
            const res = await locklift.tracing.trace(
                this._manager.runTarget(
                    {
                        contract: this.nft,
                        value: locklift.utils.toNano(2),
                    },
                    nft =>
                    nft.methods.changeOwner({
                        newOwner: newOwner.address,
                        sendGasTo: sendGas,
                        callbacks: [[newOwner.address, {value: locklift.utils.toNano(1.2), payload: ''}]]
                    }),
                ),
                {
                  allowedCodes: allowed_codes,
                },
            );

            this._owner = newOwner;
            return res;
        } else {
            const res = await this._manager.runTarget(
                {
                    contract: this.nft,
                    value: locklift.utils.toNano(2),
                },
                nft =>
                nft.methods.changeOwner({
                    newOwner: newOwner.address,
                    sendGasTo: sendGas,
                    callbacks: [[newOwner.address, {value: locklift.utils.toNano(1.2), payload: ''}]]           
                }),
            );

            this._owner = newOwner;
            return res;
        }
    
    }

    async updateManager(manager) {
        this._manager = manager;
    }

    async changeManager(newManager: any, sendGasTo: any, tracing=null, allowed_codes={compute: []}) {
        let sendGas = sendGasTo.address;
        if (sendGas === undefined) {
            sendGas = sendGasTo;
        }
          
        if (tracing) {
            const res = await locklift.tracing.trace(
                this._manager.runTarget(
                    {
                        contract: this.nft,
                        value: locklift.utils.toNano(2),
                    },
                    nft =>
                    nft.methods.changeManager({
                        newManager: newManager.address,
                        sendGasTo: sendGas,
                        callbacks: [[newManager.address, {value: locklift.utils.toNano(1.2), payload: ''}]]
                    }),
                ),
                {
                  allowedCodes: allowed_codes,
                },
            );

            this._manager = newManager;
            return res;
        } else {
            const res = await this._manager.runTarget(
                {
                    contract: this.nft,
                    value: locklift.utils.toNano(2),
                },
                nft =>
                nft.methods.changeManager({
                    newManager: newManager.address,
                    sendGasTo: sendGas,
                    callbacks: [[newManager.address, {value: locklift.utils.toNano(1.2), payload: ''}]]
                }),
            );

            this._manager = newManager;
            return res;
        }
    
    }
}

export class Collection {
    collection: Contract<FactorySource["Collection"]>;
    ownerSigner: Signer;

    constructor(collection_contract: Contract<FactorySource["Collection"]>, ownerSigner: Signer) {
        this.collection = collection_contract;
        this.ownerSigner = ownerSigner;
    }

    static async from_addr (addr: string, owner) {
        let collectionContract = await locklift.factory.getDeployedContract(
            'Collection',
            new Address(addr),
        );
        return new Collection(collectionContract, owner);
    }

    async nftAddress(id: number) {
        const nftAddr = await this.collection.methods.nftAddress({
            answerId: 0,
            id: id
        }).call();

        return nftAddr.nft;
    }

    async totalSupply() {
        const totalSupply = await this.collection.methods.totalSupply({
            answerId: 0
        }).call();

        return totalSupply.count;
    }

    async mintNft(ownerAccount, tracing=null, allowed_codes={compute: []}) {

        const totalSupplyRes = await this.collection.methods.totalSupply({answerId: 0}).call();
        const id = totalSupplyRes.count;
        if (tracing) {
            await locklift.tracing.trace(
                await ownerAccount.runTarget(
                    {
                        contract: this.collection,
                        value: locklift.utils.toNano(1),
                    },
                    collection =>
                    collection.methods.mintNft({}),
                ),
                {
                  allowedCodes: allowed_codes,
                },
            );
        } else {
            await ownerAccount.runTarget(
                {
                    contract: this.collection,
                    value: locklift.utils.toNano(1),
                },
                collection =>
                collection.methods.mintNft({}),
            );
        }

        const response = await this.collection.methods.nftAddress({answerId: 0, id: id}).call();
        const nft = await locklift.factory.getDeployedContract(
            "Nft",
            new Address(response.nft.toString()),
        );

        return new NFT(nft, ownerAccount);
    }
} 

export class FarmingPool {
    farmPool: Contract<FactorySource["FarmingPool"]>;
    _owner;
    _wallet: string;

    constructor(farm_pool_contract: Contract<FactorySource["FarmingPool"]>, owner) {
        this.farmPool = farm_pool_contract;
        this._owner = owner;
    }

    async info() {
        return await this.farmPool.methods.getInfo({answerId: 0}).call();
    }

    async wallet() {
        if (this._wallet !== undefined) {
            return this._wallet;
        }
        const details = await this.info();
        this._wallet = details.rewardTokenWallet.toString();
        return this._wallet;
    }

    static async from_addr(addr: string, owner) {
        let farmPoolContract = await locklift.factory.getDeployedContract(
            'FarmingPool',
            new Address(addr),
        );
        return new FarmingPool(farmPoolContract, owner);
    }

    async userDataAddress(user) {
        const userData = await this.farmPool.methods.getUserDataAddress({
            answerId: 0,
            user: user
        }).call();

        return userData.value0;
    }

    async deposit(fromWallet: TokenWallet, amount: number, allowed_codes={compute: []}){
        return await fromWallet.transfer(amount, this.farmPool, true, "", null, allowed_codes);
    }

    async calculateRewardData() {
        return await this.farmPool.methods.calculateRewardData({}).call();
    }

    async claimReward(user: Account<FactorySource["Wallet"]>, tracing=null, allowed_codes={compute: []}){
        if (tracing) {
            return await locklift.tracing.trace(
                user.runTarget(
                    {
                        contract: this.farmPool,
                        value: locklift.utils.toNano(5),
                    },
                    farmPool =>
                    farmPool.methods.claimReward({
                        sendGasTo: user.address        
                    }),
                ),
                {
                  allowedCodes: allowed_codes,
                },
            );
        } else {
            return await user.runTarget(
                {
                    contract: this.farmPool,
                    value: locklift.utils.toNano(5),
                },
                farmPool =>
                farmPool.methods.claimReward({
                    sendGasTo: user.address        
                }),
            );
        }
    }

    async withdraw(user: Account<FactorySource["Wallet"]>, nftAddress: Address, tracing=null, allowed_codes={compute: []}){
        if (tracing) {
            return await locklift.tracing.trace(
                user.runTarget(
                    {
                        contract: this.farmPool,
                        value: locklift.utils.toNano(5),
                    },
                    farmPool =>
                    farmPool.methods.withdraw({
                        nft: nftAddress,
                        sendGasTo: user.address        
                    }),
                ),
                {
                  allowedCodes: allowed_codes,
                },
            );
        } else {
            return await user.runTarget(
                {
                    contract: this.farmPool,
                    value: locklift.utils.toNano(5),
                },
                farmPool =>
                farmPool.methods.withdraw({
                    nft: nftAddress,
                    sendGasTo: user.address        
                }),
            );
        }
    }

    async withdrawUnclaimed(receiver: Address){
        return await this._owner.runTarget(
            {
                contract: this.farmPool,
                value: locklift.utils.toNano(5),
            },
            farmPool =>
            farmPool.methods.withdrawUnclaimed({
                to: receiver,
                sendGasTo: this._owner.address  
            }),
        );
    }

    async userData(user: Account<FactorySource["Wallet"]>) {
        const userDataAddr = await this.userDataAddress(user.address);
        return UserData.from_addr(userDataAddr.toString(), user);
    }
} 

export class UserData {
    userData: Contract<FactorySource["UserData"]>;
    _owner: Account<FactorySource["Wallet"]>;

    constructor(userData: Contract<FactorySource["UserData"]>, owner: Account<FactorySource["Wallet"]>) {
        this.userData = userData;
        this._owner = owner;
    }

    static async from_addr(addr: string, owner: Account<FactorySource["Wallet"]>) {
        let userData = await locklift.factory.getDeployedContract(
            'UserData',
            new Address(addr),
        );

        return new UserData(userData, owner);
    }

    async pendingReward(accRewardPerShare: number, poolLastRewardTime: number, farmEndTime: number) {
        return await this.userData.methods.pendingReward({accRewardPerShare: accRewardPerShare, poolLastRewardTime: poolLastRewardTime, farmEndTime: farmEndTime}).call();
    }

    async info() {
        return await this.userData.methods.getInfo({answerId: 0}).call();
    }

    async rewardDebt() {
        let info = await this.info();
        return Number(info.rewardDebt);
    }

    async lastRewardTime() {
        let info = await this.info();
        return Number(info.lastRewardTime);
    }

    async numOfDeposits() {
        let _deposits = await this.userData.methods._deposits({}).call();
        let deposits = _deposits._deposits;
        return deposits.length;
    }
    
} 

// -------------------------- SETUP METHODS --------------------------

export const setupTokenRoot = async function(signer: Signer, token_name: string, token_symbol: string, owner) {

    const TokenWallet = await locklift.factory.getContractArtifacts('TokenWallet');
    const { contract: tokenRoot, tx } = await locklift.factory.deployContract({
        contract: "TokenRoot",
        publicKey: signer.publicKey,
        constructorParams: {
            initialSupplyTo: zeroAddress,
            initialSupply: 0,
            deployWalletValue: 0,
            mintDisabled: false,
            burnByRootDisabled: false,
            burnPaused: false,
            remainingGasTo: owner.address
        },
        initParams: {
            name_: token_name,
            symbol_: token_symbol,
            decimals_: 9,
            rootOwner_: owner.address,
            walletCode_: TokenWallet.code,
            randomNonce_: locklift.utils.getRandomNonce(),
            deployer_: zeroAddress
        },
        value: locklift.utils.toNano(5)
    });

    logger.log(`Token root address: ${tokenRoot.address}`);

    const name = await tokenRoot.methods.name({answerId: 0}).call();

    expect(name.value0).to.be.equal(token_name, 'Wrong root name');
    expect(await locklift.provider.getBalance(tokenRoot.address).then(balance => Number(balance))).to.be.above(0, 'Root balance empty');
    return new TokenRoot(tokenRoot, owner);
}

export const setupCollection = async function(signer: Signer) {

    const Nft = await locklift.factory.getContractArtifacts('Nft');
    const { contract: collection, tx } = await locklift.factory.deployContract({
        contract: "Collection",
        publicKey: signer.publicKey,
        constructorParams: {
            codeNft: Nft.code,
            ownerPubkey: "0x" + signer.publicKey
        },
        initParams: {},
        value: locklift.utils.toNano(5)
    });

    logger.log(`Collection address: ${collection.address}`);

    expect(await locklift.provider.getBalance(collection.address).then(balance => Number(balance))).to.be.above(0, 'Collection balance empty');
    return new Collection(collection, signer);
}

export const setupPool = async function(owner, collection, rewardTokenRoot, farmStartTime, rewardPerSecond, vestingPeriod, vestingRatio) {

    let randKeypair = SimpleKeystore.generateKeyPair();
    await locklift.keystore.addKeyPair("random", randKeypair);    
    let signer = (await locklift.keystore.getSigner("random"))!;
    
    let UserData = await locklift.factory.getContractArtifacts('UserData');
    let Nft = await locklift.factory.getContractArtifacts('Nft');
    const { contract: farmingPool, tx } = await locklift.factory.deployContract({
        contract: "FarmingPool",
        publicKey: signer.publicKey,
        constructorParams: {
            owner: owner.address,
            collection: collection.address,
            rewardTokenRoot: rewardTokenRoot.address,
            codeNft: Nft.code,
            codeUserData: UserData.code,
            farmStartTime: farmStartTime,
            rewardPerSecond: rewardPerSecond,
            vestingPeriod: vestingPeriod,
            vestingRatio: vestingRatio,
        },
        initParams: {},
        value: locklift.utils.toNano(5)
    });

    logger.log(`Farming pool address: ${farmingPool.address}`);

    return new FarmingPool(farmingPool, owner);
}

export const deployAccount = async function() {
    let signer = (await locklift.keystore.getSigner("0"))!;
    let accountsFactory = await locklift.factory.getAccountsFactory(
        "Wallet",
    );

    const {account: account, tx} = await accountsFactory.deployNewAccount({
        publicKey: signer.publicKey,
        initParams: {
          _randomNonce: locklift.utils.getRandomNonce(),
        },
        constructorParams: {},
        value: locklift.utils.toNano(15)
    }); 

    expect(await locklift.provider.getBalance(account.address).then(balance => Number(balance))).to.be.above(0, 'Bad account balance');

    logger.log(`Account address: ${account.address}`);

    return account;
}

export async function sleep(ms) {
    return;
}

export const checkReward = async function(
    userWallet: TokenWallet, 
    prevBalance: number, 
    prevRewardDebt: number, 
    accRewardPerShare: number,
    depositsNum: number
) {
    const expectedReward = Math.floor((accRewardPerShare * depositsNum) / 1e18) - (prevRewardDebt);
    const userNewWalletBalance = await userWallet.balance();
    const reward = Number(userNewWalletBalance) - prevBalance;

    expect(reward).to.be.equal(expectedReward, 'Bad reward');
    return expectedReward;
}

export const checkRewardVesting = async function(
    userWallet: TokenWallet, 
    userData: UserData, 
    _entitled: number,
    _vestingTime: number, 
    prevBalance: number, 
    prevRewardTime: number, 
    newRewardTime: number, 
    _rewardPerSec: number,
    vestingRatio: number,
    vestingPeriod: number
) {
    const user_bal_after = Number(await userWallet.balance());
    const entitled = _entitled;
    const vestingTime = _vestingTime;
    const real_reward = user_bal_after - prevBalance;

    const time_passed = newRewardTime - prevRewardTime;
    const expected_reward = _rewardPerSec * time_passed;

    const vesting_part = expected_reward * vestingRatio / 1000;
    const clear_part = expected_reward - vesting_part;

    // TODO: up to new math
    const newly_vested = Math.floor((vesting_part * time_passed) / (time_passed + vestingPeriod));

    const age = newRewardTime >= vestingTime ? vestingPeriod : (newRewardTime - prevRewardTime);
    let to_vest = age >= vestingPeriod ? entitled : Math.floor((entitled * age) / (vestingTime - prevRewardTime));

    const remaining_entitled = entitled === 0 ? 0 : entitled - to_vest;
    const unreleased_newly = vesting_part - newly_vested;
    const pending = remaining_entitled + unreleased_newly;


    let new_vesting_time;
    // Compute the vesting time (i.e. when the entitled reward to be all vested)
    if (pending === 0) {
        new_vesting_time = newRewardTime;
    } else if (remaining_entitled === 0) {
        // only new reward, set vesting time to vesting period
        new_vesting_time = newRewardTime + vestingPeriod;
    } else if (unreleased_newly === 0) {
        // only unlocking old reward, dont change vesting time
        new_vesting_time = vestingTime;
    } else {
        // "old" reward and, perhaps, "new" reward are pending - the weighted average applied
        const age3 = vestingTime - newRewardTime;
        const period = Math.floor(((remaining_entitled * age3) + (unreleased_newly * vestingPeriod)) / pending);
        new_vesting_time = newRewardTime + Math.min(period, vestingPeriod);
    }

    const final_entitled = entitled + vesting_part - to_vest - newly_vested;

    const newly_vested_ = new BigNumber(newly_vested);
    console.log("final_entitled" + final_entitled);
    const final_vested = newly_vested_ + to_vest + clear_part;
    console.log("final_vested" + final_vested)

    // console.log(
    //     entitled
    //     vesting_part.toFixed(),
    //     to_vest.toFixed(),
    //     newly_vested.toFixed(),
    //     final_entitled.toFixed()
    // );

    // console.log(final_vested.toFixed(0), newly_vested_ + to_vest + clear_part);
    // console.log(prevRewardTime.toFixed(0), newRewardTime.toFixed(0));

    // expect(real_reward.toFixed(0)).to.be.equal(final_vested.toFixed(0), 'Bad vested reward');
    // // console.log(entitled.toFixed(0), final_entitled.toFixed(0));
    // expect(final_entitled.toFixed(0)).to.be.equal(details.entitled[token_idx].toFixed(0), 'Bad entitled reward');
    // expect(new_vesting_time.toFixed(0)).to.be.equal(details.vestingTime.toFixed(0), 'Bad vesting time');
    return real_reward;
}


// export const computeVestedForInterval = async function(
//     entitled: number,
//     interval: number,
//     vestingPeriod: number
// ) {
//     let periodsPassed = 
// }

export const isEven = async function (
    num: number
) {
    return num % 2 == 0;
}

export const rangeSum = async function (range: number) {
    if (await isEven(range)) {
        return Math.floor(range / 2) * range + Math.floor(range / 2);
    }
    return (Math.floor(range / 2) + 1) * range;
}

export const rangeIntervalAverage = async function (
    interval: number,
    max: number    
) {
    return Math.floor((await rangeSum(interval) * 1e18) / max);
}

export const computeVestedForNewlyEntitled = async function(
    entitled: number,
    oldLastRewardTime: number,
    farmEndTime: number,
    poolLastRewardTime: number,
    vestingPeriod: number
) {
    if (entitled == 0) {
        return 0;
    }

    if (farmEndTime == 0 || oldLastRewardTime < farmEndTime) {
        let age = oldLastRewardTime - poolLastRewardTime;

        if (age > vestingPeriod) {

        } else {
            let clearPartShare = Math.floor(await rangeIntervalAverage(age, vestingPeriod) / age);
            return Math.floor((entitled * clearPartShare) / 1e18);
        }
    } else {
        let ageBefore = farmEndTime - oldLastRewardTime;
        let ageAfter = Math.min(poolLastRewardTime - farmEndTime, vestingPeriod);

        let vestedBefore = 0;
        let entitledBefore = 0;
        if (ageBefore > vestingPeriod) {

        } else {
            let clearPartShare = Math.floor(await rangeIntervalAverage(ageBefore, vestingPeriod) / ageBefore);
            vestedBefore = Math.floor((entitled * clearPartShare) / 1e18);
            entitledBefore = entitled - vestedBefore;
        }

        let vestedAfter = Math.floor(entitledBefore * ageAfter / vestingPeriod);
        return (vestedBefore + vestedAfter);
    }
}

export const computeVesting = async function(
    amount: number,
    rewardDebt: number,
    accRewardPerShare: number,
    poolLastRewardTime: number,
    oldLastRewardTime: number,
    farmEndTime: number,
    vestingRatio: number,
    vestingPeriod: number,
    vestingTime: number,
    entitled: number
) {
    let updatedEntitled;
    let newlyVested: any = 0;

    let reward = amount * accRewardPerShare;
    let newEntitled = Math.floor(reward / 1e18) - rewardDebt;

    if (vestingRatio > 0) {
        let vestingPart = Math.floor((newEntitled * vestingRatio) / 1000);
        let clearPart = newEntitled - vestingPart;

        if (oldLastRewardTime < farmEndTime || farmEndTime == 0) {
            newlyVested = await computeVestedForNewlyEntitled(vestingPart, oldLastRewardTime, farmEndTime, poolLastRewardTime, vestingPeriod);
        } else {
            newlyVested = 0;
        }

        let age2 = poolLastRewardTime >= vestingTime ? vestingPeriod : poolLastRewardTime;
        let vested = entitled * age2;
        let toVest = age2 >= vestingPeriod ? entitled : Math.floor(vested / (vestingTime - oldLastRewardTime));

        let remainingEntitled = entitled == 0 ? 0 : entitled - toVest;
        let unreleasedNewly = vestingPart - newlyVested;

        updatedEntitled = entitled + vestingPart - toVest - newlyVested;
        let test = newlyVested + toVest + clearPart; 
        // newlyVested = newlyVested + toVest + clearPart; 
        // console.log("vestingPart " + vestingPart);
        // console.log("clearPart" + clearPart);
        // console.log("toVest " + toVest);
        // console.log("test " + test);
    } else {
        newlyVested = newEntitled;
    }

    // console.log("updatedEntitled " + updatedEntitled);
    // console.log("newly_ested" + newlyVested);

    return newlyVested;
}
