import ora from 'ora';
import chalk from 'chalk';
import { Signer } from 'everscale-standalone-client/client/keystore';
import { Address, Contract, Locklift, zeroAddress } from 'locklift/.';
import { CollectionAbi, NftAbi, TIP3SellAbi, TIP3SellRootAbi, TokenRootAbi, TokenWalletAbi, WalletAbi } from '../build/factorySource';
import { Account } from 'locklift/factory';

const spinner = ora();

const accountsFactory = locklift.factory.getAccountsFactory("Wallet");
const tip3TokenWalletArtifact = locklift.factory.getContractArtifacts("TokenWallet");
const tip3SellArtifact = locklift.factory.getContractArtifacts("TIP3Sell");

let signer: Signer;

let vendorWallet: Contract<WalletAbi>;
let vendorAccount: Account<WalletAbi>;
let vendorTokenWallet: Contract<TokenWalletAbi>;

let buyerWallet: Contract<WalletAbi>;
let buyerAccount: Account<WalletAbi>;
let buyerTokenWallet: Contract<TokenWalletAbi>;

let collection: Contract<CollectionAbi>;

let tokenRoot: Contract<TokenRootAbi>;

let sellRoot: Contract<TIP3SellRootAbi>;

let nft: Contract<NftAbi>;

let sell: Contract<TIP3SellAbi>;
let sellTokenWallet: Contract<TokenWalletAbi>;

