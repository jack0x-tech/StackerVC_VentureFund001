// RECOMMEND TESTING WITH:
// ganache-cli -a 200 -e 1000 -p 7545 -i 5777

const FarmTreasuryV1_ETH = artifacts.require("FarmTreasuryV1_ETH");
const WrapETH = artifacts.require("WrapETH");
const FarmBossV1_TEST = artifacts.require("FarmBossV1_TEST");

contract("test FarmTreasuryV1_ETH for depositETH/withdrawETH", async (accounts) => {

	const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
	const SIX_HOURS = 6*60*60;
	const ONE_DAY = 24*60*60;
	const ONE_YEAR = 365*24*60*60;

	const FARMER = accounts[0];
	const GOVERNANCE = accounts[1];
	const USER = accounts[2];
	const FARMER_REWARDS = accounts[3];
	const USER_2 = accounts[4];

	async function _initUnderlying(){
		return await WrapETH.new({from: FARMER});
	}

	async function _initTreasury(_underlyingInstance){
		return await FarmTreasuryV1_ETH.new("TEST", 18, _underlyingInstance.address, {from: FARMER});
	}

	async function _initFarmBoss(_underlyingInstance, _treasuryInstance){
		let _farmboss = await FarmBossV1_TEST.new(GOVERNANCE, _treasuryInstance.address, _underlyingInstance.address, {from: FARMER});

		await _treasuryInstance.setFarmBoss(_farmboss.address, {from: FARMER});
		await _treasuryInstance.setGovernance(GOVERNANCE, {from: FARMER});

		return _farmboss;
	}

	async function _makeFirstDeposit(_underlyingInstance, _treasuryInstance, _depositAmt){
		// mint user Amt tokens, and then do deposit flow
		await _underlyingInstance.mint(USER, _depositAmt, {from: FARMER});
		await _underlyingInstance.approve(_treasuryInstance.address, _depositAmt, {from: USER});
		await _treasuryInstance.deposit(_depositAmt, ZERO_ADDR, {from: USER});
	}

	async function _increasetime(_time){
		await web3.currentProvider.send({jsonrpc: '2.0', method: 'evm_increaseTime', params: [_time], id: new Date().getTime()}, (error, response) => {if (error){console.log(error)}});
		await web3.currentProvider.send({jsonrpc: '2.0', method: 'evm_mine', id: new Date().getTime()}, (error, response) => {if (error){console.log(error)}});
	}

	it("should depositETH directly", async () => {
		let _underlying = await _initUnderlying();
		let _treasury = await _initTreasury(_underlying);
		let _farmboss = await _initFarmBoss(_underlying, _treasury);

		await _treasury.depositETH(USER_2, {from: USER, value: web3.utils.toWei("1", "ether")});
		assert.equal(web3.utils.toWei("1", "ether"), (await _treasury.balanceOf(USER)).toString());
		assert.equal(web3.utils.toWei("1", "ether"), (await _treasury.sharesOf(USER)).toString());

		await _treasury.sendTransaction({from: USER, value: web3.utils.toWei("10", "ether")});
		assert.equal(web3.utils.toWei("11", "ether"), (await _treasury.balanceOf(USER)).toString());
		assert.equal(web3.utils.toWei("11", "ether"), (await _treasury.sharesOf(USER)).toString());

	});

	it ("should depositETH then withdrawETH directly", async () => {
		let _underlying = await _initUnderlying();
		let _treasury = await _initTreasury(_underlying);
		let _farmboss = await _initFarmBoss(_underlying, _treasury);

		await _treasury.depositETH(USER_2, {from: USER, value: web3.utils.toWei("100", "ether")});
		assert.equal(web3.utils.toWei("100", "ether"), (await _treasury.balanceOf(USER)).toString());
		assert.equal(web3.utils.toWei("100", "ether"), (await _treasury.sharesOf(USER)).toString());

		await _increasetime(ONE_DAY * 14);

		console.log("ETH balance user", (await web3.eth.getBalance(USER)).toString());
		await _treasury.withdrawETH(web3.utils.toWei("100", "ether"), {from: USER});
		assert.equal("0", (await _treasury.balanceOf(USER)).toString());
		assert.equal("0", (await _treasury.sharesOf(USER)).toString());
		console.log("ETH balance user", (await web3.eth.getBalance(USER)).toString()); // just logging, should be ~100 ETH more minus gas
	});
});