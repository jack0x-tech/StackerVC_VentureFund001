# Treasury, STACK Token & Distribution Contracts

### Installation requirements:
In order to properly setup these project you'll need to install [Node.js](https://nodejs.org/en/download/) (min version 10.18), [truffle-cli](https://github.com/trufflesuite/truffle/) (min version 5.1.53) and [ganache-cli](https://github.com/trufflesuite/ganache-cli).
Please make sure that when running `truffle version` you get at least the following output as minimal versions:

```
Truffle v5.1.53 (core: 5.1.53)
Solidity v0.6.11 (solc-js)
Node v10.18.0
Web3.js v1.2.9
```

You should be now good to go.

### Testing these contracts:
Please see the tests for VCTreasuryV1 and FarmTreasuryV1 in their respective folders.

### FarmTreasuryV1 (./Treasury/FarmTreasuryV1.sol), FarmTokenV1, FarmBossV1

This contract allows for a trust-minimized, decentralized "farming" fund. These contracts will take a users ETH, WBTC, and USDC, and issue a rebalance token called stackETH, stackUSDC, or stackWBTC. 1 stackToken = 1 underlyingToken, due to a rebase mechanism.

The rebase mechanism was forked from LidoDAO's stETH (or liquid staked ETH2.0). Their audited contacts can be found here: https://github.com/lidofinance/lido-dao/blob/master/contracts/0.4.24/StETH.sol . Our contracts are found in FarmTokenV1, which is inherited by FarmTreasuryV1. These have full ERC20 functionality too.

The Treasury contract implements a fee structure, which will be a 2% yearly base, and 20% performance fee on any gains. These fees are split between the DAO treasury (governance), and the farmer. The Treasury contract also implements a hot wallet, which services withdraws instantly. However if this wallet is depleted, then a rebalance must occur before withdraws can be serviced.

There is a time-lock on any funds deposited. Initially this looks like a linear decrease from 100% locked initially, 50% locked after 7 days, and 0% locked after the 14 days. This can be modified or removed, but is initially left in place to discourage "rebase sniping". This is an attack where you deposit just in time for a reabase, and withdraw directly after, meaning you get a full reward however do not put your funds to use at all.

The FarmBoss contract does the rebasing and the farming. The DAO governance can whitelist token approvals and smart contracts + specific functions that "farmer" accounts are allowed to call. And example would be: you are allowed to add liquidity to a specific Curve.fi contract, you may deposit/withdraw Curve LP tokens to yEarn Vaults, and you may remove liquidity from the same Curve.fi contracts. All the token approvals and whitelisting must be done by governance, and then the farmer is allowed to use the strategy as outlined.

There are limits on the frequency and amount of "gains" (rebalanceUp) that the farmers can report, for security reasons. Only DAO governance is allowed to report a loss (rebalanceDown), and these should be rare with proper farming techniques.

In FarmBossV1_TOKEN, we whitelist some initial strategies and contracts we will engage with:
-- USDC, mostly yEarn & Curve
-- ETH, AlphaHomora v1/v2, Rari Rotation Vault, yEarn, Curve
-- WBTC, MakerDao CDPs, ???

### VCTreasuryV1 (./Treasury/VCTreasuryV1.sol)

This contract is the "product" of the first iteration of stacker.vc. This smart contract creates full functionality for a trust-minimized, decentralized VC investment fund. 

This contract is an extension of standard ERC20 token functionality. The ERC20 token gives it's holders proportional claim over assets in the fund. The assets in the fund are managed by a decentralized "fund council". These "fund council" members will eventually be elected by STACK token holders to manage subsequent funds, and all fund councils are operated by a Gnosis multisig wallet, with publicly available and auditable individuals. There are checks in place to limit the power of the fund council, and to prevent theft and "rugging" of assets.

