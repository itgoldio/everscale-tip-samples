const {
    isValidTonAddress
} = require('./utils');
const prompts = require('prompts');

async function main() {

    const NFT = await locklift.factory.getContract('Nft');
    const [keyPair] = await locklift.keys.getKeyPairs();

    const promptsData = [];

    promptsData.push({
        type: 'text',
        name: 'nft',
        message: 'NFT address',
        validate: value => isValidTonAddress(value) ? true : 'Invalid TON address'
    });

    promptsData.push({
        type: 'text',
        name: 'owner',
        message: 'Owner address',
        validate: value => isValidTonAddress(value) ? true : 'Invalid TON address'
    });

    const response = await prompts(promptsData);

    const nftOwner = await locklift.factory.getAccount('SafeMultisigWallet', 'safemultisig');
    nftOwner.setAddress(response.owner);

    const nft = NFT;
    nft.setAddress(response.nft);

    await nftOwner.runTarget({
        contract: nft,
        method: 'getPrize',
        params: {},
        value: locklift.utils.convertCrystal(1, 'nano'),
        keyPair
    });

    const winEvent = await nft.getEvents("TicketWon");
    const lostEvent = await nft.getEvents("TicketLost");
    
    if (winEvent.length > 0) {
        console.log("Your ticket won! ;) Winning amount: " + locklift.utils.convertCrystal(winEvent[0].value.winningAmount, 'ton') + " ever.");
    } else if (lostEvent.length > 0) {
        console.log("Your ticket lost! :(");
    } else {
        console.log("An error has occurred, please try again");
    }
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
