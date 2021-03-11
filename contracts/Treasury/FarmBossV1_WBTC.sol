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

	constructor(address payable _governance, address _treasury, address _underlying) public FarmBossV1(_governance, _treasury, _underlying){
	}

	function _initFirstFarms() internal override {

		/*
			For our intro WBTC strategies, we will be utilizing MakerDAO to generate DAI with our WBTC. We will then invest the DAI in a number of Curve.finance/yEarn
			strategies, as we do with our USDC strategies.
		*/

	}
}