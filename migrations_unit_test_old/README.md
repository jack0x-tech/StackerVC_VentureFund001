# Migrations for Unit Testing

These migrations are for "unit testing" the contracts, and don't need to integrate with any other contracts on main-net (specifically yEarn.finance/vault contracts). This tests token distribution with basic parameters, as well as other functionality like getting/setting functions.

For these tests to run effectively, please set these parameters in the smart contract:

#### GaugeD1.sol
`startBlock = 100`
`endBlock = startBlock + 100`

#### LPGauge.sol
`startBlock = 300`
`endBlock = startBlock + 100`

For a test instance of the Ethereum blockchain, please use: `ganache-cli -a 10 -e 1000 -p 7545 -i 5777`

On the mainnet versions of the contracts, the distribution will of course take place more in the future.

To test the integration with yEarn and the Bridge contract, please use the `migrations_integration_test` folder. To use these tests, please title this folder `migrations` and run `truffle migrate`.