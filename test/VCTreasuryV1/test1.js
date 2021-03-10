// RECOMMEND TESTING WITH:
// ganache-cli -a 10 -e 1000 -p 7545 -i 5777


const VCTreasuryV1 = artifacts.require("VCTreasuryV1");
const MintableToken = artifacts.require("MintableToken");
const BN = require('bn.js');
const tassert = require('truffle-assertions');

const ONE_YEAR = 31536000;
const THREE_DAYS = 259200;
const ONE_DAY = 86400;
const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

contract("test treasury setup", async (accounts) => {

	async function _init(){
		return await VCTreasuryV1.new(accounts[5], accounts[6], {from: accounts[0]})
	}

	it("should init contract", async () => {
		let instance = await _init();

		assert.equal(await instance.deployer(), accounts[0]);
		assert.equal(await instance.councilMultisig(), accounts[5]);
		assert.equal(await instance.treasury(), accounts[6]);

		assert.equal((await instance.currentState()).toString(), "0");
	});

	it("should setCouncilMultisig", async () => {
		let instance = await _init();

		await instance.setCouncilMultisig(accounts[7], {from: accounts[5]});

		assert.equal(await instance.councilMultisig(), accounts[7]);
	});

	it("should setDeployer", async () => {
		let instance = await _init();

		await instance.setDeployer(accounts[7], {from: accounts[0]});
		assert.equal(await instance.deployer(), accounts[7]);

		await instance.setDeployer(accounts[8], {from: accounts[5]});
		assert.equal(await instance.deployer(), accounts[8]);
	});

	it("should setTreasury", async () => {
		let instance = await _init();

		await instance.setTreasury(accounts[7], {from: accounts[5]});
		assert.equal(await instance.treasury(), accounts[7]);

		await instance.setTreasury(accounts[8], {from: accounts[7]});
		assert.equal(await instance.treasury(), accounts[8]);
	});

	it("should setBoughtToken", async () => {
		let instance = await _init();

		await instance.setBoughtToken(accounts[9], {from: accounts[5]});
		assert(await instance.getBoughtToken(accounts[9]));
	});

	it("should issueTokens 100x", async () => {
		let instance = await _init();

		let accts1 = [];
		let amts1 = [];
		for (let i = 100; i < 150; i++){
			accts1.push(accounts[i]);
			amts1.push(web3.utils.toWei("1", "ether"));
		}

		let accts2 = [];
		let amts2 = [];
		for (let i = 150; i < 200; i++){
			accts2.push(accounts[i]);
			amts2.push(web3.utils.toWei("2", "ether"));
		}

		await instance.issueTokens(accts1, amts1, {from: accounts[0]});
		await instance.issueTokens(accts2, amts2, {from: accounts[0]});

		assert.equal((await instance.totalSupply()).toString(), web3.utils.toWei("150", "ether"));
		assert.equal((await instance.balanceOf(accounts[111])).toString(), web3.utils.toWei("1", "ether"));
		assert.equal((await instance.balanceOf(accounts[166])).toString(), web3.utils.toWei("2", "ether"));
	});

	async function _issueTokens(instance){
		instance.issueTokens([accounts[100], accounts[101], accounts[102]], [web3.utils.toWei("2", "ether"), web3.utils.toWei("2", "ether"), web3.utils.toWei("1", "ether")]);
	}

	async function _startFund(instance){
		instance.startFund({value: web3.utils.toWei("50", "ether"), from: accounts[5]});
	}

	it("should issueTokens & startFund", async () => {
		let instance = await _init();
		await _issueTokens(instance);

		assert.equal((await instance.totalSupply()).toString(), web3.utils.toWei("5", "ether"));
		assert.equal((await instance.balanceOf(accounts[100])).toString(), web3.utils.toWei("2", "ether"));
		assert.equal((await instance.balanceOf(accounts[101])).toString(), web3.utils.toWei("2", "ether"));
		assert.equal((await instance.balanceOf(accounts[102])).toString(), web3.utils.toWei("1", "ether"));

		// init fund with 3 token holders, 5 SVC001 tokens total
		// 50 ETH to start the fund
		await _startFund(instance);

		console.log("fund start time:", (await instance.fundStartTime()).toString());
		console.log("fund end time:", (await instance.fundCloseTime()).toString());

		assert.equal((await instance.initETH()).toString(), web3.utils.toWei("50", "ether"));
		assert.equal((await instance.maxInvestment()).toString(), web3.utils.toWei("10", "ether"));
		assert.equal((await instance.currentState()).toString(), "1");
		assert.equal((await instance.availableToInvest()).toString(), web3.utils.toWei("10", "ether"));
	});

	it("should stakeToPause & paused & unstakeToPause & active", async () => {
		let instance = await _init();
		await _issueTokens(instance);
		await _startFund(instance);

		// if user 100 stakes to pause, that's 2/5 = 40% > pause quorum
		await instance.stakeToPause(web3.utils.toWei("2", "ether"), {from: accounts[100]});
		assert.equal((await instance.currentState()).toString(), "2"); // paused state
		assert.equal((await instance.getStakedToPause(accounts[100])).toString(), web3.utils.toWei("2", "ether"));
		assert.equal((await instance.totalStakedToPause()).toString(), web3.utils.toWei("2", "ether"));

		await instance.unstakeToPause(web3.utils.toWei("2", "ether"), {from: accounts[100]});
		assert.equal((await instance.currentState()).toString(), "1");
		assert.equal((await instance.getStakedToPause(accounts[100])).toString(), "0");
		assert.equal((await instance.totalStakedToPause()).toString(), "0");
	});

	it("should stakeToKill & closed & killed & unstakeToKill", async () => {
		let instance = await _init();
		await _issueTokens(instance);
		await _startFund(instance);

		await instance.stakeToKill(web3.utils.toWei("2", "ether"), {from: accounts[100]});
		assert.equal((await instance.currentState()).toString(), "2"); // paused state
		assert.equal((await instance.getStakedToKill(accounts[100])).toString(), web3.utils.toWei("2", "ether"));
		assert.equal((await instance.totalStakedToKill()).toString(), web3.utils.toWei("2", "ether"));

		await instance.stakeToKill(web3.utils.toWei("1", "ether"), {from: accounts[102]});
		assert.equal((await instance.currentState()).toString(), "3"); // closed state
		assert(await instance.killed()); // killed maliciously
		assert.equal((await instance.getStakedToKill(accounts[102])).toString(), web3.utils.toWei("1", "ether"));
		assert.equal((await instance.totalStakedToKill()).toString(), web3.utils.toWei("3", "ether"));

		await instance.unstakeToKill(web3.utils.toWei("1", "ether"), {from: accounts[100]});
		assert.equal((await instance.currentState()).toString(), "3"); // closed state
		assert(await instance.killed()); // killed maliciously
		assert.equal((await instance.getStakedToKill(accounts[100])).toString(), web3.utils.toWei("1", "ether"));
		assert.equal((await instance.totalStakedToKill()).toString(), web3.utils.toWei("2", "ether"));

		await instance.unstakeToKill(web3.utils.toWei("1", "ether"), {from: accounts[102]});
		assert.equal((await instance.currentState()).toString(), "3"); // closed state
		assert(await instance.killed()); // killed maliciously
		assert.equal((await instance.getStakedToKill(accounts[102])).toString(), "0");
		assert.equal((await instance.totalStakedToKill()).toString(), web3.utils.toWei("1", "ether"));

		await instance.unstakeToKill(web3.utils.toWei("1", "ether"), {from: accounts[100]});
		assert.equal((await instance.currentState()).toString(), "3"); // closed state
		assert(await instance.killed()); // killed maliciously
		assert.equal((await instance.getStakedToKill(accounts[100])).toString(), "0");
		assert.equal((await instance.totalStakedToKill()).toString(), "0");
	});

	it("should stakeToPause & stakeToKill & paused", async () => {
		let instance = await _init();
		await _issueTokens(instance);
		await _startFund(instance);

		await instance.stakeToKill(web3.utils.toWei("1", "ether"), {from: accounts[100]});
		await instance.stakeToPause(web3.utils.toWei("1", "ether"), {from: accounts[100]});
		assert.equal((await instance.currentState()).toString(), "2"); // paused state
		assert.equal((await instance.getStakedToKill(accounts[100])).toString(), web3.utils.toWei("1", "ether"));
		assert.equal((await instance.getStakedToPause(accounts[100])).toString(), web3.utils.toWei("1", "ether"));
		assert.equal((await instance.totalStakedToKill()).toString(), web3.utils.toWei("1", "ether"));
		assert.equal((await instance.totalStakedToPause()).toString(), web3.utils.toWei("1", "ether"));
	});

	async function _increasetime(_time){
		await web3.currentProvider.send({jsonrpc: '2.0', method: 'evm_increaseTime', params: [_time], id: new Date().getTime()}, (error, response) => {if (error){console.log(error)}});
		await web3.currentProvider.send({jsonrpc: '2.0', method: 'evm_mine', id: new Date().getTime()}, (error, response) => {if (error){console.log(error)}});
	}

	it("should fast-forward 1 year and close fund, redeem ETH for SVC001 tokens", async () => {
		let instance = await _init();
		await _issueTokens(instance);
		await _startFund(instance);

		console.log("now:", (await web3.eth.getBlock("latest")).timestamp.toString());
		console.log("fund end time:", (await instance.fundCloseTime()).toString());

		// increase time by 1 year
		await _increasetime(ONE_YEAR);

		console.log("now:", (await web3.eth.getBlock("latest")).timestamp.toString());

		assert.equal((await instance.currentState()).toString(), "1"); // open state
		await instance.checkCloseTime({from: accounts[2]});
		assert.equal((await instance.currentState()).toString(), "3"); // closed state

		// since the fund was closed non-maliciously, there is a 5% fee
		// this means that 5*1.05 = 5.25 SVC001 tokens exist
		assert.equal((await instance.balanceOf(accounts[5])).toString(), web3.utils.toWei("0.125", "ether"));
		assert.equal((await instance.balanceOf(accounts[6])).toString(), web3.utils.toWei("0.125", "ether"));
		assert.equal((await instance.totalSupply()).toString(), web3.utils.toWei("5.25", "ether"));

		assert.equal((await web3.eth.getBalance(instance.address)).toString(), web3.utils.toWei("50", "ether"));
		await instance.claim([], {from: accounts[100]});
		// the user was sent 50e18 * (2/5.25) eth, so >>> python int(50e18-(50e18*2/5.25)) = 30952380952380952576 remaining
		console.log((await web3.eth.getBalance(instance.address)).toString(), "vs.", "30952380952380952576", "<-- difference from rounding, 176 wei");
		assert.equal((await web3.eth.getBalance(instance.address)).toString(), "30952380952380952400");

		assert.equal((await instance.balanceOf(accounts[100])).toString(), "0");
		assert.equal((await instance.totalSupply()).toString(), web3.utils.toWei("3.25", "ether"));
	});

	// init a generic token, and mint _amount to _address
	async function _inittoken(_address, _amount){
		let token = await MintableToken.new({from: accounts[0]});
		await token.mint(_address, _amount, {from: accounts[0]});

		return token;
	}

	it("should open fund, and make a 10 eth investment into a token", async () => {
		let instance = await _init();
		await _issueTokens(instance);
		await _startFund(instance);

		let token = await _inittoken(accounts[1], web3.utils.toWei("100", "ether"));

		await instance.investPropose(token.address, web3.utils.toWei("100", "ether"), web3.utils.toWei("10", "ether"), accounts[1], {from: accounts[5]}); // buy 100 token for 10 eth
		// assert.equal((await instance.availableToInvest()).toString(), "0"); // issue with some small seconds passed

		assert.equal((await instance.nextBuyId()).toString(), "1");

		let _buy = await instance.currentBuyProposal();
		assert.equal(_buy.buyId.toString(), "0");
		assert.equal(_buy.tokenAccept, token.address);
		assert.equal(_buy.amountInMin.toString(), web3.utils.toWei("100", "ether"));
		assert.equal(_buy.ethOut.toString(), web3.utils.toWei("10", "ether"));
		assert.equal(_buy.taker, accounts[1]);
		console.log("now:", (await web3.eth.getBlock("latest")).timestamp.toString()); // check the maxTime via printouts (time based)
		console.log("maxTime:", _buy.maxTime.toString());
		console.log("approxDiff:", THREE_DAYS.toString());

		// now accept the proposal from _taker account
		await token.approve(instance.address, web3.utils.toWei("100", "ether"), {from: accounts[1]});
		await instance.investExecute("0", web3.utils.toWei("100", "ether"), {from: accounts[1]});

		assert(await instance.getBoughtToken(token.address)); // verify token is bought

		_buy = await instance.currentBuyProposal(); // verify this is reset to zero values
		assert.equal(_buy.buyId.toString(), "0");
		assert.equal(_buy.tokenAccept, NULL_ADDRESS);
		assert.equal(_buy.amountInMin.toString(), "0");
		assert.equal(_buy.ethOut.toString(), "0");
		assert.equal(_buy.taker, NULL_ADDRESS);
		assert.equal(_buy.maxTime, "0");

		// check bought tokens were transferred
		assert.equal((await web3.eth.getBalance(instance.address)).toString(), web3.utils.toWei("40", "ether"));
		assert.equal((await token.balanceOf(instance.address)).toString(), web3.utils.toWei("100", "ether"));
	});

	

	it("should buy a token, then sell for 10 eth profit", async () => {
		let instance = await _init();
		await _issueTokens(instance);
		await _startFund(instance);
		let token = await _inittoken(accounts[1], web3.utils.toWei("100", "ether"));

		await instance.investPropose(token.address, web3.utils.toWei("100", "ether"), web3.utils.toWei("10", "ether"), accounts[1], {from: accounts[5]}); // buy 100 token for 10 eth
		await token.approve(instance.address, web3.utils.toWei("100", "ether"), {from: accounts[1]});
		await instance.investExecute("0", web3.utils.toWei("100", "ether"), {from: accounts[1]}); // now accept the proposal from _taker account

		await instance.devestPropose(token.address, web3.utils.toWei("20", "ether"), web3.utils.toWei("100", "ether"), accounts[1], {from: accounts[5]});
		// check sellid, selldict
		assert.equal((await instance.nextSellId()).toString(), "1");
		let _sell = await instance.getSellProposal("0");
		assert.equal(_sell.tokenSell, token.address);
		assert.equal(_sell.ethInMin.toString(), web3.utils.toWei("20", "ether"));
		assert.equal(_sell.amountOut.toString(), web3.utils.toWei("100", "ether"));
		assert.equal(_sell.taker, accounts[1]);
		console.log("now:", (await web3.eth.getBlock("latest")).timestamp.toString()); // check the maxTime via printouts (time based)
		console.log("vetoTime:", _sell.vetoTime.toString());
		console.log("approxDiff:", THREE_DAYS.toString());
		console.log("maxTime:", _sell.maxTime.toString());

		await _increasetime(THREE_DAYS + 1);

		await instance.devestExecute("0", {value: web3.utils.toWei("20", "ether"), from: accounts[1]});
		_sell = await instance.getSellProposal("0");
		assert.equal(_sell.tokenSell, NULL_ADDRESS);
		assert.equal(_sell.ethInMin.toString(), "0");
		assert.equal(_sell.amountOut.toString(), "0");
		assert.equal(_sell.taker, NULL_ADDRESS);
		assert.equal(_sell.vetoTime.toString(), "0");
		assert.equal(_sell.maxTime.toString(), "0");

		assert.equal((await web3.eth.getBalance(instance.address)).toString(), web3.utils.toWei("60", "ether"));
		assert.equal((await token.balanceOf(instance.address)).toString(), "0");

		assert(! await instance.getBoughtToken(token.address)); // verify token is completely sold out
	});

	it("should buy a token, try to sell for loss, angry investor pause fund, force revoke of sell", async () => {
		let instance = await _init();
		await _issueTokens(instance);
		await _startFund(instance);
		let token = await _inittoken(accounts[1], web3.utils.toWei("100", "ether"));

		await instance.investPropose(token.address, web3.utils.toWei("100", "ether"), web3.utils.toWei("10", "ether"), accounts[1], {from: accounts[5]}); // buy 100 token for 10 eth
		await token.approve(instance.address, web3.utils.toWei("100", "ether"), {from: accounts[1]});
		await instance.investExecute("0", web3.utils.toWei("100", "ether"), {from: accounts[1]}); // now accept the proposal from _taker account

		// propose selling token at a large loss, 10 ETH -> 0.001 ETH
		await instance.devestPropose(token.address, web3.utils.toWei("0.001", "ether"), web3.utils.toWei("100", "ether"), accounts[1], {from: accounts[5]});

		await tassert.reverts(instance.devestExecute("0", {value: web3.utils.toWei("0.001", "ether"), from: accounts[1]}), "TREASURYV1: time < vetoTime");

		await instance.stakeToPause(web3.utils.toWei("2", "ether"), {from: accounts[100]});
		assert.equal((await instance.currentState()).toString(), "2"); // paused state

		await _increasetime(THREE_DAYS + 1);

		// assert that this reverts because the fund is not active
		await tassert.reverts(instance.devestExecute("0", {value: web3.utils.toWei("0.001", "ether"), from: accounts[1]}), "TREASURYV1: !FundStates.active");

		await instance.devestRevoke("0", {from: accounts[5]});
		_sell = await instance.getSellProposal("0");
		assert.equal(_sell.tokenSell, NULL_ADDRESS);
		assert.equal(_sell.ethInMin.toString(), "0");
		assert.equal(_sell.amountOut.toString(), "0");
		assert.equal(_sell.taker, NULL_ADDRESS);
		assert.equal(_sell.vetoTime.toString(), "0");
		assert.equal(_sell.maxTime.toString(), "0");

		// after revoking this sell, the angry investor is satisfied and unrevokes the stake
		await instance.unstakeToPause(web3.utils.toWei("2", "ether"), {from: accounts[100]});
		assert.equal((await instance.currentState()).toString(), "1"); // active state

		// assert that this reverts because the sell is revoked, even though fund is active again
		await tassert.reverts(instance.devestExecute("0", {value: web3.utils.toWei("0.001", "ether"), from: accounts[1]}), "TREASURYV1: !tokenSell");
	});

	it("should revoke a buy", async () => {
		let instance = await _init();
		await _issueTokens(instance);
		await _startFund(instance);
		let token = await _inittoken(accounts[1], web3.utils.toWei("100", "ether"));

		await instance.investPropose(token.address, web3.utils.toWei("100", "ether"), web3.utils.toWei("10", "ether"), accounts[1], {from: accounts[5]}); // buy 100 token for 10 eth
		await instance.investRevoke("0", {from: accounts[5]});

		_buy = await instance.currentBuyProposal(); // verify this is reset to zero values
		assert.equal(_buy.buyId.toString(), "0");
		assert.equal(_buy.tokenAccept, NULL_ADDRESS);
		assert.equal(_buy.amountInMin.toString(), "0");
		assert.equal(_buy.ethOut.toString(), "0");
		assert.equal(_buy.taker, NULL_ADDRESS);
		assert.equal(_buy.maxTime, "0");

		await tassert.reverts(instance.investExecute("0", web3.utils.toWei("10", "ether"), {from: accounts[1]}), "TREASURYV1: !tokenAccept");
	});

	it("should decrease availableToInvest weighted average", async () => {
		let instance = await _init();
		await _issueTokens(instance);
		await _startFund(instance);
		let token = await _inittoken(accounts[1], web3.utils.toWei("100", "ether"));

		await instance.investPropose(token.address, web3.utils.toWei("100", "ether"), web3.utils.toWei("10", "ether"), accounts[1], {from: accounts[5]}); // buy 100 token for 10 eth

		// now console.log the availableToInvest() amounts
		// since this is tiume based it's hard to assert, but this should linearly decrease and be at zero in 30 days
		for (let i = 0; i < 15; i++){
			console.log("avail:", (await instance.availableToInvest()).toString());
			_increasetime(ONE_DAY);
		}

		await instance.investPropose(token.address, web3.utils.toWei("100", "ether"), web3.utils.toWei("5", "ether"), accounts[1], {from: accounts[5]}); // buy 100 token for 10 eth

		for (let i = 0; i < 40; i++){
			console.log("avail:", (await instance.availableToInvest()).toString());
			_increasetime(ONE_DAY);
		}

	});

	it("should claim maximum of 50 tokens", async () => {
		let instance = await _init();
		await _issueTokens(instance);
		await _startFund(instance);

		let tokens_addr = [];
		let tokens = [];
		let token;
		for (let i = 0; i < 50; i++){
			token = await _inittoken(accounts[1], web3.utils.toWei("100", "ether"));
			await instance.investPropose(token.address, web3.utils.toWei("100", "ether"), web3.utils.toWei("0.5", "ether"), accounts[1], {from: accounts[5]}); // buy 100 token for 0.5 eth
			await token.approve(instance.address, web3.utils.toWei("100", "ether"), {from: accounts[1]});
			await instance.investExecute(i, web3.utils.toWei("100", "ether"), {from: accounts[1]});

			tokens_addr.push(token.address);
			tokens.push(token);

			_increasetime(ONE_DAY + ONE_DAY); // increase time enough to get around the availableToInvest
		}

		// kill fund to close
		await instance.stakeToKill(web3.utils.toWei("2", "ether"), {from: accounts[100]});
		await instance.stakeToKill(web3.utils.toWei("1", "ether"), {from: accounts[102]});

		// now all user 101 wants to claim their tokens
		await instance.claim(tokens_addr, {from: accounts[101]});

		// other users unstake their tokens and claim
		await instance.unstakeToKill(web3.utils.toWei("2", "ether"), {from: accounts[100]});
		await instance.unstakeToKill(web3.utils.toWei("1", "ether"), {from: accounts[102]});

		await instance.claim(tokens_addr, {from: accounts[100]});
		await instance.claim(tokens_addr, {from: accounts[102]});
		for (let i = 0; i < 50; i++){
			// approximate values for claiming
			console.log("40?", (await tokens[i].balanceOf(accounts[100])).toString());
			console.log("40?", (await tokens[i].balanceOf(accounts[101])).toString());
			console.log("20?", (await tokens[i].balanceOf(accounts[102])).toString());
		}

		// now check that balances are empty in contract
		assert.equal((await web3.eth.getBalance(instance.address)).toString(), "0");
		for (let i = 0; i < 50; i++){
			assert.equal((await tokens[i].balanceOf(instance.address)).toString(), "0");
		}


	});
});