// RECOMMEND TESTING WITH:
// ganache-cli -a 200 -e 1000 -p 7545 -i 5777

// NOTE: a lot of these tests deal with specific timing scenarios. If the tests fail, you can try to run again. Also, if they are off by very small amounts, it's possible that
// the blockchain has advanced by 1 second more than the test allows for, and will slightly change the calculations. However usually these tests do work!

const FarmTreasuryV1 = artifacts.require("FarmTreasuryV1");
const MintableToken = artifacts.require("MintableToken");
const FarmBossV1_TEST = artifacts.require("FarmBossV1_TEST");

contract("test FarmTreasuryV1", async (accounts) => {

	const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
	const TWENTYFOUR_HOURS = 24*60*60;
	const ONE_DAY = 24*60*60;
	const ONE_YEAR = 365*24*60*60;

	const FARMER = accounts[0];
	const GOVERNANCE = accounts[1];
	const USER = accounts[2];
	const FARMER_REWARDS = accounts[3];
	const USER_2 = accounts[4];
	const DAOMSIG = accounts[5];

	async function _initUnderlying(){
		return await MintableToken.new(6, {from: FARMER});
	}

	async function _initTreasury(_underlyingInstance){
		return await FarmTreasuryV1.new("TEST", 6, _underlyingInstance.address, {from: FARMER});
	}

	async function _initFarmBoss(_underlyingInstance, _treasuryInstance){
		let _farmboss = await FarmBossV1_TEST.new(GOVERNANCE, DAOMSIG, _treasuryInstance.address, _underlyingInstance.address, {from: FARMER});

		await _treasuryInstance.setFarmBoss(_farmboss.address, {from: FARMER});
		await _treasuryInstance.setGovernance(GOVERNANCE, {from: FARMER});

		return _farmboss;
	}

	async function _zeroFees(_treasuryInstance){
		await _treasuryInstance.setFeeDistribution(0,0,0,0, {from: GOVERNANCE});
	}

	async function _zeroAnnualFees(_treasuryInstance){
		await _treasuryInstance.setFeeDistribution(1000, 1000, 0, 0, {from: GOVERNANCE});
	}

	async function _zeroPerformanceFees(_treasuryInstance){
		await _treasuryInstance.setFeeDistribution(0, 0, 100, 100, {from: GOVERNANCE});
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

	it("should init treasury", async () => {
		let _underlying = await _initUnderlying();
		let _treasury = await _initTreasury(_underlying);

		assert.equal(await _treasury.governance(), FARMER); // will be set later, need config
		assert.equal(await _treasury.farmBoss(), ZERO_ADDR);
		assert.equal(await _treasury.underlyingContract(), _underlying.address);
	});

	it("should init treasury then farmboss", async () => {
		let _underlying = await _initUnderlying();
		let _treasury = await _initTreasury(_underlying);
		let _farmboss = await _initFarmBoss(_underlying, _treasury);

		assert.equal(await _treasury.governance(), GOVERNANCE);
		assert.equal(await _treasury.farmBoss(), _farmboss.address);
		assert.equal(await _farmboss.governance(), GOVERNANCE);
		assert.equal(await _farmboss.treasury(), _treasury.address);
		assert.equal(await _farmboss.underlying(), _underlying.address);
		assert(await _farmboss.farmers(FARMER));
	});

	it("should set fees to zero", async () => {
		let _underlying = await _initUnderlying();
		let _treasury = await _initTreasury(_underlying);
		let _farmboss = await _initFarmBoss(_underlying, _treasury);

		await _zeroFees(_treasury);

		assert.equal("0", (await _treasury.performanceToTreasury()).toString());
		assert.equal("0", (await _treasury.performanceToFarmer()).toString());
		assert.equal("0", (await _treasury.baseToTreasury()).toString());
		assert.equal("0", (await _treasury.baseToFarmer()).toString());
	});

	it("should deposit underlying into treasury", async () => {
		let _underlying = await _initUnderlying();
		let _treasury = await _initTreasury(_underlying);
		let _farmboss = await _initFarmBoss(_underlying, _treasury);

		const _depositAmt = 100*1e6;
		await _makeFirstDeposit(_underlying, _treasury, _depositAmt);

		assert.equal(_depositAmt.toString(), (await _underlying.balanceOf(_treasury.address)).toString()); // TEST in contract
		assert.equal(_depositAmt.toString(), (await _treasury.balanceOf(USER)).toString()); // stackTEST in user acct
		assert.equal(_depositAmt.toString(), (await _treasury.sharesOf(USER)).toString()); // mint shares 1:1 with first depo
		assert.equal(_depositAmt.toString(), (await _treasury.totalShares()).toString()); // total shares updated
		assert.equal(_depositAmt.toString(), (await _treasury.totalSupply()).toString()); // total supply updated
		assert.equal(_depositAmt.toString(), (await _treasury.userDeposits(USER)).amountUnderlyingLocked.toString()); // verify locktime is updated
	});

	it("should rebalance hot wallet to start farming", async () => {
		let _underlying = await _initUnderlying();
		let _treasury = await _initTreasury(_underlying);
		let _farmboss = await _initFarmBoss(_underlying, _treasury);

		await _zeroFees(_treasury);

		const _depositAmt = 100*1e6;
		await _makeFirstDeposit(_underlying, _treasury, _depositAmt);

		await _farmboss.rebalanceUp(0, FARMER_REWARDS, {from: FARMER}); // this should send 90% of the funds to the farmboss, and 10% in the hot wallet

		assert.equal((_depositAmt/10).toString(), (await _underlying.balanceOf(_treasury.address)).toString());
		assert.equal((_depositAmt*9/10).toString(), (await _underlying.balanceOf(_farmboss.address)).toString());
		assert.equal((_depositAmt*9/10).toString(), (await _treasury.ACTIVELY_FARMED()).toString());
		assert.equal(_depositAmt.toString(), (await _treasury.totalUnderlying()).toString());
	});

	it("should make a reward farming, and rebalance again, no fees", async () => {
		let _underlying = await _initUnderlying();
		let _treasury = await _initTreasury(_underlying);
		let _farmboss = await _initFarmBoss(_underlying, _treasury);

		await _zeroFees(_treasury);

		const _depositAmt = 100*1e6;
		await _makeFirstDeposit(_underlying, _treasury, _depositAmt);
		await _farmboss.rebalanceUp(0, FARMER_REWARDS, {from: FARMER}); // this should send 90% of the funds to the farmboss, and 10% in the hot wallet

		_increasetime(TWENTYFOUR_HOURS);

		const _profitAmt = _depositAmt/100;
		const _totalAmt = _depositAmt + _profitAmt;
		await _underlying.mint(_farmboss.address, _profitAmt, {from: FARMER}); // reward of 1e6 from 90 "farming" --> 1.11111...%

		// no need to inceasetime, because the first rebalance did not declare profit
		await _farmboss.rebalanceUp(_profitAmt, FARMER_REWARDS, {from: FARMER}); // this should send 90% of the funds to the farmboss, and 10% in the hot wallet

		// globals
		assert.equal((_totalAmt/10).toString(), (await _underlying.balanceOf(_treasury.address)).toString());
		assert.equal((_totalAmt*9/10).toString(), (await _underlying.balanceOf(_farmboss.address)).toString());
		assert.equal((_totalAmt*9/10).toString(), (await _treasury.ACTIVELY_FARMED()).toString());
		assert.equal(_totalAmt.toString(), (await _treasury.totalUnderlying()).toString());

		// users balances
		assert.equal(_totalAmt.toString(), (await _treasury.balanceOf(USER)).toString()); 
		assert.equal(_depositAmt.toString(), (await _treasury.sharesOf(USER)).toString()); // shares don't change
		assert.equal(_depositAmt.toString(), (await _treasury.totalShares()).toString()); // shares don't change
		assert.equal(_totalAmt.toString(), (await _treasury.totalSupply()).toString()); // total supply updated
	});

	it("should make a reward farming, and rebalance again, no annual fee, 10% & 10% perf", async () => {
		let _underlying = await _initUnderlying();
		let _treasury = await _initTreasury(_underlying);
		let _farmboss = await _initFarmBoss(_underlying, _treasury);

		_zeroAnnualFees(_treasury);

		const _depositAmt = 1000000*1e6; // 1M USDC
		await _makeFirstDeposit(_underlying, _treasury, _depositAmt);
		await _farmboss.rebalanceUp(0, FARMER_REWARDS, {from: FARMER}); // this should send 90% of the funds to the farmboss, and 10% in the hot wallet

		_increasetime(TWENTYFOUR_HOURS);

		const _profitAmt = _depositAmt/100;
		const _performanceAmt = _profitAmt/10;
		const _totalAmt = _depositAmt + _profitAmt;
		await _underlying.mint(_farmboss.address, _profitAmt, {from: FARMER});

		// no need to inceasetime, because the first rebalance did not declare profit
		await _farmboss.rebalanceUp(_profitAmt, FARMER_REWARDS, {from: FARMER}); // this should send 90% of the funds to the farmboss, and 10% in the hot wallet

		assert.equal((_totalAmt/10).toString(), (await _underlying.balanceOf(_treasury.address)).toString());
		assert.equal((_totalAmt*9/10).toString(), (await _underlying.balanceOf(_farmboss.address)).toString());
		assert.equal((_totalAmt*9/10).toString(), (await _treasury.ACTIVELY_FARMED()).toString());
		assert.equal(_totalAmt.toString(), (await _treasury.totalUnderlying()).toString());

		// user amount, total less fee*2
		const _userAmt = _totalAmt - _performanceAmt - _performanceAmt;
		assert.equal(_userAmt.toString(), (await _treasury.balanceOf(USER)).toString());
		assert.equal(_depositAmt.toString(), (await _treasury.sharesOf(USER)).toString()); // shares don't change
		console.log("total shares", (await _treasury.totalShares()).toString()); // shares DO change

		const _adjPerformanceAmt = _performanceAmt - 1; //////////////////// NOTE: sub 1 wei here, small rounding/trunaction discrepancy ////////////////////
		// farmer rewards and governance balances, both have 10% fee
		assert.equal(_adjPerformanceAmt.toString(), (await _treasury.balanceOf(FARMER_REWARDS)).toString());
		assert.equal(_adjPerformanceAmt.toString(), (await _treasury.balanceOf(GOVERNANCE)).toString());
		console.log("farmer rewards shares", (await _treasury.sharesOf(FARMER_REWARDS)).toString());
		console.log("gov shares", (await _treasury.sharesOf(GOVERNANCE)).toString());
	});

	it("should wait a year, and collect an annual fee of 2%, no performance fee", async () => {
		let _underlying = await _initUnderlying();
		let _treasury = await _initTreasury(_underlying);
		let _farmboss = await _initFarmBoss(_underlying, _treasury);

		_zeroPerformanceFees(_treasury);

		const _depositAmt = 77000000*1e6; // 77M USDC
		await _makeFirstDeposit(_underlying, _treasury, _depositAmt);

		await _farmboss.rebalanceUp(0, FARMER_REWARDS, {from: FARMER}); // this should send 90% of the funds to the farmboss, and 10% in the hot wallet

		console.log("total shares", (await _treasury.totalShares()).toString()); // shares DO change
		console.log("last rebalanceUp", (await _treasury.lastRebalanceUpTime()).toString());

		_increasetime(ONE_YEAR - 1); // minus one to make it exactly one year when we take fee... timing always a little weird for testing...
		await _underlying.mint(_farmboss.address, 1, {from: FARMER});
		await _farmboss.rebalanceUp(1, FARMER_REWARDS, {from: FARMER}); // no perfomance fee, profit 1 wei after year, just annual fee rewards -> farmer/gov

		console.log("total shares", (await _treasury.totalShares()).toString()); // shares DO change
		console.log("last rebalanceUp", (await _treasury.lastRebalanceUpTime()).toString());
		console.log("ONE_YEAR", ONE_YEAR.toString());

		const _feeAmt = _depositAmt/100 - 1; //////////////////// NOTE: sub 1 wei here, small rounding/trunaction discrepancy ////////////////////

		console.log("total shares", (await _treasury.totalShares()).toString()); // shares DO change
		console.log("farmer rewards shares", (await _treasury.sharesOf(FARMER_REWARDS)).toString());
		console.log("gov shares", (await _treasury.sharesOf(GOVERNANCE)).toString());

		console.log("farmer rewards bal", (await _treasury.balanceOf(FARMER_REWARDS)).toString());
		console.log("gov bal", (await _treasury.balanceOf(GOVERNANCE)).toString());

		assert.equal(_feeAmt.toString(), (await _treasury.balanceOf(FARMER_REWARDS)).toString());
		assert.equal(_feeAmt.toString(), (await _treasury.balanceOf(GOVERNANCE)).toString());
	});

	it("should deposit, check locktimes, then withdraw", async () => {
		let _underlying = await _initUnderlying();
		let _treasury = await _initTreasury(_underlying);
		let _farmboss = await _initFarmBoss(_underlying, _treasury);

		const _depositAmt = 14*1e6; // 14 USDC
		await _makeFirstDeposit(_underlying, _treasury, _depositAmt);

		assert.equal(_depositAmt.toString(), (await _treasury.getLockedAmount(USER)).toString());

		_increasetime(ONE_DAY);
		assert.equal((_depositAmt * 13 / 14).toString(), (await _treasury.getLockedAmount(USER)).toString());

		_increasetime(ONE_DAY * 6);
		assert.equal((_depositAmt * 7 / 14).toString(), (await _treasury.getLockedAmount(USER)).toString());

		_increasetime(ONE_DAY * 6);
		assert.equal((_depositAmt / 14).toString(), (await _treasury.getLockedAmount(USER)).toString());

		_increasetime(ONE_DAY);
		assert.equal("0", (await _treasury.getLockedAmount(USER)).toString());

		await _treasury.withdraw(_depositAmt, {from: USER});

		assert.equal("0", (await _underlying.balanceOf(_treasury.address)).toString()); // TEST in contract
		assert.equal("0", (await _treasury.balanceOf(USER)).toString()); // stackTEST in user acct
		assert.equal("0", (await _treasury.sharesOf(USER)).toString()); // mint shares 1:1 with first depo
		assert.equal("0", (await _treasury.totalShares()).toString()); // total shares updated
		assert.equal("0", (await _treasury.totalSupply()).toString()); // total supply updated
	});

	it("should deposit, wait a week, then deposit again, verify locktime is correct", async () => {
		let _underlying = await _initUnderlying();
		let _treasury = await _initTreasury(_underlying);
		let _farmboss = await _initFarmBoss(_underlying, _treasury);

		const _depositAmt = 1000*1e6; // 1000 USDC
		await _makeFirstDeposit(_underlying, _treasury, _depositAmt);

		assert.equal(_depositAmt.toString(), (await _treasury.getLockedAmount(USER)).toString());

		_increasetime(7 * ONE_DAY);
		await _makeFirstDeposit(_underlying, _treasury, _depositAmt);
		// deposit amount is _amt * (1/2 + 1)
		assert.equal((_depositAmt * 7 / 14 + _depositAmt).toString(), (await _treasury.getLockedAmount(USER)).toString());

		// however deposit lock time is more tricky. 1 week for 1/2 deposit + 2 week for full deposit means 7 days * 7 amt + 14 days * 14 amt = 21 amt * <11.6666666... days>
		let _depositData = await _treasury.userDeposits(USER);
		assert.equal(_depositData.timestampUnlocked.toNumber() - _depositData.timestampDeposit.toNumber(), 1008000); // 11.6666666... days
	});

	it("should transfer tokens & shares correctly", async () => {
		let _underlying = await _initUnderlying();
		let _treasury = await _initTreasury(_underlying);
		let _farmboss = await _initFarmBoss(_underlying, _treasury);

		const _depositAmt = 1000*1e6; // 1000 USDC
		await _makeFirstDeposit(_underlying, _treasury, _depositAmt);

		_increasetime(7 * ONE_DAY);

		await _treasury.transfer(USER_2, _depositAmt/2, {from: USER});
		assert.equal((_depositAmt/2).toString(), (await _treasury.balanceOf(USER)).toString());
		assert.equal((_depositAmt/2).toString(), (await _treasury.balanceOf(USER_2)).toString());

		assert.equal((_depositAmt/2).toString(), (await _treasury.sharesOf(USER)).toString());
		assert.equal((_depositAmt/2).toString(), (await _treasury.sharesOf(USER_2)).toString());
	});

	it("should approve and transferFrom tokens & shares correctly", async () => {
		let _underlying = await _initUnderlying();
		let _treasury = await _initTreasury(_underlying);
		let _farmboss = await _initFarmBoss(_underlying, _treasury);

		const _depositAmt = 1000*1e6; // 1000 USDC
		await _makeFirstDeposit(_underlying, _treasury, _depositAmt);

		_increasetime(14 * ONE_DAY);

		await _treasury.approve(GOVERNANCE, _depositAmt, {from: USER});
		assert.equal(_depositAmt.toString(), (await _treasury.allowance(USER, GOVERNANCE)).toString());

		await _treasury.transferFrom(USER, USER_2, _depositAmt, {from: GOVERNANCE});
		assert.equal("0", (await _treasury.allowance(USER, GOVERNANCE)).toString());
		assert.equal("0", (await _treasury.balanceOf(USER)).toString());
		assert.equal(_depositAmt.toString(), (await _treasury.balanceOf(USER_2)).toString());
	});

	it("should rebalanceDown and adjust balances correctly, shares same, ACTIVELY_FARMED not change (no rebal)", async () => {
		let _underlying = await _initUnderlying();
		let _treasury = await _initTreasury(_underlying);
		let _farmboss = await _initFarmBoss(_underlying, _treasury);

		const _depositAmt = 1000*1e6; // 1000 USDC
		await _makeFirstDeposit(_underlying, _treasury, _depositAmt);

		await _farmboss.rebalanceUp(0, FARMER_REWARDS, {from: FARMER}); // this should send 90% of the funds to the farmboss, and 10% in the hot wallet

		// farmer made a loss of 100 USDC, so we are at 900 USDC AUM now
		await _treasury.rebalanceDown(_depositAmt/10, false, {from: GOVERNANCE}); // don't rebalance hot
		assert.equal((_depositAmt * 9 / 10).toString(), (await _treasury.totalUnderlying()).toString());
		assert.equal((_depositAmt * 8 / 10).toString(), (await _treasury.ACTIVELY_FARMED()).toString());

		// check user
		assert.equal(_depositAmt.toString(), (await _treasury.sharesOf(USER)).toString()); // shares don't change
		assert.equal((_depositAmt * 9 / 10).toString(), (await _treasury.balanceOf(USER)).toString()); // balanceOf does change
	});

	it("should rebalanceDown and adjust balances correctly, shares same, ACTIVELY_FARMED changes (yes rebal)", async () => {
		let _underlying = await _initUnderlying();
		let _treasury = await _initTreasury(_underlying);
		let _farmboss = await _initFarmBoss(_underlying, _treasury);

		const _depositAmt = 1000*1e6; // 1000 USDC
		await _makeFirstDeposit(_underlying, _treasury, _depositAmt);

		await _farmboss.rebalanceUp(0, FARMER_REWARDS, {from: FARMER}); // this should send 90% of the funds to the farmboss, and 10% in the hot wallet

		// farmer made a loss of 100 USDC, so we are at 900 USDC AUM now
		await _treasury.rebalanceDown(_depositAmt/10, true, {from: GOVERNANCE}); // yes rebalance hot: 

		// 10% * 900 in hot == 90, 90% * 900 with farmer == 810
		assert.equal((_depositAmt * 9 / 10).toString(), (await _treasury.totalUnderlying()).toString());
		assert.equal((810*1e6).toString(), (await _treasury.ACTIVELY_FARMED()).toString());

		assert.equal(_depositAmt.toString(), (await _treasury.sharesOf(USER)).toString()); // shares don't change
		assert.equal((_depositAmt * 9 / 10).toString(), (await _treasury.balanceOf(USER)).toString()); // balanceOf does change
	});

	it ("should deposit, verify lock, then add to noLockWhitelist and verify no lock", async () => {
		let _underlying = await _initUnderlying();
		let _treasury = await _initTreasury(_underlying);
		let _farmboss = await _initFarmBoss(_underlying, _treasury);

		const _depositAmt = 1000*1e6; // 1000 USDC
		await _makeFirstDeposit(_underlying, _treasury, _depositAmt);

		assert.equal((1000*1e6).toString(), (await _treasury.getLockedAmount(USER)).toString());

		await _treasury.setNoLockWhitelist([USER], [true], {from: GOVERNANCE});

		assert.equal("0", (await _treasury.getLockedAmount(USER)).toString());
	});

});