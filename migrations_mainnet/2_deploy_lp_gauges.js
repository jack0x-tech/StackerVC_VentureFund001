const Web3 = require("web3");
const web3 = new Web3('http://localhost:7545');
const fs = require("fs");

const STACKToken = artifacts.require("./Token/STACKToken.sol");
const VaultGaugeBridge = artifacts.require("./Token/VaultGaugeBridge.sol");
const GaugeD1 = artifacts.require("./Token/GaugeD1.sol");
const LPGauge = artifacts.require("./Token/LPGauge.sol");

module.exports = async function (deployer) {

	let contracts = JSON.parse(fs.readFileSync("./contracts-mainnet.json"));

	let accounts = await web3.eth.getAccounts();
	const deployment = accounts[0];
	const rewards = accounts[1];
	const user = accounts[2];
	const vcHolding = accounts[3];

	// deploy some "fake" LP token contracts
	let UNIETHLP = await deployer.deploy(STACKToken, {from: deployment});
	contracts["UNIETHLP"] = UNIETHLP.address;

	let UNIUSDTLP = await deployer.deploy(STACKToken, {from: deployment});
	contracts["UNIUSDTLP"] = UNIUSDTLP.address;

	let BALETHLP = await deployer.deploy(STACKToken, {from: deployment});
	contracts["BALETHLP"] = BALETHLP.address;

	let stackToken = await STACKToken.at(contracts["STACK"]);

	const UNIETHLPEmissionRate = "15058380767707";
	let UNIETHLPGauge = await deployer.deploy(LPGauge, contracts["STACK"], contracts["UNIETHLP"], UNIETHLPEmissionRate, {from: deployment});
	contracts["UNIETHLPGauge"] = UNIETHLPGauge.address;
	await stackToken.addMinter(contracts["UNIETHLPGauge"], {from: deployment});

	console.log("deployed & configured UNIETHLPGauge");

	const UNIUSDTLPEmissionRate = "15058380767707";
	let UNIUSDTLPGauge = await deployer.deploy(LPGauge, contracts["STACK"], contracts["UNIUSDTLP"], UNIUSDTLPEmissionRate, {from: deployment});
	contracts["UNIUSDTLPGauge"] = UNIUSDTLPGauge.address;
	await stackToken.addMinter(contracts["UNIUSDTLPGauge"], {from: deployment});

	console.log("deployed & configured UNIUSDTLPGauge");

	const BALETHLPEmissionRate = "15058380767707";
	let BALETHLPGauge = await deployer.deploy(LPGauge, contracts["STACK"], contracts["BALETHLP"], BALETHLPEmissionRate, {from: deployment});
	contracts["BALETHLPGauge"] = BALETHLPGauge.address;
	await stackToken.addMinter(contracts["BALETHLPGauge"], {from: deployment});

	console.log("deployed & configured BALETHLPGauge");

	console.log("DEPLOYED & CONFIGURED ALL LP GAUGES");

	console.log("writing all contract addresses to file...");
	console.log(contracts);
	fs.writeFileSync("./contracts-distribution.json", JSON.stringify(contracts), 'utf-8');
}