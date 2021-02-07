const Web3 = require("web3");
const web3 = new Web3('http://localhost:7545');
const fs = require("fs");

const STACKToken = artifacts.require("./Token/STACKToken.sol");
const VaultGaugeBridge = artifacts.require("./Token/VaultGaugeBridge.sol");
const GaugeD1 = artifacts.require("./Token/GaugeD1.sol");
const LPGauge = artifacts.require("./Token/LPGauge.sol");
const IUniswap = artifacts.require("./Interfaces/IUniswapRouterv2.sol");

module.exports = async function (deployer) {

	let contracts = JSON.parse(fs.readFileSync("./contracts-integration-test.json"));

	let accounts = await web3.eth.getAccounts();
	const deployment = accounts[0];
	const rewards = accounts[1];
	const user = accounts[2];
	const vcHolding = accounts[3];
	const user2 = accounts[4];
	const temp = accounts[5];

	let vaultGaugeBridge = await VaultGaugeBridge.at(contracts["VaultGaugeBridge"]);

	// swap 900 ETH -> WETH
	await web3.eth.sendTransaction({from: user, to: contracts["WETH"], value: web3.utils.toWei("900", "ether")});

	// get crvYPool, DAI, USDC, USDT, TUSD, GUSD, YFI from Uniswap
	// crvRenWSBTC ??????
	let uniswap = await IUniswap.at("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");
	let token = await STACKToken.at(contracts["WETH"]);
	await token.approve(uniswap.address, web3.utils.toWei("900", "ether"), {from: user});
	console.log("approve uniswap");

	let nowtime = (await web3.eth.getBlock("latest")).timestamp;
	let tokens = ["crvYPool", "DAI", "USDC", "USDT", "TUSD", "GUSD", "YFI"];
	for (let i = 0; i < tokens.length; i++){
		await uniswap.swapExactTokensForTokens(web3.utils.toWei("50", "ether"), "0", [contracts["WETH"], contracts[tokens[i]]], user, nowtime + 10000000, {from: user});
		console.log("swapped", tokens[i]);
		token = await STACKToken.at(contracts[tokens[i]]);
		await token.approve(contracts["VaultGaugeBridge"], (await token.balanceOf(user)).toString(), {from: user}); // approve all

		console.log("now have", (await token.balanceOf(user)).toString(), tokens[i]);
	}

	let vaults = ["yUSDVault", "yDAIVault", "yUSDCVault", "yUSDTVault", "yTUSDVault", "yGUSDVault", "yYFIVault"];
	let gauges = ["yUSDGauge", "yDAIGauge", "yUSDCGauge", "yUSDTGauge", "yTUSDGauge", "yGUSDGauge", "yYFIGauge"];
	let gauge;
	let balance;
	for (let j = 0; j < vaults.length; j++){
		token = await STACKToken.at(contracts[tokens[j]]);
		gauge = await GaugeD1.at(contracts[gauges[j]]);

		balance = (await token.balanceOf(user)).toString();
		await vaultGaugeBridge.depositBridge(contracts[vaults[j]], balance, false, {from: user});
		console.log("deposited", balance, tokens[j]);

		balance = (await gauge.balances(user)).balanceCommitSoft.toString();
		await vaultGaugeBridge.withdrawBridge(contracts[vaults[j]], balance, {from: user}); // just withdraw small amount
		console.log("withdrew", balance, vaults[j]); // note different token

		balance = (await token.balanceOf(user)).toString();
		console.log("now have", balance, tokens[j]);
	}

	// approve WETH too
	token = await STACKToken.at(contracts["WETH"]);
	await token.approve(contracts["VaultGaugeBridge"], await token.balanceOf(user), {from: user}); // approve all

	gauge = await GaugeD1.at(contracts["yETHGauge"]);

	// deposit/withdraw WETH and ETH via different functions
	balance = (await token.balanceOf(user)).toString();
	await vaultGaugeBridge.depositBridge(contracts["yETHVault"], balance, false, {from: user});
	console.log("deposited", balance, "WETH");

	balance = (await gauge.balances(user)).balanceCommitSoft.toString();
	await vaultGaugeBridge.withdrawBridge(contracts["yETHVault"], (await gauge.balances(user)).balanceCommitSoft.toString(), {from: user});
	console.log("withdrew", balance, "yETHVault"); // note different token

	balance = web3.utils.toWei("1", "ether")
	await vaultGaugeBridge.depositBridgeETH(contracts["yETHVault"], false, {from: user, value: balance});
	console.log("deposited", balance, "ETH");

	balance = (await gauge.balances(user)).balanceCommitSoft.toString();
	await vaultGaugeBridge.withdrawBridgeETH(contracts["yETHVault"], (await gauge.balances(user)).balanceCommitSoft.toString(), {from: user});
	console.log("withdrew", balance, "yETHVault"); // note different token

	
	

	






}