async function main() {
  console.clear();
  signer = (await locklift.keystore.getSigner("0"))!;

  console.log(chalk.bold(`[DEPLOY PHASE]\n`));

  // Create `Vendor` wallet
  try {
    spinner.start(chalk.magenta(`Deploy ${chalk.bold.yellow(`Vendor`)}`));
    let nonce = 0;
    await deployWallet(nonce).then(
      (data: any) => {
        vendorWallet = locklift.factory.getDeployedContract(
          "Wallet",
          new Address(data)
        );
        vendorAccount = accountsFactory.getAccount(new Address(vendorWallet.address.toString()), signer.publicKey);
      }
    );
    spinner.succeed(chalk.magenta(`Deploy ${chalk.bold.yellow(`Vendor`)}`));
    console.log(
      chalk.bold.yellow(`Vendor`) + ":" + " " + chalk.bold(vendorAccount.address).toString() + '\n'
    );
  }
  catch(err) {
    spinner.fail(chalk.red(`Failed`));
    throw(err);
  }

  // Create `Buyer` wallet
  try {
    spinner.start(chalk.magenta(`Deploy ${chalk.bold.yellow(`Buyer`)}`));
    let nonce = 1;
    await deployWallet(nonce).then(
      (data: any) => {
        buyerWallet = locklift.factory.getDeployedContract(
          "Wallet",
          new Address(data)
        );
        buyerAccount = accountsFactory.getAccount(new Address(buyerWallet.address.toString()), signer.publicKey);
      }
    );
    spinner.succeed(chalk.magenta(`Deploy ${chalk.bold.yellow(`Buyer`)}`));
    console.log(
      chalk.bold.yellow(`Buyer`) + ":" + " " + chalk.bold(buyerAccount.address).toString() + '\n'
    );
  }
  catch(err) {
    spinner.fail(chalk.red(`Failed`));
    throw(err);
  }

  // Deploy `Collection`
  try {
    spinner.start(chalk.magenta(`Deploy ${chalk.bold.yellow(`Collection`)}`));
    await deployCollection().then(
      (data: any) => {
        collection = locklift.factory.getDeployedContract(
          "Collection",
          new Address(data)
        );
      }
    );
    spinner.succeed(chalk.magenta(`Deploy ${chalk.bold.yellow(`Collection`)}`));
    console.log(
      chalk.bold.yellow(`Collection`) + ":" + " " + chalk.bold(collection.address).toString() + '\n'
    );
  }
  catch(err) {
    spinner.fail(chalk.red(`Failed`));
    throw(err);
  }

  // Deploy `TokenRoot`
  try {
    spinner.start(chalk.magenta(`Deploy ${chalk.bold.yellow(`TokenRoot`)}`));
    let initialSupply: number = 1000;
    await deployTokenWallet(initialSupply).then(
      (data: any) => {
        tokenRoot = locklift.factory.getDeployedContract(
          "TokenRoot",
          new Address(data)
        );
      }
    );
    spinner.succeed(chalk.magenta(`Deploy ${chalk.bold.yellow(`TokenRoot`)}`));
    console.log(
      chalk.bold.yellow(`TokenRoot`) + ":" + " " + chalk.bold(tokenRoot.address).toString() + '\n'
    );
    console.log(
      chalk.magenta(`- Initial Supply to${chalk.white(':')} ${chalk.yellow.bold(`Buyer`)}`) + '\n' +
      chalk.magenta(`- Tokens${chalk.white(':')} ${chalk.yellow.bold(initialSupply)}`) + '\n'
    );
  }
  catch(err) {
    spinner.fail(chalk.red(`Failed`));
    throw(err);
  }

  // Deploy `SellRoot`
  try {
    spinner.start(chalk.magenta(`Deploy ${chalk.bold.yellow(`SellRoot`)}`));
    await deploySellRoot().then(
      (data: any) => {
        sellRoot = locklift.factory.getDeployedContract(
          "TIP3SellRoot",
          new Address(data)
        );
      }
    );
    spinner.succeed(chalk.magenta(`Deploy ${chalk.bold.yellow(`SellRoot`)}`));
    console.log(
      chalk.bold.yellow(`SellRoot`) + ":" + " " + chalk.bold(sellRoot.address).toString() + '\n'
    );
  }
  catch(err) {
    spinner.fail(chalk.red(`Failed`));
    throw(err);
  }

  console.log(chalk.bold(`[MINT PHASE]\n`));

  // Mint `Nft`
  try {
    spinner.start(chalk.magenta(`Mint ${chalk.bold.yellow(`Nft`)}`));
    await mintNft().then(
      (data: any) => {
        nft = locklift.factory.getDeployedContract(
          "Nft",
          new Address(data)
        );
      }
    );
    spinner.succeed(chalk.magenta(`Mint ${chalk.bold.yellow(`Nft`)}`));
    console.log(
      chalk.bold.yellow(`Nft`) + ":" + " " + chalk.bold(nft.address).toString() + '\n'
    );
  }
  catch(err) {
    spinner.fail(chalk.red(`Failed`));
    throw(err);
  }

  console.log(chalk.bold(`[SELL PHASE]\n`));

  // Sell `Nft`
  try {
    let price: number = 100;
    spinner.start(chalk.magenta(`Sell ${chalk.bold.yellow(`Nft`)}`));
    await sellNft(price).then(
      (data: any) => {
        sell = locklift.factory.getDeployedContract(
          "TIP3Sell",
          new Address(data)
        );
      }
    );
    spinner.succeed(chalk.magenta(`Sell ${chalk.bold.yellow(`Nft`)}`));

    console.log(
      chalk.bold.yellow(`Sell`) + ":" + " " + chalk.bold(sell.address).toString() + '\n'
    );

    console.log(
      chalk.magenta(`- Price`) + ":" + " " + chalk.bold(price).toString() + '\n'
    );

    let vendorTokenWalletAddress = await tokenRoot.methods.walletOf({
      answerId: 0,
      walletOwner: vendorAccount.address
    }).call();

    let sellTokenWalletAddress = await tokenRoot.methods.walletOf({
      answerId: 0,
      walletOwner: sell.address
    }).call();

    let buyerTokenWalletAddress = await tokenRoot.methods.walletOf({
      answerId: 0,
      walletOwner: buyerAccount.address
    }).call();

    vendorTokenWallet = await locklift.factory.getDeployedContract(
      "TokenWallet",
      vendorTokenWalletAddress.value0
    );

    sellTokenWallet = await locklift.factory.getDeployedContract(
      "TokenWallet",
      vendorTokenWalletAddress.value0
    );

    buyerTokenWallet = await locklift.factory.getDeployedContract(
      "TokenWallet",
      buyerTokenWalletAddress.value0
    );

    let vendorTokenWalletBalance = await vendorTokenWallet.methods.balance({
      answerId: 0
    }).call();

    let sellTokenWalletBalance = await sellTokenWallet.methods.balance({
      answerId: 0
    }).call();

    let buyerTokenWalletBalance = await buyerTokenWallet.methods.balance({
      answerId: 0
    }).call();

    console.log(
      chalk.magenta(`- [TokenWallet] `) + chalk.yellow.bold(`Vendor`) + ":" + " " + chalk.bold(vendorTokenWalletAddress.value0).toString() + 
      ` (Balance: ${vendorTokenWalletBalance.value0})` + '\n' +
      chalk.magenta(`- [TokenWallet] `) + chalk.yellow.bold(`Sell`) + ":" + " " + chalk.bold(sellTokenWalletAddress.value0).toString() +
      ` (Balance: ${sellTokenWalletBalance.value0})` + '\n' +
      chalk.magenta(`- [TokenWallet] `) + chalk.yellow.bold(`Buyer`) + ":" + " " + chalk.bold(buyerTokenWalletAddress.value0).toString() +
      ` (Balance: ${buyerTokenWalletBalance.value0})` + '\n'
    );
  }
  catch(err) {
    spinner.fail(chalk.red(`Failed`));
    throw(err);
  }

  console.log(chalk.bold(`[BUY PHASE]\n`));

  // Buy `Nft`
  try {
    let price: number = 100;
    spinner.start(chalk.magenta(`Sell ${chalk.bold.yellow(`Nft`)}`));
    await buyNft(price).then(
      (data: any) => {
        
      }
    );
  }
  catch(err) {
    spinner.fail(chalk.red(`Failed`));
    throw(err);
  }
}