The fund council can only invest 20% of the ETH in the fund in a single month (rolling average). When a fund council proposes an investment, the counterparty (investee) can accept this investment right away with no time delay. When the fund council chooses to sell out of an investment, there is a 3 day time delay. Fund token holders can veto these devestments within this window. Fund token holders also have capability to permanently and irrevocably shut down the fund if they are unhappy with management.

The veto process works as follows. Fund token holders can vote to `pause` or `kill` the fund. Voting to pause the fund turns off any buying and selling functionality. This would be triggered and management would need to answer for any problems before the fund gets unpaused. There is a 30% quorum needed here. After >30% of tokens have been staked to `pause` or `kill`, then the fund will automatically pause.

If fund token holders are extremely unhappy, then they can completely kill the fund. This needs a 50% quorum, and once this is hit, all assets in the fund will be available to claim by fund token holders. 

Normally there is a configurable fee attached to the fund, with 50% of fees going to STACK holders, and 50% of fees going to the fund council. However, if the fund is `killed` then there will be no fee, as the council is assumed to have mismanaged the fund and not be worthy of any fee revenue.

#### issueTokens
This function is called when the fund is still in a "set up" phase. All users who contributed funds to the fund will be minted tokens, proportional to the amount of funds they committed.

#### startFund
This is called once all tokens have been issued. The fund council will seed the fund with ETH, and the fund will go into an `active` state. At this point, new investments can be made. The fund will automatically `close` after a predefined time limit.

#### investPropose
This is only callable by the fund council, and proposes an investment of ERC20 tokens for an amount of ETH (aka buying an ERC20 for ETH). There can only be one proposed buy at a time, and buy IDs are cumulative. BuyID is mostly just for logging & tracking purposes. This also checks and updates the monthly investment utilization of 20%. The fund must be in active state.

#### investRevoke
This allows the fund council to revoke an investment offer before it is executed. They might want to change the offer, or angry token holders decided to `pause` the fund, demanding that an investment is revoked. The fund can be active or paused to allow this action.

#### investExecute
This allows a investee to sell his ERC20 tokens for ETH. The investee can sell greater than or equal to the amount of ERC20 tokens proposed. This is to allow this function to plug into "bidding", action, or OTC style helper smart contracts who act as the "taker" on chain (and can be interacted with by perhaps a larger set of participants).

#### devestPropose
This allows the fund council to propose a devestment of an ERC20 token and receive ETH. There can be an unlimited amount of sells proposed at a single time, unlike buys. Sells have a 3 days window before they can be executed.  This is to allow fund token holders to enact a pause before an unfavorable devestment is executed. The fund must be in active state.

#### devestRevoke
This allows the fund council to revoke a devestment. This could be because an error was made, market prices changed, or because the fund was paused by unhappy token holders (and the fund council revoked an investment as a resolution to this unhappyness). The fund must be either active or paused.

#### devestExecute
After the 3 day waiting period is complete, then a devestment can be executed. The buyer of the ERC20 tokens can send greater than or equal to the required amount of ETH. This is to allow connector contracts to "auction" tokens off for a variable amount (or other sort of situations). See `investExecute` for similar functionality.

#### stakeToPause
This is called by a fund token holder who is unhappy with a current investment/devestment/action taken by the fund council, and seeks to pause any more investments/devestments from happening. If a 30% quorum is hit (in tokens staked to pause AND kill), then the fund will pause. The fund will unpause once the quorum is lost.

#### stakeToKill
This is called by a fund token holder who wants to completely dissolve the fund ahead of schedule. This requires a 50% quorum, and if hit, the fund will close and the assets will be claimable by token holders. Funds staked to kill also count towards the pause quorum, however the inverse is not true.

#### unstakeToPause
Unstakes and returns tokens to a user who staked to pause.

#### unstakeToKill
Unstakes and returns tokens to a user who staked to kill.

#### claim
If the fund is closed, then fund token holders can claim their proportion of ETH and ERC20 tokens. A user can call claim, and their fund tokens will be burnt, and their proportion of assets is calculated via the amount of fund tokens burnt divided by remaining supply. A user also specifies what tokens they would like to receive. In a standard VC fund, many of the investments will go bust, however a select few will be "big winners". The function assumes that users will not necessarily want to claim all tokens, but only the winners.

