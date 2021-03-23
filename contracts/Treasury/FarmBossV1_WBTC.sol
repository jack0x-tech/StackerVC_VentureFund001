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

	bytes4 constant private mint_ctoken = 0xa0712d68; // mint(uint256 mintAmount)
	bytes4 constant private enter_markets = 0xc2998238; // enterMarkets(address[] cTokens)
	bytes4 constant private exit_market = 0xede4edd0; // exitMarket(address)
	
	bytes4 constant private redeem_ctoken = 0xdb006a75; // redeem(uint256 redeemTokens)
	bytes4 constant private claim_COMP = 0x1c3db2e0; // claimComp(address holder, address[] cTokens)

	bytes4 constant private borrow = 0xc5ebeaec; // borrow(uint256 amount)
	bytes4 constant private repay_behalf = 0x9f35c3d5; //repayBehalf(address)

	bytes4 constant private deposit_eth = 0x2d2da806; // depositETH(address)
	bytes4 constant private withdraw_eth = 0xf14210a6; // withdrawETH(uint256)

	// for selling COMP
	bytes4 constant private swap_erc20_1inch = 0x7c025200; // swap(address, (address,address,address,address,uint256,uint256,uint256,bytes), bytes)
	bytes4 constant private swap_one = 0x2e95b6c8; // unoswap(address srcToken, uint256 amount, uint256 minReturn, bytes32[])

	constructor(address payable _governance, address _treasury, address _underlying) public FarmBossV1(_governance, _treasury, _underlying){
	}

	function _initFirstFarms() internal override {

		/*
			For our intro WBTC strategies, we will be utilizing MakerDAO to generate DAI with our WBTC. We will then invest the DAI in a number of Curve.finance/yEarn
			strategies, as we do with our USDC strategies.
		*/

		address _compWBTC = 0xccF4429DB6322D5C611ee964527D42E5d685DD6a;
		address _compETH = 0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5;
		address _comptroller = 0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B;
		address _compEthRepayHelper = 0xf859A1AD94BcF445A406B892eF0d3082f4174088;

		// stackVaults
		address _stackETH = 0x0572bf36dBD8BBF41ACfaA74139B20ED8a7C0366;

		IERC20(underlying).safeApprove(_compWBTC, MAX_UINT256);
		// mint/redeem compBTC
		whitelist[_compWBTC][mint_ctoken] = true;
		whitelist[_compWBTC][redeem_ctoken] = true;
		// allow collateral & mint COMP
		whitelist[_comptroller][enter_markets] = true;
		whitelist[_comptroller][exit_market] = true;
		whitelist[_comptroller][claim_COMP] = true;
		// borrow and repay, need to use helper repay contract
		whitelist[_compETH][borrow] = true;
		whitelist[_compEthRepayHelper][repay_behalf] = true;

		whitelist[_stackETH][deposit_eth] = true;
		whitelist[_stackETH][withdraw_eth] = true;

		// for selling COMP for more WBTC
		address _COMP = 0xc00e94Cb662C3520282E6f5717214004A7f26888; // allow COMP sell on 1inch
		address _1inchEx = 0x11111112542D85B3EF69AE05771c2dCCff4fAa26;
		IERC20(_COMP).safeApprove(_1inchEx, MAX_UINT256);
		whitelist[_1inchEx][swap_erc20_1inch] = true; // COMP -> USDC
		whitelist[_1inchEx][swap_one] = true;

	}
}