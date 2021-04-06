// SPDX-License-Identifier: MIT
/*

*/

pragma solidity ^0.6.11;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol"; // call ERC20 safely
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "./FarmBossV1.sol";

contract FarmBossV1_USDC is FarmBossV1 {
	using SafeERC20 for IERC20;
	using SafeMath for uint256;
	using Address for address;

	// breaking some constants out here, getting stack ;) issues

	// CRV FUNCTIONS
	/*
		CRV Notes:
			add_liquidity takes a fixed size array of input, so it will change the function signature
			0x0b4c7e4d --> 2 coin pool --> add_liquidity(uint256[2] uamounts, uint256 min_mint_amount)
			0x4515cef3 --> 3 coin pool --> add_liquidity(uint256[3] amounts, uint256 min_mint_amount)
			0x029b2f34 --> 4 coin pool --> add_liquidity(uint256[4] amounts, uint256 min_mint_amount)

			0xee22be23 --> 2 coin pool underlying --> add_liquidity(uint256[2] _amounts, uint256 _min_mint_amount, bool _use_underlying)
			0x2b6e993a -> 3 coin pool underlying --> add_liquidity(uint256[3] _amounts, uint256 _min_mint_amount, bool _use_underlying)

			remove_liquidity_one_coin has an optional end argument, bool donate_dust

			0x517a55a3 --> remove_liquidity_one_coin(uint256 _token_amount, int128 i, uint256 min_uamount, bool donate_dust)
			0x1a4d01d2 --> remove_liquidity_one_coin(uint256 _token_amount, int128 i, uint256 min_amount)

			remove_liquidity_imbalance takes a fixes array of input too
			0x18a7bd76 --> 4 coin pool --> remove_liquidity_imbalance(uint256[4] amounts, uint256 max_burn_amount)
	*/
	bytes4 constant private add_liquidity_2 = 0x0b4c7e4d;
	bytes4 constant private add_liquidity_3 = 0x4515cef3;
	bytes4 constant private add_liquidity_4 = 0x029b2f34;

	bytes4 constant private add_liquidity_u_2 = 0xee22be23;
	bytes4 constant private add_liquidity_u_3 = 0x2b6e993a;

	bytes4 constant private remove_liquidity_one_burn = 0x517a55a3;
	bytes4 constant private remove_liquidity_one = 0x1a4d01d2;

	bytes4 constant private remove_liquidity_4 = 0x18a7bd76;

	bytes4 constant private deposit_gauge = 0xb6b55f25; // deposit(uint256 _value)
	bytes4 constant private withdraw_gauge = 0x2e1a7d4d; // withdraw(uint256 _value)

	bytes4 constant private mint = 0x6a627842; // mint(address gauge_addr)
	bytes4 constant private mint_many = 0xa51e1904; // mint_many(address[8])
	bytes4 constant private claim_rewards = 0x84e9bd7e; // claim_rewards(address addr)

	// YEARN FUNCTIONS
	bytes4 constant private deposit = 0xb6b55f25; // deposit(uint256 _amount)
	bytes4 constant private withdraw = 0x2e1a7d4d; // withdraw(uint256 _shares)

	// AlphaHomora FUNCTIONS
	bytes4 constant private claim = 0x2f52ebb7;

	// COMP FUNCTIONS
	bytes4 constant private mint_ctoken = 0xa0712d68; // mint(uint256 mintAmount)
	bytes4 constant private redeem_ctoken = 0xdb006a75; // redeem(uint256 redeemTokens)
	bytes4 constant private claim_COMP = 0x1c3db2e0; // claimComp(address holder, address[] cTokens)

	constructor(address payable _governance, address _daoMultisig, address _treasury, address _underlying) public FarmBossV1(_governance, _daoMultisig, _treasury, _underlying){
	}

	function _initFirstFarms() internal override {

		/*
			For our intro USDC strategies, we are using:
			-- Curve.fi strategies for their good yielding USDC pools
			-- AlphaHomoraV2 USDC
			-- yEarn USDC
			-- Compound USDC
			-- IDLE Finance USDC
		*/

		////////////// ALLOW CURVE 3, s, y, ib, comp, busd, aave, usdt pools //////////////

		////////////// ALLOW crv3pool //////////////
		address _crv3Pool = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
		address _crv3PoolToken = 0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490;
		IERC20(underlying).safeApprove(_crv3Pool, type(uint256).max); // can set directly to value, called on contract init
		whitelist[_crv3Pool][add_liquidity_3] = ALLOWED_NO_MSG_VALUE;
		whitelist[_crv3Pool][remove_liquidity_one] = ALLOWED_NO_MSG_VALUE;

		emit NewApproval(underlying, _crv3Pool);
		emit NewWhitelist(_crv3Pool, add_liquidity_3, ALLOWED_NO_MSG_VALUE);
		emit NewWhitelist(_crv3Pool, remove_liquidity_one, ALLOWED_NO_MSG_VALUE);

		////////////// ALLOW crv3 Gauge //////////////
		address _crv3Gauge = 0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A;
		IERC20(_crv3PoolToken).safeApprove(_crv3Gauge, type(uint256).max);
		whitelist[_crv3Gauge][deposit_gauge] = ALLOWED_NO_MSG_VALUE;
		whitelist[_crv3Gauge][withdraw_gauge] = ALLOWED_NO_MSG_VALUE;

		emit NewApproval(_crv3PoolToken, _crv3Gauge);
		emit NewWhitelist(_crv3Gauge, deposit_gauge, ALLOWED_NO_MSG_VALUE);
		emit NewWhitelist(_crv3Gauge, withdraw_gauge, ALLOWED_NO_MSG_VALUE);

		////////////// ALLOW crvSUSD Pool //////////////
		// deposit USDC to SUSDpool, receive _crvSUSDToken
		// this is a weird pool, like it was configured for lending accidentally... we will allow the swap and zap contract both
		address _crvSUSDPool = 0xA5407eAE9Ba41422680e2e00537571bcC53efBfD;
		address _crvSUSDToken = 0xC25a3A3b969415c80451098fa907EC722572917F;
		IERC20(underlying).safeApprove(_crvSUSDPool, type(uint256).max);
		whitelist[_crvSUSDPool][add_liquidity_4] = ALLOWED_NO_MSG_VALUE;
		whitelist[_crvSUSDPool][remove_liquidity_4] = ALLOWED_NO_MSG_VALUE;

		emit NewApproval(underlying, _crvSUSDPool);
		emit NewWhitelist(_crvSUSDPool, add_liquidity_4, ALLOWED_NO_MSG_VALUE);
		emit NewWhitelist(_crvSUSDPool, remove_liquidity_4, ALLOWED_NO_MSG_VALUE);

		address _crvSUSDWithdraw = 0xFCBa3E75865d2d561BE8D220616520c171F12851; // because crv frontend is misconfigured to think this is a lending pool
		IERC20(underlying).safeApprove(_crvSUSDWithdraw, type(uint256).max); // unneeded
		IERC20(_crvSUSDToken).safeApprove(_crvSUSDWithdraw, type(uint256).max);
		whitelist[_crvSUSDWithdraw][add_liquidity_4] = ALLOWED_NO_MSG_VALUE; // add_liquidity(uint256[4] _deposit_amounts, uint256 _min_mint_amount)
		whitelist[_crvSUSDWithdraw][remove_liquidity_one_burn] = ALLOWED_NO_MSG_VALUE; // remove_liquidity_one_coin(uint256 _token_amount, int128 i, uint256 min_uamount, bool donate_dust)

		emit NewApproval(underlying, _crvSUSDWithdraw);
		emit NewApproval(_crvSUSDToken, _crvSUSDWithdraw);
		emit NewWhitelist(_crvSUSDWithdraw, add_liquidity_4, ALLOWED_NO_MSG_VALUE);
		emit NewWhitelist(_crvSUSDWithdraw, remove_liquidity_one_burn, ALLOWED_NO_MSG_VALUE);

		////////////// ALLOW crvSUSD Gauge, SNX REWARDS //////////////
		address _crvSUSDGauge = 0xA90996896660DEcC6E997655E065b23788857849;
		IERC20(_crvSUSDToken).safeApprove(_crvSUSDGauge, type(uint256).max);
		whitelist[_crvSUSDGauge][deposit_gauge] = ALLOWED_NO_MSG_VALUE;
		whitelist[_crvSUSDGauge][withdraw_gauge] = ALLOWED_NO_MSG_VALUE;
		whitelist[_crvSUSDGauge][claim_rewards] = ALLOWED_NO_MSG_VALUE; // claiming SNX rewards

		address _SNXToken = 0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F;
		IERC20(_SNXToken).safeApprove(SushiswapRouter, type(uint256).max);
		IERC20(_SNXToken).safeApprove(UniswapRouter, type(uint256).max);

		emit NewApproval(_SNXToken, SushiswapRouter);
		emit NewApproval(_SNXToken, UniswapRouter);

		////////////// ALLOW crvCOMP Pool //////////////
		address _crvCOMPDeposit = 0xeB21209ae4C2c9FF2a86ACA31E123764A3B6Bc06;
		address _crvCOMPToken = 0x845838DF265Dcd2c412A1Dc9e959c7d08537f8a2;
		IERC20(underlying).safeApprove(_crvCOMPDeposit, type(uint256).max);
		IERC20(_crvCOMPToken).safeApprove(_crvCOMPDeposit, type(uint256).max); // allow withdraws, lending pool
		whitelist[_crvCOMPDeposit][add_liquidity_2] = ALLOWED_NO_MSG_VALUE;
		whitelist[_crvCOMPDeposit][remove_liquidity_one_burn] = ALLOWED_NO_MSG_VALUE;

		emit NewApproval(underlying, _crvCOMPDeposit);
		emit NewApproval(_crvCOMPToken, _crvCOMPDeposit);
		emit NewWhitelist(_crvCOMPDeposit, add_liquidity_2, ALLOWED_NO_MSG_VALUE);
		emit NewWhitelist(_crvCOMPDeposit, remove_liquidity_one_burn, ALLOWED_NO_MSG_VALUE);

		////////////// ALLOW crvCOMP Gauge //////////////
		address _crvCOMPGauge = 0x7ca5b0a2910B33e9759DC7dDB0413949071D7575;
		IERC20(_crvCOMPToken).safeApprove(_crvCOMPGauge, type(uint256).max);
		whitelist[_crvCOMPGauge][deposit_gauge] = ALLOWED_NO_MSG_VALUE;
		whitelist[_crvCOMPGauge][withdraw_gauge] = ALLOWED_NO_MSG_VALUE;

		emit NewApproval(_crvCOMPToken, _crvCOMPGauge);
		emit NewWhitelist(_crvCOMPGauge, deposit_gauge, ALLOWED_NO_MSG_VALUE);
		emit NewWhitelist(_crvCOMPGauge, withdraw_gauge, ALLOWED_NO_MSG_VALUE);

		////////////// ALLOW crvBUSD Pool //////////////
		address _crvBUSDDeposit = 0xb6c057591E073249F2D9D88Ba59a46CFC9B59EdB;
		address _crvBUSDToken = 0x3B3Ac5386837Dc563660FB6a0937DFAa5924333B;
		IERC20(underlying).safeApprove(_crvBUSDDeposit, type(uint256).max);
		IERC20(_crvBUSDToken).safeApprove(_crvBUSDDeposit, type(uint256).max);
		whitelist[_crvBUSDDeposit][add_liquidity_4] = ALLOWED_NO_MSG_VALUE;
		whitelist[_crvBUSDDeposit][remove_liquidity_one_burn] = ALLOWED_NO_MSG_VALUE;

		emit NewApproval(underlying, _crvBUSDDeposit);
		emit NewApproval(_crvBUSDToken, _crvBUSDDeposit);
		emit NewWhitelist(_crvBUSDDeposit, add_liquidity_4, ALLOWED_NO_MSG_VALUE);
		emit NewWhitelist(_crvBUSDDeposit, remove_liquidity_one_burn, ALLOWED_NO_MSG_VALUE);

		////////////// ALLOW crvBUSD Gauge //////////////
		address _crvBUSDGauge = 0x69Fb7c45726cfE2baDeE8317005d3F94bE838840;
		IERC20(_crvBUSDToken).safeApprove(_crvBUSDGauge, type(uint256).max);
		whitelist[_crvBUSDGauge][deposit_gauge] = ALLOWED_NO_MSG_VALUE;
		whitelist[_crvBUSDGauge][withdraw_gauge] = ALLOWED_NO_MSG_VALUE;

		emit NewApproval(_crvBUSDToken, _crvBUSDGauge);
		emit NewWhitelist(_crvBUSDGauge, deposit_gauge, ALLOWED_NO_MSG_VALUE);
		emit NewWhitelist(_crvBUSDGauge, withdraw_gauge, ALLOWED_NO_MSG_VALUE);

		////////////// ALLOW crvAave Pool //////////////
		address _crvAavePool = 0xDeBF20617708857ebe4F679508E7b7863a8A8EeE; // new style lending pool w/o second approve needed... direct burn from msg.sender
		address _crvAaveToken = 0xFd2a8fA60Abd58Efe3EeE34dd494cD491dC14900;
		IERC20(underlying).safeApprove(_crvAavePool, type(uint256).max);
		whitelist[_crvAavePool][add_liquidity_u_3] = ALLOWED_NO_MSG_VALUE;
		whitelist[_crvAavePool][remove_liquidity_one_burn] = ALLOWED_NO_MSG_VALUE;

		emit NewApproval(underlying, _crvAavePool);
		emit NewWhitelist(_crvAavePool, add_liquidity_u_3, ALLOWED_NO_MSG_VALUE);
		emit NewWhitelist(_crvAavePool, remove_liquidity_one_burn, ALLOWED_NO_MSG_VALUE);

		////////////// ALLOW crvAave Gauge //////////////
		address _crvAaveGauge = 0xd662908ADA2Ea1916B3318327A97eB18aD588b5d;
		IERC20(_crvAaveToken).safeApprove(_crvAaveGauge, type(uint256).max);
		whitelist[_crvAaveGauge][deposit_gauge] = ALLOWED_NO_MSG_VALUE;
		whitelist[_crvAaveGauge][withdraw_gauge] = ALLOWED_NO_MSG_VALUE;

		emit NewApproval(_crvAaveToken, _crvAaveGauge);
		emit NewWhitelist(_crvAaveGauge, deposit_gauge, ALLOWED_NO_MSG_VALUE);
		emit NewWhitelist(_crvAaveGauge, withdraw_gauge, ALLOWED_NO_MSG_VALUE);

		////////////// ALLOW crvYpool //////////////
		address _crvYDeposit = 0xbBC81d23Ea2c3ec7e56D39296F0cbB648873a5d3;
		address _crvYToken = 0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8;
		IERC20(underlying).safeApprove(_crvYDeposit, type(uint256).max);
		IERC20(_crvYToken).safeApprove(_crvYDeposit, type(uint256).max); // allow withdraws, lending pool
		whitelist[_crvYDeposit][add_liquidity_4] = ALLOWED_NO_MSG_VALUE;
		whitelist[_crvYDeposit][remove_liquidity_one_burn] = ALLOWED_NO_MSG_VALUE;

		emit NewApproval(underlying, _crvYDeposit);
		emit NewApproval(_crvYToken, _crvYDeposit);
		emit NewWhitelist(_crvYDeposit, add_liquidity_4, ALLOWED_NO_MSG_VALUE);
		emit NewWhitelist(_crvYDeposit, remove_liquidity_one_burn, ALLOWED_NO_MSG_VALUE);

		////////////// ALLOW crvY Gauge //////////////
		address _crvYGauge = 0xFA712EE4788C042e2B7BB55E6cb8ec569C4530c1;
		IERC20(_crvYToken).safeApprove(_crvYGauge, type(uint256).max);
		whitelist[_crvYGauge][deposit_gauge] = ALLOWED_NO_MSG_VALUE;
		whitelist[_crvYGauge][withdraw_gauge] = ALLOWED_NO_MSG_VALUE;

		emit NewApproval(_crvYToken,_crvYGauge);
		emit NewWhitelist(_crvYGauge, deposit_gauge, ALLOWED_NO_MSG_VALUE);
		emit NewWhitelist(_crvYGauge, withdraw_gauge, ALLOWED_NO_MSG_VALUE);

		////////////// ALLOW crvUSDTComp Pool //////////////
		address _crvUSDTCompDeposit = 0xac795D2c97e60DF6a99ff1c814727302fD747a80;
		address _crvUSDTCompToken = 0x9fC689CCaDa600B6DF723D9E47D84d76664a1F23;
		IERC20(underlying).safeApprove(_crvUSDTCompDeposit, type(uint256).max);
		IERC20(_crvUSDTCompToken).safeApprove(_crvUSDTCompDeposit, type(uint256).max);
		whitelist[_crvUSDTCompDeposit][add_liquidity_3] = ALLOWED_NO_MSG_VALUE;
		whitelist[_crvUSDTCompDeposit][remove_liquidity_one_burn] = ALLOWED_NO_MSG_VALUE;

		emit NewApproval(underlying, _crvUSDTCompDeposit);
		emit NewApproval(_crvUSDTCompToken, _crvUSDTCompDeposit);
		emit NewWhitelist(_crvUSDTCompDeposit, add_liquidity_3, ALLOWED_NO_MSG_VALUE);
		emit NewWhitelist(_crvUSDTCompDeposit, remove_liquidity_one_burn, ALLOWED_NO_MSG_VALUE);

		////////////// ALLOW crvUSDTComp Gauge //////////////
		address _crvUSDTCompGauge = 0xBC89cd85491d81C6AD2954E6d0362Ee29fCa8F53;
		IERC20(_crvUSDTCompToken).safeApprove(_crvUSDTCompGauge, type(uint256).max);
		whitelist[_crvUSDTCompGauge][deposit_gauge] = ALLOWED_NO_MSG_VALUE;
		whitelist[_crvUSDTCompGauge][withdraw_gauge] = ALLOWED_NO_MSG_VALUE;

		emit NewApproval(_crvUSDTCompToken, _crvUSDTCompGauge);
		emit NewWhitelist(_crvUSDTCompGauge, deposit_gauge, ALLOWED_NO_MSG_VALUE);
		emit NewWhitelist(_crvUSDTCompGauge, withdraw_gauge, ALLOWED_NO_MSG_VALUE);

		////////////// ALLOW crvIBPool Pool //////////////
		address _crvIBPool = 0x2dded6Da1BF5DBdF597C45fcFaa3194e53EcfeAF;
		IERC20(underlying).safeApprove(_crvIBPool, type(uint256).max);
		whitelist[_crvIBPool][add_liquidity_u_3] = ALLOWED_NO_MSG_VALUE;
		whitelist[_crvIBPool][remove_liquidity_one_burn] = ALLOWED_NO_MSG_VALUE;

		emit NewApproval(underlying, _crvIBPool);
		emit NewWhitelist(_crvIBPool, add_liquidity_u_3, ALLOWED_NO_MSG_VALUE);
		emit NewWhitelist(_crvIBPool, remove_liquidity_one_burn, ALLOWED_NO_MSG_VALUE);

		////////////// ALLOW crvIBPool Gauge //////////////
		address _crvIBGauge = 0xF5194c3325202F456c95c1Cf0cA36f8475C1949F;
		address _crvIBToken = 0x5282a4eF67D9C33135340fB3289cc1711c13638C;
		IERC20(_crvIBToken).safeApprove(_crvIBGauge, type(uint256).max);
		whitelist[_crvIBGauge][deposit_gauge] = ALLOWED_NO_MSG_VALUE;
		whitelist[_crvIBGauge][withdraw_gauge] = ALLOWED_NO_MSG_VALUE;

		emit NewApproval(_crvIBToken, _crvIBGauge);
		emit NewWhitelist(_crvIBGauge, deposit_gauge, ALLOWED_NO_MSG_VALUE);
		emit NewWhitelist(_crvIBGauge, withdraw_gauge, ALLOWED_NO_MSG_VALUE);

		////////////// CRV tokens mint, sell Sushi/Uni //////////////
		address _crvMintr = 0xd061D61a4d941c39E5453435B6345Dc261C2fcE0;
		whitelist[_crvMintr][mint] = ALLOWED_NO_MSG_VALUE;
		whitelist[_crvMintr][mint_many] = ALLOWED_NO_MSG_VALUE;

		emit NewWhitelist(_crvMintr, mint, ALLOWED_NO_MSG_VALUE);
		emit NewWhitelist(_crvMintr, mint_many, ALLOWED_NO_MSG_VALUE);

		// address CRVToken = 0xD533a949740bb3306d119CC777fa900bA034cd52; -- already in FarmBossV1
		IERC20(CRVToken).safeApprove(SushiswapRouter, type(uint256).max);
		IERC20(CRVToken).safeApprove(UniswapRouter, type(uint256).max);

		emit NewApproval(CRVToken, SushiswapRouter);
		emit NewApproval(CRVToken, UniswapRouter);

		////////////// END ALLOW CURVE 3, s, y, ib, comp, busd, aave, usdt pools //////////////

		////////////// ALLOW AlphaHomoraV2 USDC //////////////
		address _ahUSDC = 0x08bd64BFC832F1C2B3e07e634934453bA7Fa2db2;
		IERC20(underlying).safeApprove(_ahUSDC, type(uint256).max);
		whitelist[_ahUSDC][deposit] = ALLOWED_NO_MSG_VALUE;
		whitelist[_ahUSDC][withdraw] = ALLOWED_NO_MSG_VALUE;
		whitelist[_ahUSDC][claim] = ALLOWED_NO_MSG_VALUE; // claim ALPHA token reward

		address ALPHA_TOKEN = 0xa1faa113cbE53436Df28FF0aEe54275c13B40975;
		// swapping is done by a function in FarmBossV1 for safety
		IERC20(ALPHA_TOKEN).safeApprove(SushiswapRouter, type(uint256).max);
		IERC20(ALPHA_TOKEN).safeApprove(UniswapRouter, type(uint256).max);
		////////////// END ALLOW AlphaHomoraV2 USDC //////////////

		////////////// ALLOW yEarn USDC //////////////
		address _yearnUSDC = 0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9;
		IERC20(underlying).safeApprove(_yearnUSDC, type(uint256).max);
		whitelist[_yearnUSDC][deposit] = ALLOWED_NO_MSG_VALUE;
		whitelist[_yearnUSDC][withdraw] = ALLOWED_NO_MSG_VALUE;
		////////////// END ALLOW yEarn USDC //////////////

		////////////// ALLOW Compound USDC //////////////
		address _compUSDC = 0x39AA39c021dfbaE8faC545936693aC917d5E7563;
		IERC20(underlying).safeApprove(_compUSDC, type(uint256).max);
		whitelist[_compUSDC][mint_ctoken] = ALLOWED_NO_MSG_VALUE;
		whitelist[_compUSDC][redeem_ctoken] = ALLOWED_NO_MSG_VALUE;

		address _comptroller = 0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B; // claimComp
		whitelist[_comptroller][claim_COMP] = ALLOWED_NO_MSG_VALUE;

		address _COMP = 0xc00e94Cb662C3520282E6f5717214004A7f26888; // allow COMP sell on 1inch
		IERC20(_COMP).safeApprove(SushiswapRouter, type(uint256).max);
		IERC20(_COMP).safeApprove(UniswapRouter, type(uint256).max);
		////////////// END ALLOW Compound USDC //////////////

		////////////// ALLOW IDLE Finance USDC //////////////

		////////////// END ALLOW IDLE Finance USDC //////////////
	}
}