There is a limit of 50 tokens that can be claimed in this function. ETH is always claimed. If there are more than 50 investments / tokens in the fund, then the fund council can intelligently use devestment/investment functions and an additional smart contract to wrap all lower-valued tokens into a single token. Users can then claim this single token (which gives them rights to claim these lower valued tokens if they wish to).

It's important that when you have looping functions in a smart contract, there are bounds to the amount of loops that can run, or you can run out of gas and make your contract non-operatable. 

#### assessFee internal
Once the fund is trigged to close, a fee will be assessed IF the fund was NOT closed via a kill quorum. The fee, currently, is 5%. This will mint 50% of the total fee to STACK treasury address, and 50% to the fund council. The fee is assessed by minting fund tokens (diluting original holders claim on assets by the fee amount).

#### updateInvestmentUtilization internal
This function updates the investment utilization after a proposed investment. If the proposed investment will take the contract over the maximum utilization, then this function will revert. This function leverages `getUtilization public view` in order to calculate the current utilization (and depreciate it based on time).

#### emergencyEscape
This emergency function allows an escape of an asset. This is to allows for a safety valve in-case the fund "locks up" or in other words, where normal operations of the fund become impossible due to smart contract error or some sort of bug locking funds into the contract. Note, that there are some requirements into the function and it cannot be used to "rug" individuals of their money. The fund must be closed via normal operation (not killed), and this function only sends escaped funds to the "treasury" address, which will be decentrally controlled by STACK holders.

### Gauge Distribution 1 (./Token/GaugeD1.sol)

This is a gauge contract using this algorithm for a per-block token distribution: https://uploads-ssl.webflow.com/5ad71ffeb79acc67c8bcdaba/5ad8d1193a40977462982470_scalable-reward-distribution-paper.pdf

Users are rewarded by committing their funds to the VC Fund (either a soft- or hard-commit). Users will receive a bonus for hard-committing to the fund. A hard-commit is a irrevocable committment to Stacker.vc Fund #1. A soft-commit is a withdrawable committment to Stacker.vc Fund #1. A soft-committment can be withdrawn in a 3 month window, but after this, the fund closes and it will be committed to the VC Fund as well.

The more tokens you commit to the fund, and the more you hard-commit these tokens, the more STACK tokens you will receive. This STACK token distribution will take place for a 3-month window (same 3 month window that the fund has to close).

All tokens committed to the fund will receive _SVC01 Tokens_ after the fund closes, in proportion to how much ETH (equivalent) that the user committed to the fund. This will be done via a publicly available and auditable snapshot on the fund-close date.

#### governance
This address has some control over the distribution. It can change the endBlock (if the end block has not passed yet), add new bridges to the fund (yEarn integration), change the emission rate, close the fund (once it reaches the hard cap... soft-commits can still withdraw), and change the vcHolding account. This address can also sweep soft-commits to the vcHolding address, ONLY when the fund has closed.

#### vcHolding
This address holds the funds that have been committed to the Stacker.vc Fund #1. This address will be set to a multisig wallet with public participants for safe-guarding.

#### acceptToken
This is the token that the Gauge accepts for committment to the fund. Users can deposit this token and receive their STACK bonus.

#### vaultGaugeBridge
Another smart contract to allow users to deposit into yEarn and then into the Gauge in a single transaction. Bridge contract is set once in the constructor.

#### emissionRate
This is how many STACK tokens (18 decimals) get emitted per block.

#### depositedCommitSoft
Number of _acceptToken_ that has been soft-committed to the fund.

#### depositedCommitHard
Number of _acceptToken_ that has been hard-committed to the fund.

#### commitSoftWeight & commitHardWeight
The amount of STACK bonus a user gets for soft/hard-committing. 1x and 4x, respectively.

