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

contract FarmBossV1_WBTC is FarmBossV1 {
	using SafeERC20 for IERC20;
	using SafeMath for uint256;
	using Address for address;

	// COMP
	bytes4 constant private mint_ctoken = 0xa0712d68; // mint(uint256 mintAmount)
	bytes4 constant private enter_markets = 0xc2998238; // enterMarkets(address[] cTokens)
	bytes4 constant private exit_market = 0xede4edd0; // exitMarket(address)
	
	bytes4 constant private redeem_ctoken = 0xdb006a75; // redeem(uint256 redeemTokens)
	bytes4 constant private claim_COMP = 0x1c3db2e0; // claimComp(address holder, address[] cTokens)

	bytes4 constant private borrow = 0xc5ebeaec; // borrow(uint256 amount)
	bytes4 constant private repay_behalf = 0x9f35c3d5; //repayBehalf(address)

	bytes4 constant private deposit_eth = 0x2d2da806; // depositETH(address)
	bytes4 constant private withdraw_eth = 0xf14210a6; // withdrawETH(uint256)

	// CRV
	bytes4 constant private add_liquidity_2 = 0x0b4c7e4d; // add_liquidity(uint256[2], uint256);
	bytes4 constant private remove_liquidity_one = 0x1a4d01d2; // remove_liquidity_one_coin(uint256 _token_amount, int128 i, uint256 min_amount)

	bytes4 constant private add_liquidity_3 = 0x4515cef3;// add_liquidity(uint256[3], uint256)

	bytes4 constant private add_liquidity_4 = 0x029b2f34; // add_liquidity(uint256[4] amounts, uint256 min_mint_amount)

	bytes4 constant private mint = 0x6a627842; // mint(address gauge_addr)


	bytes4 constant private deposit_gauge = 0xb6b55f25; // deposit(uint256 _value)
	bytes4 constant private withdraw_gauge = 0x2e1a7d4d; // withdraw(uint256 _value)

	constructor(address payable _governance, address _daoMultisig, address _treasury, address _underlying) public FarmBossV1(_governance, _daoMultisig, _treasury, _underlying){
	}

	function _initFirstFarms() internal override {

		/*
			For our intro WBTC strategies, we will be using Curve.fi & Compound.finance to invest in our own stackETH pool.
		*/

		////////////// ALLOW COMPOUND LOAN -> stackETH //////////////
		address _compWBTC = 0xccF4429DB6322D5C611ee964527D42E5d685DD6a;
		address _compETH = 0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5;
		address _comptroller = 0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B;
		address _compEthRepayHelper = 0xf859A1AD94BcF445A406B892eF0d3082f4174088;

		// stackVaults
		address _stackETH = 0x0572bf36dBD8BBF41ACfaA74139B20ED8a7C0366;

		IERC20(underlying).safeApprove(_compWBTC, type(uint256).max);
		// mint/redeem compBTC
		whitelist[_compWBTC][mint_ctoken] = ALLOWED_NO_MSG_VALUE;
		whitelist[_compWBTC][redeem_ctoken] = ALLOWED_NO_MSG_VALUE;
		// allow collateral & mint COMP
		whitelist[_comptroller][enter_markets] = ALLOWED_NO_MSG_VALUE;
		whitelist[_comptroller][exit_market] = ALLOWED_NO_MSG_VALUE;
		whitelist[_comptroller][claim_COMP] = ALLOWED_NO_MSG_VALUE;
		// borrow and repay, need to use helper repay contract
		whitelist[_compETH][borrow] = ALLOWED_NO_MSG_VALUE;
		whitelist[_compEthRepayHelper][repay_behalf] = ALLOWED_W_MSG_VALUE;

		// stackETH deposit the loaned ETH from Compound
		whitelist[_stackETH][deposit_eth] = ALLOWED_W_MSG_VALUE;
		whitelist[_stackETH][withdraw_eth] = ALLOWED_NO_MSG_VALUE;

		// for selling COMP for more WBTC
		address _COMP = 0xc00e94Cb662C3520282E6f5717214004A7f26888; // allow COMP sell on 1inch
		IERC20(_COMP).safeApprove(SushiswapRouter, type(uint256).max);
		IERC20(_COMP).safeApprove(UniswapRouter, type(uint256).max);
		////////////// END ALLOW COMPOUND LOAN -> stackETH //////////////

		////////////// ALLOW CURVE ren, H, B, sBTC pools //////////////
		////////////// renBTC pool //////////////
		address _renBTCSwap = 0x93054188d876f558f4a66B2EF1d97d16eDf0895B;
		IERC20(underlying).safeApprove(_renBTCSwap, type(uint256).max);
		whitelist[_renBTCSwap][add_liquidity_2] = ALLOWED_NO_MSG_VALUE;
		whitelist[_renBTCSwap][remove_liquidity_one] = ALLOWED_NO_MSG_VALUE;

		emit NewApproval(underlying, _renBTCSwap);
		emit NewWhitelist(_renBTCSwap, add_liquidity_2, ALLOWED_NO_MSG_VALUE);
		emit NewWhitelist(_renBTCSwap, remove_liquidity_one, ALLOWED_NO_MSG_VALUE);

		////////////// renBTC gauge //////////////
		address _renBTCGauge = 0xB1F2cdeC61db658F091671F5f199635aEF202CAC;
		address _renBTCToken = 0x49849C98ae39Fff122806C06791Fa73784FB3675;

		IERC20(_renBTCToken).safeApprove(_renBTCGauge, type(uint256).max);
		whitelist[_renBTCGauge][deposit_gauge] = ALLOWED_NO_MSG_VALUE;
		whitelist[_renBTCGauge][withdraw_gauge] = ALLOWED_NO_MSG_VALUE;

		emit NewApproval(_renBTCToken, _renBTCGauge);
		emit NewWhitelist(_renBTCGauge, deposit_gauge, ALLOWED_NO_MSG_VALUE);
		emit NewWhitelist(_renBTCGauge, withdraw_gauge, ALLOWED_NO_MSG_VALUE);

		////////////// sBTC pool & possible BPT token rewards //////////////
		address _sBTCSwap = 0x7fC77b5c7614E1533320Ea6DDc2Eb61fa00A9714;
		IERC20(underlying).safeApprove(_sBTCSwap, type(uint256).max);
		whitelist[_sBTCSwap][add_liquidity_3] = ALLOWED_NO_MSG_VALUE;
		whitelist[_sBTCSwap][remove_liquidity_one] = ALLOWED_NO_MSG_VALUE;

		emit NewApproval(underlying, _sBTCSwap);
		emit NewWhitelist(_sBTCSwap, add_liquidity_3, ALLOWED_NO_MSG_VALUE);
		emit NewWhitelist(_sBTCSwap, remove_liquidity_one, ALLOWED_NO_MSG_VALUE);

		////////////// sBTC gauge ////////////// -- note: BPT token rewards are finished, no need to whitelist
		address _sBTCGauge = 0x705350c4BcD35c9441419DdD5d2f097d7a55410F;
		address _sBTCToken = 0x075b1bb99792c9E1041bA13afEf80C91a1e70fB3;
		IERC20(_sBTCToken).safeApprove(_sBTCGauge, type(uint256).max);
		whitelist[_sBTCGauge][deposit_gauge] = ALLOWED_NO_MSG_VALUE;
		whitelist[_sBTCGauge][withdraw_gauge] = ALLOWED_NO_MSG_VALUE;

		emit NewApproval(_sBTCToken, _sBTCGauge);
		emit NewWhitelist(_sBTCGauge, deposit_gauge, ALLOWED_NO_MSG_VALUE);
		emit NewWhitelist(_sBTCGauge, withdraw_gauge, ALLOWED_NO_MSG_VALUE);

		////////////// HBTC pool //////////////
		address _HBTCPool = 0x4CA9b3063Ec5866A4B82E437059D2C43d1be596F;
		IERC20(underlying).safeApprove(_HBTCPool, type(uint256).max);
		whitelist[_HBTCPool][add_liquidity_2] = ALLOWED_NO_MSG_VALUE;
		whitelist[_HBTCPool][remove_liquidity_one] = ALLOWED_NO_MSG_VALUE;

		emit NewApproval(underlying, _HBTCPool);
		emit NewWhitelist(_HBTCPool, add_liquidity_2, ALLOWED_NO_MSG_VALUE);
		emit NewWhitelist(_HBTCPool, remove_liquidity_one, ALLOWED_NO_MSG_VALUE);

		////////////// HBTC gauge //////////////
		address _HBTCGauge = 0x4c18E409Dc8619bFb6a1cB56D114C3f592E0aE79;
		address _HBTCToken = 0xb19059ebb43466C323583928285a49f558E572Fd;
		IERC20(_HBTCToken).safeApprove(_HBTCGauge, type(uint256).max);
		whitelist[_HBTCGauge][deposit_gauge] = ALLOWED_NO_MSG_VALUE;
		whitelist[_HBTCGauge][withdraw_gauge] = ALLOWED_NO_MSG_VALUE;

		emit NewApproval(_HBTCToken, _HBTCGauge);
		emit NewWhitelist(_HBTCGauge, deposit_gauge, ALLOWED_NO_MSG_VALUE);
		emit NewWhitelist(_HBTCGauge, withdraw_gauge, ALLOWED_NO_MSG_VALUE);

		////////////// BBTC pool ////////////// -- note: BBTC is BBTC<>sBTCPoolToken pairing, sBTCPoolToken is their BTC "3 pool"
		// allow a direct WBTC deposit (thru sBTC) and a sBTC deposit as well
		// sBTC direct pool deposit
		address _BBTCMetapool = 0x071c661B4DeefB59E2a3DdB20Db036821eeE8F4b;
		IERC20(_sBTCToken).safeApprove(_BBTCMetapool, type(uint256).max); // direct sBTCPoolToken deposit/withdraw to sBTCPoolToken
		whitelist[_BBTCMetapool][add_liquidity_2] = ALLOWED_NO_MSG_VALUE;
		whitelist[_BBTCMetapool][remove_liquidity_one] = ALLOWED_NO_MSG_VALUE;

		emit NewApproval(_sBTCToken, _BBTCMetapool);
		emit NewWhitelist(_BBTCMetapool, add_liquidity_2, ALLOWED_NO_MSG_VALUE);
		emit NewWhitelist(_BBTCMetapool, remove_liquidity_one, ALLOWED_NO_MSG_VALUE);

		// WBTC deposit / withdraw via Zap contract
		address _BBTCZap = 0xC45b2EEe6e09cA176Ca3bB5f7eEe7C47bF93c756;
		address _BBTCToken = 0x410e3E86ef427e30B9235497143881f717d93c2A;
		IERC20(underlying).safeApprove(_BBTCZap, type(uint256).max);
		whitelist[_BBTCZap][add_liquidity_4] = ALLOWED_NO_MSG_VALUE;
		IERC20(_BBTCToken).safeApprove(_BBTCZap, type(uint256).max); // need to allow BBTCToken on Zap contract
		whitelist[_BBTCZap][remove_liquidity_one] = ALLOWED_NO_MSG_VALUE; 

		emit NewApproval(underlying, _BBTCZap);
		emit NewWhitelist(_BBTCZap, add_liquidity_4, ALLOWED_NO_MSG_VALUE);
		emit NewApproval(_BBTCToken, _BBTCZap);
		emit NewWhitelist(_BBTCZap, remove_liquidity_one, ALLOWED_NO_MSG_VALUE);

		////////////// BBTC gauge //////////////
		address _BBTCGauge = 0xdFc7AdFa664b08767b735dE28f9E84cd30492aeE;
		IERC20(_BBTCToken).safeApprove(_BBTCGauge, type(uint256).max);
		whitelist[_BBTCGauge][deposit_gauge] = ALLOWED_NO_MSG_VALUE;
		whitelist[_BBTCGauge][withdraw_gauge] = ALLOWED_NO_MSG_VALUE;

		emit NewApproval(_BBTCToken, _BBTCGauge);
		emit NewWhitelist(_BBTCGauge, deposit_gauge, ALLOWED_NO_MSG_VALUE);
		emit NewWhitelist(_BBTCGauge, withdraw_gauge, ALLOWED_NO_MSG_VALUE);

		////////////// CRV tokens mint, sell Sushi/Uni //////////////
		address _crvMintr = 0xd061D61a4d941c39E5453435B6345Dc261C2fcE0;
		whitelist[_crvMintr][mint] = ALLOWED_NO_MSG_VALUE;

		emit NewWhitelist(_crvMintr, mint, ALLOWED_NO_MSG_VALUE);

		// address CRVToken = 0xD533a949740bb3306d119CC777fa900bA034cd52; -- already in FarmBossV1
		IERC20(CRVToken).safeApprove(SushiswapRouter, type(uint256).max);
		IERC20(CRVToken).safeApprove(UniswapRouter, type(uint256).max);

		emit NewApproval(CRVToken, SushiswapRouter);
		emit NewApproval(CRVToken, UniswapRouter);
		////////////// END ALLOW CURVE ren, H, B, sBTC pools //////////////
	}
}