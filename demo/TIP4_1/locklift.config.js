module.exports = {
  compiler: {
    // Specify path to your TON-Solidity-Compiler
    path: '$HOME/.everdev/solidity/solc',
  },
  linker: {
    // Path to your TVM Linker
    path: '$HOME/.everdev/solidity/tvm_linker',
    lib: '$HOME/.everdev/solidity/stdlib_sol.tvm',
  },
  networks: {
    // You can use TON labs graphql endpoints or local node
    local: {
      ton_client: {
        // See the TON client specification for all available options
        network: {
          server_address: 'http://localhost',
        },
      },
      // This giver is default local-node giver
      giver: {
        address: '0:841288ed3b55d9cdafa806807f02a0ae0c169aa5edfe88a789a6482429756a94',
        abi: { "ABI version": 1, "functions": [ { "name": "constructor", "inputs": [], "outputs": [] }, { "name": "sendGrams", "inputs": [ {"name":"dest","type":"address"}, {"name":"amount","type":"uint64"} ], "outputs": [] } ], "events": [], "data": [] },
        key: '',
      },
      // Use tonos-cli to generate your phrase
      // $ tonos-cli genphrase
      // !!! Never commit it in your repos !!!
      keys: {
        phrase: '',
        amount: 20,
      }
    },
    devnet: {
      ton_client: {
        // See the TON client specification for all available options
        network: {
          server_address: 'http://net1.ton.dev',
        },
      },
      // This giver is default local-node giver
      giver: {
        address: '0:f7597aecd0ecd2a78f220469f73a18585ad10a3f00391eeee337514a8f0b351e',
        abi: {"ABI version":2,"version":"2.2","header":["pubkey","time","expire"],"functions":[{"name":"constructor","inputs":[{"name":"_owner","type":"uint256"}],"outputs":[]},{"name":"sendGrams","inputs":[{"name":"dest","type":"address"},{"name":"amount","type":"uint64"}],"outputs":[]},{"name":"transferOwnership","inputs":[{"name":"newOwner","type":"uint256"}],"outputs":[]},{"name":"owner","inputs":[],"outputs":[{"name":"owner","type":"uint256"}]},{"name":"_randomNonce","inputs":[],"outputs":[{"name":"_randomNonce","type":"uint256"}]}],"data":[{"key":1,"name":"_randomNonce","type":"uint256"}],"events":[{"name":"OwnershipTransferred","inputs":[{"name":"previousOwner","type":"uint256"},{"name":"newOwner","type":"uint256"}],"outputs":[]}],"fields":[{"name":"_pubkey","type":"uint256"},{"name":"_timestamp","type":"uint64"},{"name":"_constructorFlag","type":"bool"},{"name":"owner","type":"uint256"},{"name":"_randomNonce","type":"uint256"}]},
        key: '327caeff7c4727d76d3b2a82410e12c699c174796a5c7dd024ca5bed865c980c',
      },
      // Use tonos-cli to generate your phrase
      // $ tonos-cli genphrase
      // !!! Never commit it in your repos !!!
      keys: {
        phrase: '',
        amount: 20,
      }
    },
  }
};
