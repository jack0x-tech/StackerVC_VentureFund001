const Web3 = require("web3");
const web3 = new Web3('http://localhost:7545');
const fs = require("fs");

const STACKToken = artifacts.require("./Token/STACKToken.sol");
const VaultGaugeBridge = artifacts.require("./Token/VaultGaugeBridge.sol");
const GaugeD1 = artifacts.require("./Token/GaugeD1.sol");
const LPGauge = artifacts.require("./Token/LPGauge.sol");

module.exports = async function (deployer) {

	let contracts = JSON.parse(fs.readFileSync("./contracts-unit-test.json"));

	let accounts = await web3.eth.getAccounts();
	const deployment = accounts[0];
	const rewards = accounts[1];
	const user = accounts[2];
	const vcHolding = accounts[3];
	const user2 = accounts[4];
	const temp = accounts[5];

	let gaugeD1 = await GaugeD1.at(contracts["GaugeD1"]);
	let lpGauge = await LPGauge.at(contracts["LPGauge"]);
	let stackToken = await STACKToken.at(contracts["STACK"]);
	let gaugeToken = await STACKToken.at(contracts["GaugeToken"]);
	let lpToken = await STACKToken.at(contracts["LPToken"]);

	console.log("");
	console.log("GAUGE D1 testing...");
	console.log("");

	// deposit into soft/hard commit
	await gaugeToken.approve(contracts["GaugeD1"], web3.utils.toWei("100", "ether"), {from: user});
	await gaugeToken.approve(contracts["GaugeD1"], web3.utils.toWei("100", "ether"), {from: user2});

	await gaugeD1.deposit(web3.utils.toWei("1", "ether"), "0", user, {from: user});
	await gaugeD1.deposit(web3.utils.toWei("1", "ether"), "0", user2, {from: user2});

	let balanceUser = await gaugeD1.balances(user);
	let balanceUser2 = await gaugeD1.balances(user2);
	let balanceSoftUser = balanceUser.balanceCommitSoft.toString();
	let balanceSoftUser2 = balanceUser2.balanceCommitSoft.toString();
	let balanceHardUser = balanceUser.balanceCommitHard.toString();
	let balanceHardUser2 = balanceUser2.balanceCommitHard.toString();
	console.log("balance user soft", balanceSoftUser, web3.utils.toWei("1", "ether"), balanceSoftUser == web3.utils.toWei("1", "ether"));
	console.log("balance user2 soft", balanceSoftUser2, web3.utils.toWei("1", "ether"), balanceSoftUser2 == web3.utils.toWei("1", "ether"));
	console.log("balance user hard", balanceHardUser, web3.utils.toWei("0", "ether"), balanceHardUser == web3.utils.toWei("0", "ether"));
	console.log("balance user2 hard", balanceHardUser2, web3.utils.toWei("0", "ether"), balanceHardUser2 == web3.utils.toWei("0", "ether"));

	await gaugeD1.deposit("0", web3.utils.toWei("1", "ether"), user, {from: user});
	await gaugeD1.deposit("0", web3.utils.toWei("1", "ether"), user2, {from: user2});

	balanceUser = await gaugeD1.balances(user);
	balanceUser2 = await gaugeD1.balances(user2);
	balanceSoftUser = balanceUser.balanceCommitSoft.toString();
	balanceSoftUser2 = balanceUser2.balanceCommitSoft.toString();
	balanceHardUser = balanceUser.balanceCommitHard.toString();
	balanceHardUser2 = balanceUser2.balanceCommitHard.toString();
	console.log("balance user soft", balanceSoftUser, web3.utils.toWei("1", "ether"), balanceSoftUser == web3.utils.toWei("1", "ether"));
	console.log("balance user2 soft", balanceSoftUser2, web3.utils.toWei("1", "ether"), balanceSoftUser2 == web3.utils.toWei("1", "ether"));
	console.log("balance user hard", balanceHardUser, web3.utils.toWei("1", "ether"), balanceHardUser == web3.utils.toWei("1", "ether"));
	console.log("balance user2 hard", balanceHardUser2, web3.utils.toWei("1", "ether"), balanceHardUser2 == web3.utils.toWei("1", "ether"));
	let vcHoldingBalance = (await gaugeToken.balanceOf(vcHolding)).toString();
	console.log("vcHolding balance", vcHoldingBalance, web3.utils.toWei("2", "ether"), vcHoldingBalance == web3.utils.toWei("2", "ether"));

	await gaugeD1.deposit(web3.utils.toWei("1", "ether"), web3.utils.toWei("1", "ether"), user, {from: user});
	await gaugeD1.deposit(web3.utils.toWei("1", "ether"), web3.utils.toWei("1", "ether"), user2, {from: user2});

	balanceUser = await gaugeD1.balances(user);
	balanceUser2 = await gaugeD1.balances(user2);
	balanceSoftUser = balanceUser.balanceCommitSoft.toString();
	balanceSoftUser2 = balanceUser2.balanceCommitSoft.toString();
	balanceHardUser = balanceUser.balanceCommitHard.toString();
	balanceHardUser2 = balanceUser2.balanceCommitHard.toString();
	console.log("balance user soft", balanceSoftUser, web3.utils.toWei("2", "ether"), balanceSoftUser == web3.utils.toWei("2", "ether"));
	console.log("balance user2 soft", balanceSoftUser2, web3.utils.toWei("2", "ether"), balanceSoftUser2 == web3.utils.toWei("2", "ether"));
	console.log("balance user hard", balanceHardUser, web3.utils.toWei("2", "ether"), balanceHardUser == web3.utils.toWei("2", "ether"));
	console.log("balance user2 hard", balanceHardUser2, web3.utils.toWei("2", "ether"), balanceHardUser2 == web3.utils.toWei("2", "ether"));
	let depositedCommitSoft = (await gaugeD1.depositedCommitSoft()).toString();
	let depositedCommitHard = (await gaugeD1.depositedCommitHard()).toString();
	console.log("deposited commit soft", depositedCommitSoft, web3.utils.toWei("4", "ether"), depositedCommitSoft == web3.utils.toWei("4", "ether"));
	console.log("deposited commit hard", depositedCommitHard, web3.utils.toWei("4", "ether"), depositedCommitHard == web3.utils.toWei("4", "ether"));
	vcHoldingBalance = (await gaugeToken.balanceOf(vcHolding)).toString();
	console.log("vcHolding balance", vcHoldingBalance, web3.utils.toWei("4", "ether"), vcHoldingBalance == web3.utils.toWei("4", "ether"));

	// upgrade commit
	await gaugeD1.upgradeCommit(web3.utils.toWei("1", "ether"), {from: user});
	await gaugeD1.upgradeCommit(web3.utils.toWei("1", "ether"), {from: user2});

	balanceUser = await gaugeD1.balances(user);
	balanceUser2 = await gaugeD1.balances(user2);
	balanceSoftUser = balanceUser.balanceCommitSoft.toString();
	balanceSoftUser2 = balanceUser2.balanceCommitSoft.toString();
	balanceHardUser = balanceUser.balanceCommitHard.toString();
	balanceHardUser2 = balanceUser2.balanceCommitHard.toString();
	console.log("balance user soft", balanceSoftUser, web3.utils.toWei("1", "ether"), balanceSoftUser == web3.utils.toWei("1", "ether"));
	console.log("balance user2 soft", balanceSoftUser2, web3.utils.toWei("1", "ether"), balanceSoftUser2 == web3.utils.toWei("1", "ether"));
	console.log("balance user hard", balanceHardUser, web3.utils.toWei("3", "ether"), balanceHardUser == web3.utils.toWei("3", "ether"));
	console.log("balance user2 hard", balanceHardUser2, web3.utils.toWei("3", "ether"), balanceHardUser2 == web3.utils.toWei("3", "ether"));
	depositedCommitSoft = (await gaugeD1.depositedCommitSoft()).toString();
	depositedCommitHard = (await gaugeD1.depositedCommitHard()).toString();
	console.log("deposited commit soft", depositedCommitSoft, web3.utils.toWei("2", "ether"), depositedCommitSoft == web3.utils.toWei("2", "ether"));
	console.log("deposited commit hard", depositedCommitHard, web3.utils.toWei("6", "ether"), depositedCommitHard == web3.utils.toWei("6", "ether"));
	vcHoldingBalance = (await gaugeToken.balanceOf(vcHolding)).toString();
	console.log("vcHolding balance", vcHoldingBalance, web3.utils.toWei("6", "ether"), vcHoldingBalance == web3.utils.toWei("6", "ether"));

	// withdraw
	await gaugeD1.withdraw(web3.utils.toWei("0.5", "ether"), user, {from: user});
	await gaugeD1.withdraw(web3.utils.toWei("0.5", "ether"), user2, {from: user2});

	balanceUser = await gaugeD1.balances(user);
	balanceUser2 = await gaugeD1.balances(user2);
	balanceSoftUser = balanceUser.balanceCommitSoft.toString();
	balanceSoftUser2 = balanceUser2.balanceCommitSoft.toString();
	balanceHardUser = balanceUser.balanceCommitHard.toString();
	balanceHardUser2 = balanceUser2.balanceCommitHard.toString();
	console.log("balance user soft", balanceSoftUser, web3.utils.toWei("0.5", "ether"), balanceSoftUser == web3.utils.toWei("0.5", "ether"));
	console.log("balance user2 soft", balanceSoftUser2, web3.utils.toWei("0.5", "ether"), balanceSoftUser2 == web3.utils.toWei("0.5", "ether"));
	console.log("balance user hard", balanceHardUser, web3.utils.toWei("3", "ether"), balanceHardUser == web3.utils.toWei("3", "ether"));
	console.log("balance user2 hard", balanceHardUser2, web3.utils.toWei("3", "ether"), balanceHardUser2 == web3.utils.toWei("3", "ether"));

	depositedCommitSoft = (await gaugeD1.depositedCommitSoft()).toString();
	depositedCommitHard = (await gaugeD1.depositedCommitHard()).toString();
	console.log("deposited commit soft", depositedCommitSoft, web3.utils.toWei("1", "ether"), depositedCommitSoft == web3.utils.toWei("1", "ether"));
	console.log("deposited commit hard", depositedCommitHard, web3.utils.toWei("6", "ether"), depositedCommitHard == web3.utils.toWei("6", "ether"));

	// claimSTACK
	let currentBlock = (await web3.eth.getBlock("latest")).number;
	console.log("current block number:", currentBlock);

	await gaugeD1.claimSTACK({from: user});
	await gaugeD1.claimSTACK({from: user2});

	let stackBalanceUser = (await stackToken.balanceOf(user)).toString();
	let stackBalanceUser2 = (await stackToken.balanceOf(user2)).toString();
	let tokensAccrued = (await gaugeD1.tokensAccrued()).toString();
	let tokensAccruedUser = (await gaugeD1.balances(user)).tokensAccrued.toString();
	let tokensAccruedUser2 = (await gaugeD1.balances(user2)).tokensAccrued.toString();
	console.log("STACK bal user", stackBalanceUser, "0", stackBalanceUser == "0");
	console.log("STACK bal user2", stackBalanceUser2, "0", stackBalanceUser2 == "0");
	console.log("tokens accrued", tokensAccrued, "0", tokensAccrued == "0");
	console.log("tokens accrued user", tokensAccruedUser, "0", tokensAccruedUser == "0");
	console.log("tokens accrued user2", tokensAccruedUser2, "0", tokensAccruedUser2 == "0");

	// do entire distribution

	while (currentBlock < 200){
		if (currentBlock < 100){
			await web3.currentProvider.send({jsonrpc: '2.0', method: 'evm_mine', id: new Date().getTime()}, (error, response) => {if (error){console.log(error)}});
		}
		else {
			await gaugeD1.deposit("1", "0", user, {from: user});
			await gaugeD1.deposit("1", "0", user2, {from: user2});
		}
		currentBlock = (await web3.eth.getBlock("latest")).number
	}

	await gaugeD1.claimSTACK({from: user});
	await gaugeD1.claimSTACK({from: user2});

	stackBalanceUser = (await stackToken.balanceOf(user)).toString();
	stackBalanceUser2 = (await stackToken.balanceOf(user2)).toString();
	tokensAccrued = (await gaugeD1.tokensAccrued()).toString();
	tokensAccruedUser = (await gaugeD1.balances(user)).tokensAccrued.toString();
	tokensAccruedUser2 = (await gaugeD1.balances(user2)).tokensAccrued.toString();
	console.log("STACK bal user", stackBalanceUser);
	console.log("STACK bal user2", stackBalanceUser2);
	console.log("tokens accrued", tokensAccrued);
	console.log("tokens accrued user", tokensAccruedUser);
	console.log("tokens accrued user2", tokensAccruedUser2);

	// sweep commit soft
	vcHoldingBalance = (await gaugeToken.balanceOf(vcHolding)).toString();
	console.log("vcHolding before", vcHoldingBalance);

	await gaugeD1.sweepCommitSoft({from: deployment});

	vcHoldingBalance = (await gaugeToken.balanceOf(vcHolding)).toString();
	console.log("vcHolding after", vcHoldingBalance);

	console.log("");
	console.log("LP GAUGE testing...");
	console.log("");

	// deposit
	await lpToken.approve(contracts["LPGauge"], web3.utils.toWei("100", "ether"), {from: user});
	await lpToken.approve(contracts["LPGauge"], web3.utils.toWei("100", "ether"), {from: user2});

	await lpGauge.deposit(web3.utils.toWei("1", "ether"), {from: user});
	await lpGauge.deposit(web3.utils.toWei("1", "ether"), {from: user2});

	balanceUser = await lpGauge.balances(user);
	balanceUser2 = await lpGauge.balances(user2);
	let balUser = balanceUser.balance.toString();
	let balUser2 = balanceUser2.balance.toString();
	let deposited = (await lpGauge.deposited()).toString();
	console.log("bal user", balUser, web3.utils.toWei("1", "ether"), balUser == web3.utils.toWei("1", "ether"));
	console.log("bal user2", balUser2, web3.utils.toWei("1", "ether"), balUser2 == web3.utils.toWei("1", "ether"));
	console.log("deposited", deposited, web3.utils.toWei("2", "ether"), deposited == web3.utils.toWei("2", "ether"));

	// withdraw
	await lpGauge.withdraw(web3.utils.toWei("0.5", "ether"), {from: user});
	await lpGauge.withdraw(web3.utils.toWei("0.5", "ether"), {from: user2});

	balanceUser = await lpGauge.balances(user);
	balanceUser2 = await lpGauge.balances(user2);
	balUser = balanceUser.balance.toString();
	balUser2 = balanceUser2.balance.toString();
	deposited = (await lpGauge.deposited()).toString();
	console.log("bal user", balUser, web3.utils.toWei("0.5", "ether"), balUser == web3.utils.toWei("0.5", "ether"));
	console.log("bal user2", balUser2, web3.utils.toWei("0.5", "ether"), balUser2 == web3.utils.toWei("0.5", "ether"));
	console.log("deposited", deposited, web3.utils.toWei("1", "ether"), deposited == web3.utils.toWei("1", "ether"));

	// claimSTACK
	currentBlock = (await web3.eth.getBlock("latest")).number;
	console.log("current block number:", currentBlock);

	await lpGauge.claimSTACK({from: user});
	await lpGauge.claimSTACK({from: user2});

	stackBalanceUser = (await stackToken.balanceOf(user)).toString();
	stackBalanceUser2 = (await stackToken.balanceOf(user2)).toString();
	tokensAccrued = (await lpGauge.tokensAccrued()).toString();
	tokensAccruedUser = (await lpGauge.balances(user)).tokensAccrued.toString();
	tokensAccruedUser2 = (await lpGauge.balances(user2)).tokensAccrued.toString();
	console.log("STACK bal user", stackBalanceUser, "not incremented from above?");
	console.log("STACK bal user2", stackBalanceUser2, "not incremented from above?");
	console.log("tokens accrued", tokensAccrued, "0", tokensAccrued == "0");
	console.log("tokens accrued user", tokensAccruedUser, "0", tokensAccruedUser == "0");
	console.log("tokens accrued user2", tokensAccruedUser2, "0", tokensAccruedUser2 == "0");

	// do entire distribution
	while (currentBlock < 400){
		if (currentBlock < 300){
			await web3.currentProvider.send({jsonrpc: '2.0', method: 'evm_mine', id: new Date().getTime()}, (error, response) => {if (error){console.log(error)}});
		}
		else {
			await lpGauge.deposit(web3.utils.toWei("0.05", "ether"), {from: user});
			await lpGauge.deposit(web3.utils.toWei("0.05", "ether"), {from: user2});
		}
		currentBlock = (await web3.eth.getBlock("latest")).number
	}

	await lpGauge.claimSTACK({from: user});
	await lpGauge.claimSTACK({from: user2});

	stackBalanceUser = (await stackToken.balanceOf(user)).toString();
	stackBalanceUser2 = (await stackToken.balanceOf(user2)).toString();
	tokensAccrued = (await lpGauge.tokensAccrued()).toString();
	tokensAccruedUser = (await lpGauge.balances(user)).tokensAccrued.toString();
	tokensAccruedUser2 = (await lpGauge.balances(user2)).tokensAccrued.toString();
	console.log("STACK bal user", stackBalanceUser);
	console.log("STACK bal user2", stackBalanceUser2);
	console.log("tokens accrued", tokensAccrued);
	console.log("tokens accrued user", tokensAccruedUser);
	console.log("tokens accrued user2", tokensAccruedUser2);

}