// RECOMMEND TESTING WITH:
// ganache-cli -a 200 -e 1000 -p 7545 -i 5777

const FarmTreasuryV1 = artifacts.require("FarmTreasuryV1");
const MintableToken = artifacts.require("MintableToken");
const FarmBossV1_TEST = artifacts.require("FarmBossV1_TEST");
const GaugeD2 = artifacts.require("GaugeD2_configurable");

contract("test GaugeD2", async (accounts) => {

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
		return await MintableToken.new(6, {from: FARMER});
	}

	async function _initTreasury(_underlyingInstance){
		return await FarmTreasuryV1.new("TEST", 6, _underlyingInstance.address, {from: FARMER});
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

	async function _makeFirstGaugeDeposit(_treasuryInstance, _gaugeInstance, _depositAmt){
		await _treasuryInstance.approve(_gaugeInstance.address, _depositAmt, {from: USER});
		await _gaugeInstance.deposit(_depositAmt, {from: USER});
	}

	async function _initSTACK(){
		return await MintableToken.new(18, {from: FARMER});
	}

	async function _initGaugeD2(_treasury, _STACK){
		return await GaugeD2.new(GOVERNANCE, _treasury, _STACK, {from: FARMER});
	}

	async function _increasetime(_time){
		await web3.currentProvider.send({jsonrpc: '2.0', method: 'evm_increaseTime', params: [_time], id: new Date().getTime()}, (error, response) => {if (error){console.log(error)}});
		await web3.currentProvider.send({jsonrpc: '2.0', method: 'evm_mine', id: new Date().getTime()}, (error, response) => {if (error){console.log(error)}});
	}

	async function _zeroFees(_treasuryInstance){
		await _treasuryInstance.setFeeDistribution(0,0,0,0, {from: GOVERNANCE});
	}

	it("should init everything, and check init state", async () => {
		let _underlying = await _initUnderlying();
		let _treasury = await _initTreasury(_underlying);
		let _farmboss = await _initFarmBoss(_underlying, _treasury);
		let _STACK = await _initSTACK();
		let _gauge = await _initGaugeD2(_treasury.address, _STACK.address);

		// const _depositAmt = 100*1e6;
		// await _makeFirstDeposit(_underlying, _treasury, _depositAmt);

		assert.equal("gauge-stackTEST", (await _gauge.symbol()).toString());
		assert.equal(_STACK.address, (await _gauge.STACK()).toString());
		assert.equal(_treasury.address, (await _gauge.acceptToken()).toString());
		assert.equal(GOVERNANCE, (await _gauge.governance()).toString());
	});

	it("should deposit, gauge-stackToken is minted proportionally, withdraw, back to zero", async () => {
		let _underlying = await _initUnderlying();
		let _treasury = await _initTreasury(_underlying);
		let _farmboss = await _initFarmBoss(_underlying, _treasury);
		let _STACK = await _initSTACK();
		let _gauge = await _initGaugeD2(_treasury.address, _STACK.address);

		const _depositAmt = 100*1e6;
		await _makeFirstDeposit(_underlying, _treasury, _depositAmt);
		await _increasetime(14*ONE_DAY);
		await _makeFirstGaugeDeposit(_treasury, _gauge, _depositAmt);

		assert.equal(_depositAmt.toString(), (await _treasury.balanceOf(_gauge.address)).toString());
		assert.equal(_depositAmt.toString(), (await _gauge.balanceOf(USER)).toString());
		assert.equal("0", (await _treasury.balanceOf(USER)).toString()); // tokens left farmer acct
		assert.equal(_depositAmt.toString(), (await _gauge.depositedShares()).toString());

		await _gauge.withdraw(_depositAmt, {from: USER});

		assert.equal(_depositAmt.toString(), (await _treasury.balanceOf(USER)).toString());
		assert.equal("0", (await _gauge.balanceOf(USER)).toString());
		assert.equal("0", (await _treasury.balanceOf(_gauge.address)).toString()); // tokens left gauge
		assert.equal("0", (await _gauge.depositedShares()).toString());
	});

	it("should deposit, gauge-stackToken minted, rebalanceUp, user has more gauge-stackToken", async () => {
		let _underlying = await _initUnderlying();
		let _treasury = await _initTreasury(_underlying);
		let _farmboss = await _initFarmBoss(_underlying, _treasury);
		let _STACK = await _initSTACK();
		let _gauge = await _initGaugeD2(_treasury.address, _STACK.address);

		const _depositAmt = 1000*1e6;
		await _makeFirstDeposit(_underlying, _treasury, _depositAmt);
		await _increasetime(14*ONE_DAY);
		await _makeFirstGaugeDeposit(_treasury, _gauge, _depositAmt);

		// now do a rebalance where the farmer makes a small profit
		await _zeroFees(_treasury); // make rebalanceUp calc more simple
		await _farmboss.rebalanceUp(0, FARMER_REWARDS, {from: FARMER});
		const _profitAmt = 1*1e6;
		await _underlying.mint(_farmboss.address, _profitAmt, {from: FARMER});
		await _farmboss.rebalanceUp(_profitAmt, FARMER_REWARDS, {from: FARMER});

		const _totalAmt = _depositAmt + _profitAmt;

		assert.equal(_totalAmt.toString(), (await _treasury.balanceOf(_gauge.address)).toString());
		assert.equal(_totalAmt.toString(), (await _gauge.balanceOf(USER)).toString());
		assert.equal("0", (await _treasury.balanceOf(USER)).toString());
		assert.equal(_depositAmt.toString(), (await _gauge.depositedShares()).toString()); // shares don't change

		await _gauge.withdraw(_totalAmt, {from: USER});

		assert.equal(_totalAmt.toString(), (await _treasury.balanceOf(USER)).toString());
		assert.equal("0", (await _gauge.balanceOf(USER)).toString());
		assert.equal("0", (await _treasury.balanceOf(_gauge.address)).toString());
	});


















});