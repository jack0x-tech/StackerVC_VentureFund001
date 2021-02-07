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
	let vaultGaugeBridge = await VaultGaugeBridge.at(contracts["VaultGaugeBridge"]);


	// test setting functions in both contracts

	////////////////
	// GAUGED1 TESTS
	////////////////

	console.log("");
	console.log("GAUGE D1 testing...");
	console.log("");

	// test setting governance
	let governance = (await gaugeD1.governance()).toString();
	console.log("governance set", governance, deployment, governance == deployment);
	await gaugeD1.setGovernance(temp, {from: deployment});
	governance = (await gaugeD1.governance()).toString();
	console.log("governance changed", governance, temp, governance == temp);
	await gaugeD1.setGovernance(deployment, {from: temp});

	// test setting vcHolding
	let vch = (await gaugeD1.vcHolding()).toString();
	console.log("vcHolding set", vch, vcHolding, vch == vcHolding);
	await gaugeD1.setVCHolding(temp, {from: deployment});
	vch = (await gaugeD1.vcHolding()).toString();
	console.log("vcHolding changed", vch, temp, vch == temp);
	await gaugeD1.setVCHolding(vcHolding, {from: deployment});

	// test setting emission rate
	let emissionRate = (await gaugeD1.emissionRate()).toString();
	console.log("emission set", emissionRate, web3.utils.toWei("1", "ether"), emissionRate == web3.utils.toWei("1", "ether"));
	await gaugeD1.setEmissionRate(web3.utils.toWei("10", "ether"), {from: deployment});
	emissionRate = (await gaugeD1.emissionRate()).toString();
	console.log("emission changed", emissionRate, web3.utils.toWei("10", "ether"), emissionRate == web3.utils.toWei("10", "ether"));
	await gaugeD1.setEmissionRate(web3.utils.toWei("1", "ether"), {from: deployment});

	// test setting fund open
	let fundOpen = (await gaugeD1.fundOpen());
	console.log("fundOpen set", fundOpen, true, fundOpen == true);
	await gaugeD1.setFundOpen(false, {from: deployment});
	fundOpen = (await gaugeD1.fundOpen());
	console.log("fundOpen changed", fundOpen, false, fundOpen == false);
	await gaugeD1.setFundOpen(true, {from: deployment});

	// test setting endBlock
	let endBlock = (await gaugeD1.endBlock()).toString();
	let endBlockReset = endBlock;
	console.log("endBlock set", "???", "???", "???");
	await gaugeD1.setEndBlock("100000000", {from: deployment});
	endBlock = (await gaugeD1.endBlock()).toString();
	console.log("endBlock changed", endBlock, "100000000", endBlock == "100000000");
	await gaugeD1.setEndBlock(endBlockReset, {from: deployment});

	/////////////////
	// LP GAUGE TESTS
	/////////////////

	console.log("");
	console.log("LP GAUGE testing...");
	console.log("");

	// test setting governance
	governance = (await lpGauge.governance()).toString();
	console.log("governance set", governance, deployment, governance == deployment);
	await lpGauge.setGovernance(temp, {from: deployment});
	governance = (await lpGauge.governance()).toString();
	console.log("governance changed", governance, temp, governance == temp);
	await lpGauge.setGovernance(deployment, {from: temp});

	// test setting emission rate
	emissionRate = (await lpGauge.emissionRate()).toString();
	console.log("emission set", emissionRate, web3.utils.toWei("0.001", "ether"), emissionRate == web3.utils.toWei("0.001", "ether"));
	await lpGauge.setEmissionRate(web3.utils.toWei("10", "ether"), {from: deployment});
	emissionRate = (await lpGauge.emissionRate()).toString();
	console.log("emission changed", emissionRate, web3.utils.toWei("10", "ether"), emissionRate == web3.utils.toWei("10", "ether"));
	await lpGauge.setEmissionRate(web3.utils.toWei("0.001", "ether"), {from: deployment});

	// test setting endBlock
	endBlock = (await lpGauge.endBlock()).toString();
	endBlockReset = endBlock;
	console.log("endBlock set", "???", "???", "???");
	await lpGauge.setEndBlock("100000000", {from: deployment});
	endBlock = (await lpGauge.endBlock()).toString();
	console.log("endBlock changed", endBlock, "100000000", endBlock == "100000000");
	await lpGauge.setEndBlock(endBlockReset, {from: deployment});

	///////////////
	// BRIDGE TESTS
	///////////////

	console.log("");
	console.log("BRIDGE testing...");
	console.log("");

	// test setting governance
	governance = (await vaultGaugeBridge.governance()).toString();
	console.log("governance set", governance, deployment, governance == deployment);
	await vaultGaugeBridge.setGovernance(temp, {from: deployment});
	governance = (await vaultGaugeBridge.governance()).toString();
	console.log("governance changed", governance, temp, governance == temp);
	await vaultGaugeBridge.setGovernance(deployment, {from: temp});

	await vaultGaugeBridge.newBridge(accounts[6], accounts[7], {from: deployment});
	let bridge = await vaultGaugeBridge.bridges(accounts[6]);
	console.log("bridge set", bridge, accounts[7], bridge == accounts[7]);


}