#### mapping(address => CommitState) public balances;
A mapping to track user committments per level, and _tokensAccrued_ for STACK distribution.

#### fundOpen
Governance can close the fund, and reject new commits and upgrades. Soft-commits can always be withdrawn until the deadline.

#### startBlock & endBlock
The times that the STACK token distribution opens and closes. lastBlock can be adjusted, but startBlock is fixed.

#### tokensAccrued
The amount of STACK tokens accrued per _acceptToken_ committed to the fund. See above Gauge algorithm for more info.

#### setGovernance() & setVCHolding() & setEmissionRate() & setFundOpen() & setEndBlock()
Permissioned action for _governance_ to change constants.

#### deposit()
Allows users to deposit funds into soft-commit for hard-commit buckets & start accruing STACK tokens. Also claims STACK tokens for a user.

#### upgradeCommit()
Allows a user to upgrade from softCommit to hardCommit level. Also claims STACK tokens for a user.

#### withdraw()
Allows a user to withdraw a soft-commit before deadline. Also claims STACK tokens for a user.

#### claimSTACK()
Claims STACK tokens for a user.

#### claimSTACK() internal
Claims a users STACK tokens and sends to them, if their _tokensAccrued_ is less than the global _tokensAccrued_. Updates their _tokensAccrued_ variable and sets it equal to the global variable after claiming.

#### kick() internal
Asks STACK token contract to mint more tokens. This would be the difference of blocks since the last time this was called, times the emission rate per block.

#### sweepCommitSoft()
Allows the governance address to sweep all soft-committed funds to the _vcHolding_ account. This can ONLY be called after the deadline is complete, and can only be called once. This marks the start of the fund!

#### getTotalWeight()
Total _acceptToken_ multiplied by the weight of the STACK bonus for the deposit type.

#### getTotalBalance()
Total _acceptToken_ deposited into the contract.

#### getUserWeight()
Gets weight of a user (_acceptToken_ deposited times STACK distribution bonus).

#### getUserBalance()
Total _acceptToken_ deposited by a users into the contract.

### AlphaHomora Vault Gauge Bridge (./Token/VaultGaugeBridge.sol)
This contract allows users to deposit their ERC20/ETH into AlphaHomoraV2 to receive interest, and then deposit those yTokens into a gauge to commit to the Stacker.vc Fund #1. This bridge contract allows a user to do this in a single action (usually would take two). The user can also withdraw in a similar way, from Gauge -> AH -> ERC20 base tokens (if they don't want to withdraw the yToken from a Gauge, but instead withdraw the underlying).

Users can deposit ibETH directly to the Gauge contract, and bypass this Bridge contract. They can also withdraw directly from a Gauge, and bypass this contract on a withdraw. It's simply to make the UI better, less fees & waiting!

#### governance
DAO agent, permissioned user.

#### receive() (fallback function)
On receipt of ETH, act as if the depositor is committing to the Stacker.vc fund.

#### setGovernance()
Permissioned action to change the governance account.

#### depositBridgeETH()
Takes an initial send of ETH, deposits into AH, and then deposits ibETH into the Gauge.

#### withdrawBridgeETH()
Withdraws from gauge and receives ETH from the ibETH contract, forwards to user. 

#### withdrawGauge() internal
A helper function to withdraw from a gauge contract.

#### depositGauge() internal
A helper function to deposit into a gauge contract.

### STACK Liquidity Provider Gauge (./Token/LPGauge.sol)
This a simplied Gauge contract from the above Gauge contract. This doesn't have anything to do with the VC Fund #1 committment scheme, but allows users to be given a bonus for providing liquidity to the STACK token on Uniswap and Balancer markets. Sufficient liquidity for trading is very important for a fledgling project, and we seek to incentivize providing liquidity via this contract. 

Users that provide liquidity to Uniswap STACK<>ETH will be to deposit LP Tokens. Users must deposit their LP Tokens in this contract to be rewarded.
