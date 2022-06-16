# everscale-tip-samples

NFT samples for [TIP4 standard](https://docs.everscale.network/standard/TIP-4) from [itgold team](https://itgold.io). 

## Samples:
- [TIP4_1](/demo/TIP4_1) - Basic NFT implementation of [TIP-4.1 standard](https://docs.everscale.network/standard/TIP-4.1)
- [TIP4_2](/demo/TIP4_2) - NFT implementation of [TIP-4.1 standard](https://docs.everscale.network/standard/TIP-4.1) and [TIP-4.2 standard](https://docs.everscale.network/standard/TIP-4.2) (it store json file onchain)
- [TIP4_3](/demo/TIP4_3) - NFT implementation of [TIP-4.1 standard](https://docs.everscale.network/standard/TIP-4.1) and [TIP-4.3 standard](https://docs.everscale.network/standard/TIP-4.3) (it include onchain indexes for NFT search)
- [Standard web token](/demo/StandardWebToken) - most popular format NFT include [TIP-4.1 standard](https://docs.everscale.network/standard/TIP-4.1), [TIP-4.2 standard](https://docs.everscale.network/standard/TIP-4.2) and [TIP-4.3 standard](https://docs.everscale.network/standard/TIP-4.3)
- [/demo/Lottery](Lottery) - Modification of [Standard web token](/demo/StandardWebToken) that include lottery logic
- [/demo/BulkMint](Bulk mint) - Modification of [Standard web token](/demo/StandardWebToken) that include bulk mint


<h1>How to develop NFT using  everdev?</h1>

1. Install [everdev](https://github.com/tonlabs/everdev)

`npm i -g everdev`

2. Set [everscale solidity compiler](https://github.com/tonlabs/TON-Solidity-Compiler)
   
`everdev sol set --compiler 0.58.1`

3. Go to [Standard web token](/demo/StandardWebToken) directory
   
`cd demo/StandardWebToken`

4. Run
   
`npm install`

5. Deploy NFT to (devnet)[https://net.ever.live/]
   
`npm run-script deploy`
