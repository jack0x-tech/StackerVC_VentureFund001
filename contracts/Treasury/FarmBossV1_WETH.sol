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

contract FarmBossV1_WETH is FarmBossV1 {
	using SafeERC20 for IERC20;
	using SafeMath for uint256;
	using Address for address;

	constructor(address payable _governance, address _daoMultisig, address _treasury, address _underlying) public FarmBossV1(_governance, _daoMultisig, _treasury, _underlying){
	}

	function _initFirstFarms() internal override {

		/*
			For our intro WETH strategies, there are many opportunities. We are going to integrate AlphaHomora v1 & v2 directly, and also integrate Rari Capitals
			rotation fund, in order to cover the "long tail" of good ETH strategies when they appear.
			We will use the yEarn/Curve strategies, with vote boost.

			NOTE:
			We also need to be able to wrap/unwrap ETH, if needed. Funds will come as WETH from the FarmTreasury, and might need to be unwrapped for strategy deposits.
			ETH will also need to be wrapped in order to refill hot/allow withdraws
		*/

		////////////// ALLOW WETH //////////////
		bytes4 deposit_weth = 0xd0e30db0; // deposit()
		bytes4 withdraw_weth = 0x2e1a7d4d; // withdraw(uint256)
		// address WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;  -- already in FarmBossV1
		whitelist[WETH][deposit_weth] = ALLOWED_W_MSG_VALUE;
		whitelist[WETH][withdraw_weth] = ALLOWED_NO_MSG_VALUE;
		////////////// END ALLOW WETH //////////////

		////////////// ALLOW ALPHAHOMORAV1 //////////////
		bytes4 deposit_alphav1 = 0xd0e30db0; // deposit()
		bytes4 withdraw_alphav1 = 0x2e1a7d4d; // withdraw(uint256)
		address ALPHA_V1 = 0x67B66C99D3Eb37Fa76Aa3Ed1ff33E8e39F0b9c7A;
		whitelist[ALPHA_V1][deposit_alphav1] = ALLOWED_W_MSG_VALUE;
		whitelist[ALPHA_V1][withdraw_alphav1] = ALLOWED_NO_MSG_VALUE;
		////////////// END ALLOW ALPHAHOMORAV1 //////////////

		////////////// ALLOW ALPHAHOMORAV2 //////////////
		bytes4 deposit_alphav2 = 0xd0e30db0; // deposit() 
		bytes4 withdraw_alphav2 = 0x2e1a7d4d; // withdraw(uint256)
		address ALPHA_V2 = 0xeEa3311250FE4c3268F8E684f7C87A82fF183Ec1;
		whitelist[ALPHA_V2][deposit_alphav2] = ALLOWED_W_MSG_VALUE;
		whitelist[ALPHA_V2][withdraw_alphav2] = ALLOWED_NO_MSG_VALUE;

		// for selling alpha. alpha is distributed 1x/week by a Uniswap Merkle distributor contract
		address ALPHA_TOKEN = 0xa1faa113cbE53436Df28FF0aEe54275c13B40975;
		IERC20(ALPHA_TOKEN).safeApprove(SushiswapRouter, MAX_UINT256);
		IERC20(ALPHA_TOKEN).safeApprove(UniswapRouter, MAX_UINT256);
		////////////// END ALLOW ALPHAHOMORAV2 //////////////

		////////////// ALLOW RARI CAPITAL AUTO ROTATION //////////////
		bytes4 deposit_rari = 0xd0e30db0; // deposit() 
		bytes4 withdraw_rari = 0x2e1a7d4d; // withdraw(uint256)
		address RARI = 0xD6e194aF3d9674b62D1b30Ec676030C23961275e;
		whitelist[RARI][deposit_rari] = ALLOWED_W_MSG_VALUE;
		whitelist[RARI][withdraw_rari] = ALLOWED_NO_MSG_VALUE;
		////////////// END ALLOW RARI CAPITAL AUTO ROTATION //////////////

		////////////// ALLOW CRV & YEARN //////////////
		bytes4 add_liquidity_2 = 0x0b4c7e4d; // add_liquidity(uint256[2], uint256)
		bytes4 remove_liquidity_one = 0x1a4d01d2; // remove_liquidity_one_coin(uint256, int128, uint256)
		address _crvSETHPool = 0xc5424B857f758E906013F3555Dad202e4bdB4567;
		address _crvSETHToken = 0xA3D87FffcE63B53E0d54fAa1cc983B7eB0b74A9c;
		whitelist[_crvSETHPool][add_liquidity_2] = ALLOWED_W_MSG_VALUE;
		whitelist[_crvSETHPool][remove_liquidity_one] = ALLOWED_NO_MSG_VALUE;

		address _yearnSETHPool = 0x986b4AFF588a109c09B50A03f42E4110E29D353F;
		bytes4 deposit_yearn = 0xb6b55f25; // deposit(uint256 _amount)
		bytes4 withdraw_yearn = 0x2e1a7d4d; // withdraw(uint256 _shares)
		IERC20(_crvSETHToken).safeApprove(_yearnSETHPool, MAX_UINT256);
		whitelist[_yearnSETHPool][deposit_yearn] = ALLOWED_NO_MSG_VALUE;
		whitelist[_yearnSETHPool][withdraw_yearn] = ALLOWED_NO_MSG_VALUE;

		address _crvStETHPool = 0xDC24316b9AE028F1497c275EB9192a3Ea0f67022;
		address _crvStETHToken = 0x06325440D014e39736583c165C2963BA99fAf14E;
		whitelist[_crvStETHPool][add_liquidity_2] = ALLOWED_W_MSG_VALUE;
		whitelist[_crvStETHPool][remove_liquidity_one] = ALLOWED_NO_MSG_VALUE;

		address _yearnStETHPool = 0xdCD90C7f6324cfa40d7169ef80b12031770B4325;
		IERC20(_crvStETHToken).safeApprove(_yearnStETHPool, MAX_UINT256);
		whitelist[_yearnStETHPool][deposit_yearn] = ALLOWED_NO_MSG_VALUE;
		whitelist[_yearnStETHPool][withdraw_yearn] = ALLOWED_NO_MSG_VALUE;
		////////////// END ALLOW CRV & YEARN //////////////
	}
}