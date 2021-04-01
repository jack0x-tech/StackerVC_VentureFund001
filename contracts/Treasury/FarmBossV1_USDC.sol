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
	bytes4 constant private add_liquidity_2 = 0x0b4c7e4d;
	bytes4 constant private add_liquidity_3 = 0x4515cef3;
	bytes4 constant private add_liquidity_4 = 0x029b2f34;

	bytes4 constant private add_liquidity_u_2 = 0xee22be23;
	bytes4 constant private add_liquidity_u_3 = 0x2b6e993a;

	bytes4 constant private remove_liquidity_one_burn = 0x517a55a3;
	bytes4 constant private remove_liquidity_one = 0x1a4d01d2;

	bytes4 constant private remove_liquidity_4 = 0x18a7bd76;

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
			For our intro USDC strategies, we are mostly relying on yEarn and their genius veCrv boost contracts.
			We also allow compound.finance deposits, as a reserve, and we can sell $COMP on 1inch.exchange.
			Aave is not supported for now, we need to make a safe-wrapper contracts because you can deposit w/ a _creditTo_ variable.
			--> We would need to not allow this variable to be populated w/ anything besides msg.sender to allow this.
		*/

		////////////// ALLOW crv3Pool & yEarn //////////////

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

		// CRV FUNCTIONS
		// bytes4 add_liquidity_2 = 0x0b4c7e4d;
		// bytes4 add_liquidity_3 = 0x4515cef3;
		// bytes4 add_liquidity_4 = 0x029b2f34;

		// bytes4 add_liquidity_u_2 = 0xee22be23;
		// bytes4 add_liquidity_u_3 = 0x2b6e993a;

		// bytes4 remove_liquidity_one_burn = 0x517a55a3;
		// bytes4 remove_liquidity_one = 0x1a4d01d2;

		// bytes4 remove_liquidity_4 = 0x18a7bd76;

		// // YEARN FUNCTIONS
		// bytes4 deposit = 0xb6b55f25; // deposit(uint256 _amount)
		// bytes4 withdraw = 0x2e1a7d4d; // withdraw(uint256 _shares)

		// deposit USDC to 3Pool, receive _crv3PoolToken
		address _crv3Pool = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
		address _crv3PoolToken = 0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490;
		IERC20(underlying).safeApprove(_crv3Pool, type(uint256).max); // can set directly to value, called on contract init
		whitelist[_crv3Pool][add_liquidity_3] = ALLOWED_NO_MSG_VALUE;
		whitelist[_crv3Pool][remove_liquidity_one] = ALLOWED_NO_MSG_VALUE;

		// deposit _crv3PoolToken to yEarn, receive yCrv3Pool
		address _yearn3Pool = 0x9cA85572E6A3EbF24dEDd195623F188735A5179f;
		IERC20(_crv3PoolToken).safeApprove(_yearn3Pool, type(uint256).max); 
		whitelist[_yearn3Pool][deposit] = ALLOWED_NO_MSG_VALUE; 
		whitelist[_yearn3Pool][withdraw] = ALLOWED_NO_MSG_VALUE; 
		////////////// END ALLOW crv3Pool & yEarn //////////////

		////////////// ALLOW crvSUSD & yEarn //////////////
		// deposit USDC to pool, receive _crvSUSDToken
		// this is a weird pool, like it was configured for lending accidentally... we will allow the swap and zap contract both
		address _crvSUSDPool = 0xA5407eAE9Ba41422680e2e00537571bcC53efBfD;
		address _crvSUSDToken = 0xC25a3A3b969415c80451098fa907EC722572917F;
		IERC20(underlying).safeApprove(_crvSUSDPool, type(uint256).max);
		whitelist[_crvSUSDPool][add_liquidity_4] = ALLOWED_NO_MSG_VALUE;
		whitelist[_crvSUSDPool][remove_liquidity_4] = ALLOWED_NO_MSG_VALUE;

		address _yearnSUSDPool = 0x5533ed0a3b83F70c3c4a1f69Ef5546D3D4713E44;
		IERC20(_crvSUSDToken).safeApprove(_yearnSUSDPool, type(uint256).max);
		whitelist[_yearnSUSDPool][deposit] = ALLOWED_NO_MSG_VALUE;
		whitelist[_yearnSUSDPool][withdraw] = ALLOWED_NO_MSG_VALUE;

		address _crvSUSDWithdraw = 0xFCBa3E75865d2d561BE8D220616520c171F12851; // because crv frontend is misconfigured to think this is a lending pool
		IERC20(_crvSUSDToken).safeApprove(_crvSUSDWithdraw, type(uint256).max);
		IERC20(underlying).safeApprove(_crvSUSDWithdraw, type(uint256).max); // unneeded
		whitelist[_crvSUSDWithdraw][add_liquidity_4] = ALLOWED_NO_MSG_VALUE; // add_liquidity(uint256[4] _deposit_amounts, uint256 _min_mint_amount)
		whitelist[_crvSUSDWithdraw][remove_liquidity_one_burn] = ALLOWED_NO_MSG_VALUE; // remove_liquidity_one_coin(uint256 _token_amount, int128 i, uint256 min_uamount, bool donate_dust)
		////////////// END ALLOW crvSUDC & yEarn //////////////

		////////////// ALLOW crvCOMP & yEarn //////////////
		address _crvCOMPDeposit = 0xeB21209ae4C2c9FF2a86ACA31E123764A3B6Bc06;
		address _crvCOMPToken = 0x845838DF265Dcd2c412A1Dc9e959c7d08537f8a2;
		IERC20(underlying).safeApprove(_crvCOMPDeposit, type(uint256).max);
		IERC20(_crvCOMPToken).safeApprove(_crvCOMPDeposit, type(uint256).max); // allow withdraws, lending pool
		whitelist[_crvCOMPDeposit][add_liquidity_2] = ALLOWED_NO_MSG_VALUE;
		whitelist[_crvCOMPDeposit][remove_liquidity_one_burn] = ALLOWED_NO_MSG_VALUE;

		address _yearnCOMPPool = 0x629c759D1E83eFbF63d84eb3868B564d9521C129;
		IERC20(_crvCOMPToken).safeApprove(_crvCOMPDeposit, type(uint256).max);
		whitelist[_yearnCOMPPool][deposit] = ALLOWED_NO_MSG_VALUE;
		whitelist[_yearnCOMPPool][withdraw] = ALLOWED_NO_MSG_VALUE;
		////////////// END ALLOW crvCOMP & yEarn //////////////

		////////////// ALLOW crvBUSD & yEarn //////////////
		address _crvBUSDDeposit = 0xb6c057591E073249F2D9D88Ba59a46CFC9B59EdB;
		address _crvBUSDToken = 0x3B3Ac5386837Dc563660FB6a0937DFAa5924333B;
		IERC20(underlying).safeApprove(_crvBUSDDeposit, type(uint256).max);
		IERC20(_crvBUSDToken).safeApprove(_crvBUSDDeposit, type(uint256).max);
		whitelist[_crvBUSDDeposit][add_liquidity_4] = ALLOWED_NO_MSG_VALUE;
		whitelist[_crvBUSDDeposit][remove_liquidity_one_burn] = ALLOWED_NO_MSG_VALUE;

		address _yearnBUSDPool = 0x2994529C0652D127b7842094103715ec5299bBed;
		IERC20(_crvBUSDToken).safeApprove(_yearnBUSDPool, type(uint256).max);
		whitelist[_yearnBUSDPool][deposit] = ALLOWED_NO_MSG_VALUE;
		whitelist[_yearnBUSDPool][withdraw] = ALLOWED_NO_MSG_VALUE;
		////////////// END ALLOW crvBUSD & yEarn //////////////

		////////////// ALLOW crvAave & yEarn //////////////
		address _crvAavePool = 0xDeBF20617708857ebe4F679508E7b7863a8A8EeE; // new style lending pool w/o second approve needed... direct burn from msg.sender
		address _crvAaveToken = 0xFd2a8fA60Abd58Efe3EeE34dd494cD491dC14900;
		IERC20(underlying).safeApprove(_crvAavePool, type(uint256).max);
		whitelist[_crvAavePool][add_liquidity_u_3] = ALLOWED_NO_MSG_VALUE;
		whitelist[_crvAavePool][remove_liquidity_one_burn] = ALLOWED_NO_MSG_VALUE;

		address _yearnAavePool = 0x03403154afc09Ce8e44C3B185C82C6aD5f86b9ab;
		IERC20(_crvAaveToken).safeApprove(_yearnAavePool, type(uint256).max);
		whitelist[_yearnAavePool][deposit] = ALLOWED_NO_MSG_VALUE;
		whitelist[_yearnAavePool][withdraw] = ALLOWED_NO_MSG_VALUE;
		////////////// END ALLOW crvAave & yEarn //////////////

		////////////// ALLOW crvYpool & yEarn //////////////
		address _crvYDeposit = 0xbBC81d23Ea2c3ec7e56D39296F0cbB648873a5d3;
		address _crvYToken = 0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8;
		IERC20(underlying).safeApprove(_crvYDeposit, type(uint256).max);
		IERC20(_crvYToken).safeApprove(_crvYDeposit, type(uint256).max); // allow withdraws, lending pool
		whitelist[_crvYDeposit][add_liquidity_4] = ALLOWED_NO_MSG_VALUE;
		whitelist[_crvYDeposit][remove_liquidity_one_burn] = ALLOWED_NO_MSG_VALUE;

		address _yearnYPool = 0x5dbcF33D8c2E976c6b560249878e6F1491Bca25c; // yearnception
		IERC20(_crvYToken).safeApprove(_yearnYPool, type(uint256).max);
		whitelist[_yearnYPool][deposit] = ALLOWED_NO_MSG_VALUE;
		whitelist[_yearnYPool][withdraw] = ALLOWED_NO_MSG_VALUE;
		////////////// END ALLOW crvYpool & yEarn //////////////

		////////////// ALLOW yEarn USDC //////////////
		address _yearnUSDC = 0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9;
		IERC20(underlying).safeApprove(_yearnUSDC, type(uint256).max);
		whitelist[_yearnUSDC][deposit] = ALLOWED_NO_MSG_VALUE;
		whitelist[_yearnUSDC][withdraw] = ALLOWED_NO_MSG_VALUE;
		////////////// END ALLOW yEarn USDC //////////////

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
	}
}