# Migrations for Integration Testing

These migrations are only for testing the yEarn integration via a mainnet fork. This will test the "bridge" deposit contract functionality.

For these tests to run effectively, please set these parameters in the smart contract:

#### GaugeD1.sol
`startBlock = 11226037 + 100;`
`endBlock = startBlock + 598154;`

For a test forked instance of the Ethereum blockchain, please use: `ganache-cli -a 10 -e 1000 -p 7545 -i 5777 -f https://mainnet.infura.io/v3/e80e5e8ecf470aa565e3efb4520bbf@11226037`

This uses infura to take a snapshot and fork at ETH block 11226037.

To test unit tests not on a mainnet fork, please use the `migrations_unit_test` folder. To use these tests, please title this folder `migrations` and run `truffle migrate`.