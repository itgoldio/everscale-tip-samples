const logger = require("mocha-logger");
import { Address } from "everscale-inpage-provider";
import { Contract, Signer, zeroAddress } from "locklift";
import { FactorySource } from "../build/factorySource";
import { Account } from "locklift/factory";
import { getTypeParameterOwner } from "typescript";
import { expect } from "chai";

// -------------------------- ENTITIES ----------------------------
export class TokenWallet {
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

    async transfer(amount: number, receiver_or_addr: any, value: number, payload='', tracing=null, allowed_codes={compute: []}) {
        let addr = receiver_or_addr.address;
        if (addr === undefined) {
            addr = receiver_or_addr;
        }
        let notify = true;

        if (tracing) {
            return await locklift.tracing.trace(
                this._owner.runTarget(
                    {
                        contract: this.wallet,
                        value: locklift.utils.toNano(value),
                    },
                    wallet =>
                    wallet.methods.transferToWallet({
                        amount: amount,
                        recipientTokenWallet: addr,
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
                    value: locklift.utils.toNano(value),
                },
                wallet =>
                wallet.methods.transferToWallet({
                    amount: amount,
                    recipientTokenWallet: addr,
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

    async changeManager(
        newManager: any, 
        sendGasTo: any,
        tracing=null, 
        allowed_codes={compute: []}) 
    {
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
                        callbacks: [[newManager.address, {value: locklift.utils.toNano(amount), payload: ''}]]
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
                    callbacks: [[newManager.address, {value: locklift.utils.toNano(amount), payload: ''}]]
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
                    collection.methods.mintNft({
                        json: ""
                    }),
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
                collection.methods.mintNft({
                    json: ""
                }),
            );
        }

        const response = await this.collection.methods.nftAddress({answerId: 0, id: id}).call();
        const nft = await locklift.factory.getDeployedContract(
            "Nft",
            new Address(response.nft.toString()),
        );

        logger.log(`NFT address: ${nft.address}`);

        return new NFT(nft, ownerAccount);
    }
} 

export class TIP3SellRoot {
    sellRoot: Contract<FactorySource["TIP3SellRoot"]>;
    ownerSigner: Signer;

    constructor(sellRoot_contract: Contract<FactorySource["TIP3SellRoot"]>, ownerSigner: Signer) {
        this.sellRoot = sellRoot_contract;
        this.ownerSigner = ownerSigner;
    }

    static async from_addr (addr: string, owner) {
        let sellRootContract = await locklift.factory.getDeployedContract(
            'TIP3SellRoot',
            new Address(addr),
        );
        return new TIP3SellRoot(sellRootContract, owner);
    }

    async buildSellMsg(
        sendGasTo: string,
        price: number
    ) {
        const msg = await this.sellRoot.methods.buildSellMsg({
            answerId: 0,
            sendGasTo: new Address(sendGasTo),
            price: price
        }).call();

        return msg.value0;
    }

    async sellAddress(nft: string) {
        const sellAddress = await this.sellRoot.methods.sellAddress({
            answerId: 0,
            nft: nft
        }).call();

        return sellAddress.value0;
    }

    async getInfo() {
        const info = await this.sellRoot.methods.getInfo({
            answerId: 0
        }).call();

        return info;
    }

    async getGasPrice() {
        const gasPrice = await this.sellRoot.methods.getGasPrice({
            answerId: 0
        }).call();

        return gasPrice;
    }
    
}

export class TIP3Sell {
    sell: Contract<FactorySource["TIP3Sell"]>;
    owner: Account<"Wallet">;

    constructor(sellContract: Contract<FactorySource["TIP3Sell"]>, owner: Account<"Wallet">) {
        this.sell = sellContract;
        this.owner = owner;
    }

    static async from_addr (addr: string, owner: Account<"Wallet">) {
        let sellContract = await locklift.factory.getDeployedContract(
            'TIP3Sell',
            new Address(addr),
        );
        return new TIP3Sell(sellContract, owner);
    }

    async cancelSell (
        ownerAccount: any,
        sendGasTo: string,
        value: number,
        tracing=null, 
        allowed_codes={compute: []}
    ) {
        if (tracing) {
            return await locklift.tracing.trace(
                await ownerAccount.runTarget(
                    {
                        contract: this.sell,
                        value: locklift.utils.toNano(value),
                    },
                    sell =>
                    sell.methods.cancelSell({
                        sendGasTo: new Address(sendGasTo)
                    }),
                ),
                {
                  allowedCodes: allowed_codes,
                },
            );
        } else {
            return await ownerAccount.runTarget(
                {
                    contract: this.sell,
                    value: locklift.utils.toNano(value),
                },
                sell =>
                sell.methods.cancelSell({
                    sendGasTo: new Address(sendGasTo)
                }),
            );
        }
    }

    async getInfo() {
        const info = await this.sell.methods.getInfo({
            answerId: 0
        }).call();

        return info;
    }

    async getGasPrice() {
        const gasPrice = await this.sell.methods.getGasPrice({
            answerId: 0
        }).call();

        return gasPrice;
    }
    
}

// -------------------------- SETUP METHODS --------------------------

export const setupTokenRoot = async function(
    signer: Signer, 
    token_name: string, 
    token_symbol: string, 
    owner, 
    supply_to_owner: number,
    value: number
    ) {

    const TokenWallet = await locklift.factory.getContractArtifacts('TokenWallet');
    const { contract: tokenRoot, tx } = await locklift.factory.deployContract({
        contract: "TokenRoot",
        publicKey: signer.publicKey,
        initParams: {
            name_: token_name,
            symbol_: token_symbol,
            decimals_: 9,
            rootOwner_: owner.address,
            walletCode_: TokenWallet.code,
            randomNonce_: locklift.utils.getRandomNonce(),
            deployer_: zeroAddress
          },
          constructorParams: {
            initialSupplyTo: owner.address,
            initialSupply: supply_to_owner,
            deployWalletValue: locklift.utils.toNano(0.2),
            mintDisabled: false,
            burnByRootDisabled: false,
            burnPaused: false,
            remainingGasTo: owner.address
          },
        value: locklift.utils.toNano(value)
    });

    logger.log(`Token root address: ${tokenRoot.address}`);

    const name = await tokenRoot.methods.name({answerId: 0}).call();

    expect(name.value0).to.be.equal(token_name, 'Wrong root name');
    expect(await locklift.provider.getBalance(tokenRoot.address).then(balance => Number(balance))).to.be.above(0, 'Root balance empty');
    return new TokenRoot(tokenRoot, owner);
}

export const setupCollection = async function(signer: Signer, value: number) {

    const Nft = await locklift.factory.getContractArtifacts('Nft');
    const Index = await locklift.factory.getContractArtifacts('Index');
    const IndexBasis = await locklift.factory.getContractArtifacts('IndexBasis');
    const { contract: collection, tx } = await locklift.factory.deployContract({
        contract: "Collection",
        publicKey: signer.publicKey,
        constructorParams: {
            codeNft: Nft.code,
            codeIndex: Index.code,
            codeIndexBasis: IndexBasis.code,
            ownerPubkey: "0x" + signer.publicKey,
            json: "",
            mintingFee: 0
        },
        initParams: {},
        value: locklift.utils.toNano(value)
    });

    logger.log(`Collection address: ${collection.address}`);

    expect(await locklift.provider.getBalance(collection.address).then(balance => Number(balance))).to.be.above(0, 'Collection balance empty');
    return new Collection(collection, signer);
}

export const setupTIP3SellRoot = async function(
        signer: Signer, 
        tokenRootAddr: string,
        value: number
    ) {

    const tip3Sell = await locklift.factory.getContractArtifacts('TIP3Sell');
    const { contract: tip3SellRoot, tx } = await locklift.factory.deployContract({
        contract: "TIP3SellRoot",
        publicKey: signer.publicKey,
        initParams: {
        },
        constructorParams: {
          ownerPubkey: '0x' + signer.publicKey,
          tip3TokenRoot: new Address(tokenRootAddr),
          tip3SellCode: tip3Sell.code
        },
        value: locklift.utils.toNano(value),
      });

    logger.log(`TIP3SellRoot address: ${tip3SellRoot.address}`);

    expect(await locklift.provider.getBalance(tip3SellRoot.address).then(balance => Number(balance))).to.be.above(0, 'TIP3SellRoot balance empty');
    return new TIP3SellRoot(tip3SellRoot, signer);
}

export const deployAccount = async function(signer: Signer, name: string, value: number) {
    let accountsFactory = await locklift.factory.getAccountsFactory(
        "Wallet",
    );

    const {account: account, tx} = await accountsFactory.deployNewAccount({
        publicKey: signer.publicKey,
        initParams: {
          _randomNonce: locklift.utils.getRandomNonce(),
        },
        constructorParams: {},
        value: locklift.utils.toNano(value)
    }); 

    expect(await locklift.provider.getBalance(account.address).then(balance => Number(balance))).to.be.above(0, 'Bad account balance');

    logger.log(`Account address (${name}): ${account.address}`);

    return account;
}