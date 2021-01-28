// SPDX-License-Identifier: MIT

pragma solidity ^0.6.11;

import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol"; // call ERC20 safely

interface IAlphaHomora_ibETH {
	using SafeERC20 for IERC20;
	
	function deposit() payable external;
	function withdraw(uint256 _shares) external;
}
