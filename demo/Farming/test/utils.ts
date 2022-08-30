const logger = require("mocha-logger");
import { Address } from "everscale-inpage-provider";
import { Contract, Signer } from "locklift";
import { FactorySource } from "../build/factorySource";
import { expect } from "chai";
import { Account } from "locklift/factory";


export const zeroAddress = new Address("0:0000000000000000000000000000000000000000000000000000000000000000");


// -------------------------- ENTITIES ----------------------------
class TokenWallet {
    wallet: Contract<FactorySource["TokenWallet"]>;
    _owner: Account<"Wallet">;

    constructor(walletContract: Contract<FactorySource["TokenWallet"]>, walletOwner: Account<"Wallet">) {
        this.wallet = walletContract;
        this._owner = walletOwner;
    }

    static async from_addr(addr: string, owner: Account<"Wallet">) {
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

    async transfer(amount: number, receiver_or_addr: any, payload='', tracing=null, allowed_codes={compute: []}) {
        let addr = receiver_or_addr.address;
        if (addr === undefined) {
            addr = receiver_or_addr;
        }
        let notify = false;
        if (payload) {
            notify = true;
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

class TokenRoot {
    tokenRoot: Contract<FactorySource["TokenRoot"]>;
    owner: Account<"Wallet">;

    constructor(token_contract: Contract<FactorySource["TokenRoot"]>, token_owner: Account<"Wallet">) {
        this.tokenRoot = token_contract;
        this.owner = token_owner;
    }

    static async from_addr(addr: string, owner: Account<"Wallet">) {
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

    async wallet(user: Account<"Wallet">) {
        const wallet_addr = await this.walletAddr(user);
        return TokenWallet.from_addr(wallet_addr.toString(), user);
    }

    async deployWallet(account: Account<"Wallet">) {

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

    async mint(mint_amount: number, user: Account<"Wallet">) {
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

class NFT {
    nft: Contract<FactorySource["Nft"]>;
    _owner: Account<"Wallet">;
    _manager: Account<"Wallet">;

    constructor(nft_contract: Contract<FactorySource["Nft"]>, owner: Account<"Wallet">) {
        this.nft = nft_contract;
        this._owner = owner;
        this._manager = owner;
    }

    static async from_addr(addr: string, owner: Account<"Wallet">) {
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

    async changeOwner(newOwner, sendGasTo, tracing=null, allowed_codes={compute: []}) {
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
                    nft.methods.changeOwner({
                        newOwner: newOwner.address,
                        sendGasTo: sendGas,
                        callbacks: []
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
                    value: locklift.utils.toNano(1),
                },
                nft =>
                nft.methods.changeOwner({
                    newOwner: newOwner.address,
                    sendGasTo: sendGas,
                    callbacks: []           
                }),
            );

            this._owner = newOwner;
            return res;
        }
    
    }

    async changeManager(newManager, sendGasTo, tracing=null, allowed_codes={compute: []}) {
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
                    nft.methods.changeManager({
                        newManager: newManager.address,
                        sendGasTo: sendGas,
                        callbacks: []
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
                    value: locklift.utils.toNano(1),
                },
                nft =>
                nft.methods.changeManager({
                    newManager: newManager.address,
                    sendGasTo: sendGas,
                    callbacks: []           
                }),
            );

            this._manager = newManager;
            return res;
        }
    
    }
}

class Collection {
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

        if (tracing) {
            return await locklift.tracing.trace(
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
            return await ownerAccount.runTarget(
                {
                    contract: this.collection,
                    value: locklift.utils.toNano(1),
                },
                collection =>
                collection.methods.mintNft({}),
            );
        }
    
    }
} 

class FarmingPool {
    farmPool: Contract<FactorySource["FarmingPool"]>;
    _owner;

    constructor(farm_pool_contract: Contract<FactorySource["FarmingPool"]>, owner) {
        this.farmPool = farm_pool_contract;
        this._owner = owner;
    }

    static async from_addr (addr: string, owner) {
        let farmPoolContract = await locklift.factory.getDeployedContract(
            'FarmingPool',
            new Address(addr),
        );
        return new FarmingPool(farmPoolContract, owner);
    }

    async UserDataAddress(user) {
        const userData = await this.farmPool.methods.getUserDataAddress({
            answerId: 0,
            user: user
        }).call();

        return userData.value0;
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

    let keyPair = (await locklift.keystore.getSigner("0"))!;
    let UserData = await locklift.factory.getContractArtifacts('UserData');
    let Nft = await locklift.factory.getContractArtifacts('Nft');
    const { contract: farmingPool, tx } = await locklift.factory.deployContract({
        contract: "FarmingPool",
        publicKey: keyPair.publicKey,
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