async function tip4NftGetInfo(): Promise<object> {
  let info = await nft.methods.getInfo({
    answerId: 0
  }).call();
  return info;
}

async function buyNft(price: number) {
  await buyerAccount.runTarget(
    {
      contract: buyerTokenWallet,
      value: locklift.utils.toNano(1),
    },
    buyerTokenWallet =>
      buyerTokenWallet.methods.transferToWallet({
        amount: price,
        recipientTokenWallet: sellTokenWallet.address,
        remainingGasTo: buyerAccount.address,
        notify: true,
        payload: ""
      }),
  );
}

async function sellNft(price: number): Promise<string> {
  let sellMsg = await sellRoot.methods.buildSellMsg({
    answerId: 0,
    sendGasTo: vendorAccount.address,
    price: price
  }).call();

  await vendorWallet.methods.sendTransaction({
    dest: nft.address,
    value: locklift.utils.toNano(2),
    bounce: true,
    flags: 0,
    payload: sellMsg.value0
  }).sendExternal(
    {
      publicKey: signer.publicKey
    }
  );

  let sellAddr = await sellRoot.methods.sellAddress({
    answerId: 0,
    nft: nft.address
  }).call();
  
  return sellAddr.value0.toString();
}

async function mintNft(): Promise<string> {
  await vendorAccount.runTarget(
    {
      contract: collection,
      value: locklift.utils.toNano(1),
    },
    collection =>
      collection.methods.mintNft({
        json: "NFT"
      }),
  );

  let totalSupply = await collection.methods.totalSupply({
    answerId: 0
  }).call();

  let nftAddr = await collection.methods.nftAddress({
    id: Number(totalSupply.count) - 1,
    answerId: 0,
  }).call();
  
  return nftAddr.nft.toString();
}

async function deploySellRoot(): Promise<string> {
  let { contract: sellRoot, tx } = await locklift.factory.deployContract({
    contract: "TIP3SellRoot",
    publicKey: signer.publicKey,
    initParams: {
    },
    constructorParams: {
      ownerPubkey: '0x' + signer.publicKey,
      tip3TokenRoot: tokenRoot.address,
      tip3SellCode: tip3SellArtifact.code
    },
    value: locklift.utils.toNano(2),
  });
  return sellRoot.address.toString();
}

async function deployTokenWallet(initialSupply: number): Promise<string> {
  let { contract: tokenRoot, tx } = await locklift.factory.deployContract({
    contract: "TokenRoot",
    publicKey: signer.publicKey,
    initParams: {
      name_: "Token",
      symbol_: "Token",
      decimals_: 9,
      rootOwner_: vendorAccount.address,
      walletCode_: tip3TokenWalletArtifact.code,
      randomNonce_: locklift.utils.getRandomNonce(),
      deployer_: zeroAddress
    },
    constructorParams: {
      initialSupplyTo: buyerAccount.address,
      initialSupply: initialSupply,
      deployWalletValue: locklift.utils.toNano(0.2),
      mintDisabled: false,
      burnByRootDisabled: false,
      burnPaused: false,
      remainingGasTo: vendorAccount.address
    },
    value: locklift.utils.toNano(2),
  });
  return tokenRoot.address.toString();
}

async function deployWallet(nonce: number): Promise<string> {
  let { contract: wallet, tx } = await locklift.factory.deployContract({
    contract: "Wallet",
    publicKey: signer.publicKey,
    initParams: {
      _randomNonce: nonce
    },
    constructorParams: {},
    value: locklift.utils.toNano(10),
  });
  return wallet.address.toString();
}

async function deployCollection(): Promise<string> {
  const nftArtifact = await locklift.factory.getContractArtifacts("Nft");
  const indexArtifact = await locklift.factory.getContractArtifacts("Index");
  const indexBasisArtifact = await locklift.factory.getContractArtifacts("IndexBasis");
  let { contract: collection, tx } = await locklift.factory.deployContract({
    contract: "Collection",
    publicKey: signer.publicKey,
    initParams: {},
    constructorParams: {
      codeNft: nftArtifact.code,
      codeIndex: indexArtifact.code,
      codeIndexBasis: indexBasisArtifact.code,
      ownerPubkey: '0x' + signer.publicKey,
      json: "",
      mintingFee: 0
    },
    value: locklift.utils.toNano(2),
  });
  return collection.address.toString();
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
