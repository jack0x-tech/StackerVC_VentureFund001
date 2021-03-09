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
			For our intro WBTC strategies, we will be utilizing Badger.finance for their Curve.fi strategies & tokens. We will use accumulated BADGER/DIGG rewards
			and sell them on 1inch exchange for more WBTC.
		*/

		// got to get into crv first ... 

		// Badger is limited, because we need to get our contract approved to interact w/ theirs... other farms?

		// bytes4 constant deposit_badger = 0xb6b55f25; // deposit(uint256)
		// bytes4 constant withdraw_badger = 0x2e1a7d4d; // withdraw(uint256)
		// address constant _badgerHarvestRenCrvSet = 0xAf5A1DECfa95BAF63E0084a35c62592B774A2A87;


	}
}