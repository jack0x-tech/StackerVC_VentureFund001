const Web3 = require("web3");
const web3 = new Web3('http://localhost:7545');
const fs = require("fs");

const STACKToken = artifacts.require("./Token/STACKToken.sol");
const VaultGaugeBridge = artifacts.require("./Token/VaultGaugeBridge.sol");
const GaugeD1 = artifacts.require("./Token/GaugeD1.sol");
const LPGauge = artifacts.require("./Token/LPGauge.sol");

module.exports = async function (deployer) {

	let contracts = {};

	let accounts = await web3.eth.getAccounts();
	const deployment = accounts[0];
	const rewards = accounts[1];
	const user = accounts[2];
	const vcHolding = accounts[3];

	let currentBlock = (await web3.eth.getBlock("latest")).number;
	console.log("current block number:", currentBlock);

	// deploy STACK contract
	let stackToken = await deployer.deploy(STACKToken, {from: deployment});
	contracts["STACK"] = stackToken.address;

	// deploy vaultgauge bridge contract
	let vaultGaugeBridge = await deployer.deploy(VaultGaugeBridge, {from: deployment});
	contracts["VaultGaugeBridge"] = vaultGaugeBridge.address;

	contracts["yUSDVault"] = "0x5dbcF33D8c2E976c6b560249878e6F1491Bca25c";
	contracts["yDAIVault"] = "0xacd43e627e64355f1861cec6d3a6688b31a6f952";
	contracts["yUSDCVault"] = "0x597ad1e0c13bfe8025993d9e79c69e1c0233522e";
	contracts["yUSDTVault"] = "0x2f08119c6f07c006695e079aafc638b8789faf18";
	contracts["yTUSDVault"] = "0x37d19d1c4e1fa9dc47bd1ea12f742a0887eda74a";
	contracts["yGUSDVault"] = "0xec0d8d3ed5477106c6d4ea27d90a60e594693c90";
	contracts["yETHVault"] = "0xe1237aa7f535b0cc33fd973d66cbf830354d16c7";
	contracts["yBTCVault"] = "0x7ff566e1d69deff32a7b244ae7276b9f90e9d0f6";
	contracts["yYFIVault"] = "0xba2e7fed597fd0e3e70f5130bcdbbfe06bb94fe1";

	contracts["renBTC"] = "0xeb4c2781e4eba804ce9a9803c67d0893436bb27d";
	contracts["WBTC"] = "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599";
	contracts["LINK"] = "0x514910771af9ca656af840dff83e8264ecf986ca";
	contracts["UNI"] = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";
	contracts["MKR"] = "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2";
	contracts["COMP"] = "0xc00e94cb662c3520282e6f5717214004a7f26888";
	contracts["AAVE"] = "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9";

	// yToken underlying
	contracts["crvYPool"] = "0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8"; // yUSD underlying
	contracts["DAI"] = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
	contracts["USDC"] = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
	contracts["USDT"] = "0xdac17f958d2ee523a2206206994597c13d831ec7";
	contracts["TUSD"] = "0x0000000000085d4780b73119b644ae5ecd22b376";
	contracts["GUSD"] = "0x056fd409e1d7a124bd7017459dfea2f387b6d5cd";
	contracts["WETH"] = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; //yETH underlying
	contracts["crvBTC"] = "0x075b1bb99792c9e1041ba13afef80c91a1e70fb3";
	contracts["YFI"] = "0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e";

	contracts["WETH"] = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

	// now deploy all Gauge contracts ...
	const yUSDEmissionRate = "92878372199360"; // per block rate
	let yUSDGauge = await deployer.deploy(GaugeD1, vcHolding, contracts["STACK"], contracts["yUSDVault"], contracts["VaultGaugeBridge"], yUSDEmissionRate, {from: deployment});
	contracts["yUSDGauge"] = yUSDGauge.address;
	await vaultGaugeBridge.newBridge(contracts["yUSDVault"], contracts["yUSDGauge"], {from: deployment});
	await stackToken.addMinter(contracts["yUSDGauge"], {from: deployment});

	console.log("deployed & configured yUSDGauge");

	const yDAIEmissionRate = "148605395518976";
	let yDAIGauge = await deployer.deploy(GaugeD1, vcHolding, contracts["STACK"], contracts["yDAIVault"], contracts["VaultGaugeBridge"], yDAIEmissionRate, {from: deployment});
	contracts["yDAIGauge"] = yDAIGauge.address;
	await vaultGaugeBridge.newBridge(contracts["yDAIVault"], contracts["yDAIGauge"], {from: deployment});
	await stackToken.addMinter(contracts["yDAIGauge"], {from: deployment});

	console.log("deployed & configured yDAIGauge");

	const yUSDCEmissionRate = "130029721079104";
	let yUSDCGauge = await deployer.deploy(GaugeD1, vcHolding, contracts["STACK"], contracts["yUSDCVault"], contracts["VaultGaugeBridge"], yUSDCEmissionRate, {from: deployment});
	contracts["yUSDCGauge"] = yUSDCGauge.address;
	await vaultGaugeBridge.newBridge(contracts["yUSDCVault"], contracts["yUSDCGauge"], {from: deployment});
	await stackToken.addMinter(contracts["yUSDCGauge"], {from: deployment});

	console.log("deployed & configured yUSDCGauge");

	const yUSDTEmissionRate = "148605395518976";
	let yUSDTGauge = await deployer.deploy(GaugeD1, vcHolding, contracts["STACK"], contracts["yUSDTVault"], contracts["VaultGaugeBridge"], yUSDTEmissionRate, {from: deployment});
	contracts["yUSDTGauge"] = yUSDTGauge.address;
	await vaultGaugeBridge.newBridge(contracts["yUSDTVault"], contracts["yUSDTGauge"], {from: deployment});
	await stackToken.addMinter(contracts["yUSDTGauge"], {from: deployment});

	console.log("deployed & configured yUSDTGauge");

	const yTUSDEmissionRate = "18575674439872";
	let yTUSDGauge = await deployer.deploy(GaugeD1, vcHolding, contracts["STACK"], contracts["yTUSDVault"], contracts["VaultGaugeBridge"], yTUSDEmissionRate, {from: deployment});
	contracts["yTUSDGauge"] = yTUSDGauge.address;
	await vaultGaugeBridge.newBridge(contracts["yTUSDVault"], contracts["yTUSDGauge"], {from: deployment});
	await stackToken.addMinter(contracts["yTUSDGauge"], {from: deployment});

	console.log("deployed & configured yTUSDGauge");

	const yGUSDEmissionRate = "18575674439872";
	let yGUSDGauge = await deployer.deploy(GaugeD1, vcHolding, contracts["STACK"], contracts["yGUSDVault"], contracts["VaultGaugeBridge"], yGUSDEmissionRate, {from: deployment});
	contracts["yGUSDGauge"] = yGUSDGauge.address;
	await vaultGaugeBridge.newBridge(contracts["yGUSDVault"], contracts["yGUSDGauge"], {from: deployment});
	await stackToken.addMinter(contracts["yGUSDGauge"], {from: deployment});

	console.log("deployed & configured yGUSDGauge");

	const yETHEmissionRate = "557270233196159";
	let yETHGauge = await deployer.deploy(GaugeD1, vcHolding, contracts["STACK"], contracts["yETHVault"], contracts["VaultGaugeBridge"], yETHEmissionRate, {from: deployment});
	contracts["yETHGauge"] = yETHGauge.address;
	await vaultGaugeBridge.newBridge(contracts["yETHVault"], contracts["yETHGauge"], {from: deployment});
	await stackToken.addMinter(contracts["yETHGauge"], {from: deployment});

	console.log("deployed & configured yETHGauge");

	const yBTCEmissionRate = "92878372199360";
	let yBTCGauge = await deployer.deploy(GaugeD1, vcHolding, contracts["STACK"], contracts["yBTCVault"], contracts["VaultGaugeBridge"], yBTCEmissionRate, {from: deployment});
	contracts["yBTCGauge"] = yBTCGauge.address;
	await vaultGaugeBridge.newBridge(contracts["yBTCVault"], contracts["yBTCGauge"], {from: deployment});
	await stackToken.addMinter(contracts["yBTCGauge"], {from: deployment});

	console.log("deployed & configured yBTCGauge");

	const yYFIEmissionRate = "185756744398720";
	let yYFIGauge = await deployer.deploy(GaugeD1, vcHolding, contracts["STACK"], contracts["yYFIVault"], contracts["VaultGaugeBridge"], yYFIEmissionRate, {from: deployment});
	contracts["yYFIGauge"] = yYFIGauge.address;
	await vaultGaugeBridge.newBridge(contracts["yYFIVault"], contracts["yYFIGauge"], {from: deployment});
	await stackToken.addMinter(contracts["yYFIGauge"], {from: deployment});

	console.log("deployed & configured yYFIGauge");

	const renBTCEmissionRate = "185756744398720";
	let renBTCGauge = await deployer.deploy(GaugeD1, vcHolding, contracts["STACK"], contracts["renBTC"], contracts["VaultGaugeBridge"], renBTCEmissionRate, {from: deployment});
	contracts["renBTCGauge"] = renBTCGauge.address;
	await stackToken.addMinter(contracts["renBTCGauge"], {from: deployment});

	console.log("deployed & configured renBTCGauge");

	const WBTCEmissionRate = "148605395518976";
	let WBTCGauge = await deployer.deploy(GaugeD1, vcHolding, contracts["STACK"], contracts["WBTC"], contracts["VaultGaugeBridge"], WBTCEmissionRate, {from: deployment});
	contracts["WBTCGauge"] = WBTCGauge.address;
	await stackToken.addMinter(contracts["WBTCGauge"], {from: deployment});

	console.log("deployed & configured WBTCGauge");

	const LINKEmissionRate = "55727023319616";
	let LINKGauge = await deployer.deploy(GaugeD1, vcHolding, contracts["STACK"], contracts["LINK"], contracts["VaultGaugeBridge"], LINKEmissionRate, {from: deployment});
	contracts["LINKGauge"] = LINKGauge.address;
	await stackToken.addMinter(contracts["LINKGauge"], {from: deployment});

	console.log("deployed & configured LINKGauge");

	const UNIEmissionRate = "18575674439872";
	let UNIGauge = await deployer.deploy(GaugeD1, vcHolding, contracts["STACK"], contracts["UNI"], contracts["VaultGaugeBridge"], UNIEmissionRate, {from: deployment});
	contracts["UNIGauge"] = UNIGauge.address;
	await stackToken.addMinter(contracts["UNIGauge"], {from: deployment});

	console.log("deployed & configured UNIGauge");

	const MKREmissionRate = "18575674439872";
	let MKRGauge = await deployer.deploy(GaugeD1, vcHolding, contracts["STACK"], contracts["MKR"], contracts["VaultGaugeBridge"], MKREmissionRate, {from: deployment});
	contracts["MKRGauge"] = MKRGauge.address;
	await stackToken.addMinter(contracts["MKRGauge"], {from: deployment});

	console.log("deployed & configured MKRGauge");

	const COMPEmissionRate = "18575674439872";
	let COMPGauge = await deployer.deploy(GaugeD1, vcHolding, contracts["STACK"], contracts["COMP"], contracts["VaultGaugeBridge"], COMPEmissionRate, {from: deployment});
	contracts["COMPGauge"] = COMPGauge.address;
	await stackToken.addMinter(contracts["COMPGauge"], {from: deployment});

	console.log("deployed & configured COMPGauge");

	const AAVEEmissionRate = "18575674439872";
	let AAVEGauge = await deployer.deploy(GaugeD1, vcHolding, contracts["STACK"], contracts["AAVE"], contracts["VaultGaugeBridge"], AAVEEmissionRate, {from: deployment});
	contracts["AAVEGauge"] = AAVEGauge.address;
	await stackToken.addMinter(contracts["AAVEGauge"], {from: deployment});

	console.log("deployed & configured AAVEGauge");

	console.log("DEPLOYED & CONFIGURED ALL DISTRIBUTION 1 GAUGES");

	console.log("writing all contract addresses to file...");
	console.log(contracts);
	fs.writeFileSync("./contracts-integration-test.json", JSON.stringify(contracts), 'utf-8');
}
