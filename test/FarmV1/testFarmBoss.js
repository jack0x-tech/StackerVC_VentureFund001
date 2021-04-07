// RECOMMEND TESTING WITH:
// ganache-cli -a 200 -e 100000 -p 7545 -i 5777

const FarmTreasuryV1_ETH = artifacts.require("FarmTreasuryV1_ETH");
const WrapETH = artifacts.require("WrapETH");
const FarmBossV1_TEST = artifacts.require("FarmBossV1_TEST");

contract("test FarmBossV1", async (accounts) => {

	const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
	const FALLBACK_FN = "0xffffffff";
	const ONE_FN = "0x11111111";
	const SIX_HOURS = 6*60*60;
	const ONE_DAY = 24*60*60;
	const ONE_YEAR = 365*24*60*60;

	const FARMER = accounts[0];
	const GOVERNANCE = accounts[1];
	const USER = accounts[2];
	const FARMER_REWARDS = accounts[3];
	const USER_2 = accounts[4];
	const FARMER_2 = accounts[5];
	const DAOMSIG = accounts[6];

	const MAX_UINT256 = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

	async function _initUnderlying(){
		return await WrapETH.new({from: FARMER});
	}

	async function _initTreasury(_underlyingInstance){
		return await FarmTreasuryV1_ETH.new("TEST", 18, _underlyingInstance.address, {from: FARMER});
	}

	async function _initFarmBoss(_underlyingInstance, _treasuryInstance){
		let _farmboss = await FarmBossV1_TEST.new(GOVERNANCE, DAOMSIG, _treasuryInstance.address, _underlyingInstance.address, {from: FARMER});

		await _treasuryInstance.setFarmBoss(_farmboss.address, {from: FARMER});
		await _treasuryInstance.setGovernance(GOVERNANCE, {from: FARMER});

		return _farmboss;
	}

	it("should deploy farmboss and check init", async () => {
		let _underlying = await _initUnderlying();
		let _treasury = await _initTreasury(_underlying);
		let _farmboss = await _initFarmBoss(_underlying, _treasury);

		assert(await _farmboss.farmers(FARMER));
		assert.equal(GOVERNANCE, await _farmboss.governance());
		assert.equal(_treasury.address, await _farmboss.treasury());
		assert.equal(_underlying.address, await _farmboss.underlying());
	});

	it("should remove farmer and add farmer2", async () => {
		let _underlying = await _initUnderlying();
		let _treasury = await _initTreasury(_underlying);
		let _farmboss = await _initFarmBoss(_underlying, _treasury);

		await _farmboss.changeFarmers([FARMER_2], [FARMER], {from: GOVERNANCE});

		assert(! await _farmboss.farmers(FARMER));
		assert(await _farmboss.farmers(FARMER_2));
	});

	it("should emergency remove farmer from dao multisig", async () => {
		let _underlying = await _initUnderlying();
		let _treasury = await _initTreasury(_underlying);
		let _farmboss = await _initFarmBoss(_underlying, _treasury);

		await _farmboss.emergencyRemoveFarmers([FARMER], {from: DAOMSIG});

		assert(! await _farmboss.farmers(FARMER));
	});

	it("should add/remove whitelist", async () => {
		let _underlying = await _initUnderlying();
		let _treasury = await _initTreasury(_underlying);
		let _farmboss = await _initFarmBoss(_underlying, _treasury);

		await _farmboss.changeWhitelist([{account: USER, fnSig: FALLBACK_FN, valueAllowed: true}], [], [{token: _underlying.address, allow: USER}], [], {from: GOVERNANCE});

		assert.equal("2", (await _farmboss.getWhitelist(USER, FALLBACK_FN)).toString()); // 2 -> msg.value allowed
		assert.equal("0", (await _farmboss.getWhitelist(USER_2, FALLBACK_FN)).toString());
		assert.equal("0", (await _farmboss.getWhitelist(USER, ONE_FN)).toString());
		assert.equal(MAX_UINT256, (await _underlying.allowance(_farmboss.address, USER)).toString());

		await _farmboss.changeWhitelist([], [{account: USER, fnSig: FALLBACK_FN, valueAllowed: false}], [], [{token: _underlying.address, allow: USER}], {from: GOVERNANCE})
		assert.equal("0", (await _farmboss.getWhitelist(USER, FALLBACK_FN)).toString());
		assert.equal("0", (await _underlying.allowance(_farmboss.address, USER)).toString());

		// now test 1 -> msg.value NOT allowed
		await _farmboss.changeWhitelist([{account: USER, fnSig: FALLBACK_FN, valueAllowed: false}], [], [], [], {from: GOVERNANCE});

		assert.equal("1", (await _farmboss.getWhitelist(USER, FALLBACK_FN)).toString()); // 1 -> msg.value NOT allowed
	});

	it("should add, then emergency remove whitelist from dao multisig", async () => {
		let _underlying = await _initUnderlying();
		let _treasury = await _initTreasury(_underlying);
		let _farmboss = await _initFarmBoss(_underlying, _treasury);

		await _farmboss.changeWhitelist([{account: USER, fnSig: FALLBACK_FN, valueAllowed: true}], [], [{token: _underlying.address, allow: USER}], [], {from: GOVERNANCE});

		// emergency remove
		await _farmboss.emergencyRemoveWhitelist([{account: USER, fnSig: FALLBACK_FN, valueAllowed: false}], [{token: _underlying.address, allow: USER}], {from: DAOMSIG})
		assert.equal("0", (await _farmboss.getWhitelist(USER, FALLBACK_FN)).toString());
		assert.equal("0", (await _underlying.allowance(_farmboss.address, USER)).toString());
	});

	it("should add whitelist, then allow farmer execute", async () => {
		let _underlying = await _initUnderlying();
		let _treasury = await _initTreasury(_underlying);
		let _farmboss = await _initFarmBoss(_underlying, _treasury);

		const depositWETH = "0xd0e30db0";
		const withdrawWETH = "0x2e1a7d4d";
		const withdrawWETH_1_data = "0000000000000000000000000000000000000000000000000de0b6b3a7640000";

		// add deposit/withdraw WETH, ETH send to user, WETH approve to USER 
		await _farmboss.changeWhitelist([{account: _underlying.address, fnSig: depositWETH, valueAllowed: true},{account: _underlying.address, fnSig: withdrawWETH, valueAllowed: false},{account: USER_2, fnSig: FALLBACK_FN, valueAllowed: true}], [], [{token: _underlying.address, allow: USER}], [], {from: GOVERNANCE});

		// DEPOSIT / WITHDRAW WETH

		// send some ETH to contract
		await _farmboss.sendTransaction({from: FARMER, value: web3.utils.toWei("1","ether")});
		console.log("sent 1 ETH");
		assert.equal(web3.utils.toWei("1","ether"), (await web3.eth.getBalance(_farmboss.address)).toString());

		// have contract deposit into WrapETH
		await _farmboss.farmerExecute(_underlying.address, web3.utils.toWei("1","ether"), depositWETH, {from: FARMER});
		assert.equal(web3.utils.toWei("1","ether"), (await _underlying.balanceOf(_farmboss.address)).toString());

		// have contract withdraw from WrapETH
		await _farmboss.farmerExecute(_underlying.address, "0", withdrawWETH + withdrawWETH_1_data, {from: FARMER});
		assert.equal("0", (await _underlying.balanceOf(_farmboss.address)).toString());
		assert.equal(web3.utils.toWei("1","ether"), (await web3.eth.getBalance(_farmboss.address)).toString());

		// user transferFrom after approval

		// have contract deposit into WrapETH again
		await _farmboss.farmerExecute(_underlying.address, web3.utils.toWei("1","ether"), depositWETH, {from: FARMER});
		assert.equal(web3.utils.toWei("1","ether"), (await _underlying.balanceOf(_farmboss.address)).toString());

		// transfer from -> user_2 using user
		await _underlying.transferFrom(_farmboss.address, USER_2, web3.utils.toWei("1","ether"), {from: USER});
		assert.equal("0", (await _underlying.balanceOf(_farmboss.address)).toString());
		assert.equal(web3.utils.toWei("1","ether"), (await _underlying.balanceOf(USER_2)).toString());

		// send some ETH to contract again
		await _farmboss.sendTransaction({from: FARMER, value: web3.utils.toWei("5","ether")});

		// have farmer send ETH to user
		await _farmboss.farmerExecute(USER_2, web3.utils.toWei("1","ether"), FALLBACK_FN, {from: FARMER});
		// if this line fails, restart ganache-cli with the right settings (top)
		assert.equal(web3.utils.toWei("100001", "ether"), (await web3.eth.getBalance(USER_2)).toString()); // 1000 + 1 because of ganache-cli settings above

		// have governance send ETH to user 
		await _farmboss.govExecute(USER_2, web3.utils.toWei("1","ether"), "0x", {from: GOVERNANCE}); // this also is fallback ONLY for gov
		assert.equal(web3.utils.toWei("100002", "ether"), (await web3.eth.getBalance(USER_2)).toString());

		// have governance send ETH to user 
		await _farmboss.govExecute(USER_2, web3.utils.toWei("1","ether"), FALLBACK_FN, {from: GOVERNANCE}); // also works as fallback for gov
		assert.equal(web3.utils.toWei("100003", "ether"), (await web3.eth.getBalance(USER_2)).toString());

		// have farmer send ETH to user with bad call data
		await _farmboss.farmerExecute(USER_2, web3.utils.toWei("1","ether"), "0x", {from: FARMER});
		assert.equal(web3.utils.toWei("100004", "ether"), (await web3.eth.getBalance(USER_2)).toString());
	});
});