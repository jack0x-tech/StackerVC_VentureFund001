const Web3 = require("web3");
const web3 = new Web3('http://localhost:7545');
const fs = require("fs");

const STACKToken = artifacts.require("./Token/STACKToken.sol");
const VaultGaugeBridge = artifacts.require("./Token/VaultGaugeBridge.sol");
const GaugeD1 = artifacts.require("./Token/GaugeD1.sol");
const LPGauge = artifacts.require("./Token/LPGauge.sol");

module.exports = async function (deployer) {

	let currentBlock = (await web3.eth.getBlock("latest")).number;
	console.log("current block number:", currentBlock);
	if (currentBlock > 10){
		// NOTE: if this is triggered, we need to reset our ganche-cli and not use a forked chain (a fresh test-chain instead).
		// ALSO, please make sure that the "startBlock" and "endBlock" is set to (for Token/VaultGauge.sol) 100 & 200 and (for Token/LPGauge.sol) to 300 & 500.
		throw new Error("Please reset ganache-cli to run these tests from starting block. Do not use a blockchain fork. Maybe: `ganache-cli -a 10 -e 1000 -p 7545 -i 5777`");
	}

	let contracts = {};

	let accounts = await web3.eth.getAccounts();
	const deployment = accounts[0];
	const rewards = accounts[1];
	const user = accounts[2];
	const vcHolding = accounts[3];
	const user2 = accounts[4];

	// deploy STACK token contract
	let stackToken = await deployer.deploy(STACKToken, {from: deployment});
	contracts["STACK"] = stackToken.address;

	console.log("deployed STACK");

	// deploy "fake" gauge token and LP token, just by using same code as STACK contract
	let gaugeToken = await deployer.deploy(STACKToken, {from: deployment});
	contracts["GaugeToken"] = gaugeToken.address;

	console.log("deployed GaugeToken");

	let lpToken = await deployer.deploy(STACKToken, {from: deployment});
	contracts["LPToken"] = lpToken.address;

	console.log("deployed LPToken");

	// mint gauge & LP token to some user & user2
	await gaugeToken.mint(deployment, web3.utils.toWei("200", "ether"), {from: deployment});
	await lpToken.mint(deployment, web3.utils.toWei("200", "ether"), {from: deployment});

	await gaugeToken.transfer(user, web3.utils.toWei("100", "ether"), {from: deployment});
	await gaugeToken.transfer(user2, web3.utils.toWei("100", "ether"), {from: deployment});

	await lpToken.transfer(user, web3.utils.toWei("100", "ether"), {from: deployment});
	await lpToken.transfer(user2, web3.utils.toWei("100", "ether"), {from: deployment});

	// deploy bridge contract, this won't be tested in these unit tests
	let vaultGaugeBridge = await deployer.deploy(VaultGaugeBridge, {from: deployment});
	contracts["VaultGaugeBridge"] = vaultGaugeBridge.address;

	console.log("deployed VaultGaugeBridge");

	// deploy gaugeD1 testing contract
	const emissionRate = web3.utils.toWei("1", "ether"); // per block rate
	let gaugeD1 = await deployer.deploy(GaugeD1, vcHolding, contracts["STACK"], contracts["GaugeToken"], contracts["VaultGaugeBridge"], emissionRate, {from: deployment});
	contracts["GaugeD1"] = gaugeD1.address;
	await stackToken.addMinter(contracts["GaugeD1"], {from: deployment});

	console.log("deployed GaugeD1");

	const lpEmissionRate = web3.utils.toWei("0.001", "ether");
	let lpGauge = await deployer.deploy(LPGauge, contracts["STACK"], contracts["LPToken"], lpEmissionRate, {from: deployment});
	contracts["LPGauge"] = lpGauge.address;
	await stackToken.addMinter(contracts["LPGauge"], {from: deployment});

	console.log("deployed LPGauge");

	console.log("writing all contract addresses to file...");
	console.log(contracts);
	fs.writeFileSync("./contracts-unit-test.json", JSON.stringify(contracts), 'utf-8');

}