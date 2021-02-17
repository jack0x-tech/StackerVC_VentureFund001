// SPDX-License-Identifier: MIT

pragma solidity ^0.6.11;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol"; // call ERC20 safely
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract TokenSwap {
	using SafeERC20 for IERC20;
	using Address for address;
    using SafeMath for uint256;

    address payable public receiver;
    address public governance;
    address public buyer;

    address public tokenManager;

    uint256 public rate;
    uint256 public amountIn;

    constructor(address payable _receiver, address _buyer, address _tokenManager, uint256 _rate, uint256 _amountIn) public {
    	governance = msg.sender;

    	receiver = _receiver;
    	buyer = _buyer;
    	tokenManager = _tokenManager;

    	rate = _rate;
    	amountIn = _amountIn;
    }

    function setReceiver(address payable _new) external {
    	require(msg.sender == governance, "SWAP: !governance");
    	require(_new != address(0), "SWAP: receiver == 0x0");

    	receiver = _new;
    }

    function setGovernance(address _new) external {
    	require(msg.sender == governance, "SWAP: !governance");
    	require(_new != address(0), "SWAP: governance == 0x0");

    	governance = _new;
    }

    // if buyer is set to 0x0, then the sale is open to the public
    function setBuyer(address _new) external {
    	require(msg.sender == governance, "SWAP: !governance");

    	buyer = _new;
    }

    function setRate(uint256 _new) external {
    	require(msg.sender == governance, "SWAP: !governance");
    	require(_new != 0, "SWAP: !rate");

    	rate = _new;
    }

    // if amountIn is set to 0, then you do not have to purchase a fixed amount
    function setAmountIn(uint256 _new) external {
    	require(msg.sender == governance, "SWAP: !governance");

    	amountIn = _new;
    }

    function swap() external payable {
    	require(msg.sender == buyer || buyer == address(0), "SWAP: !buyer");
    	require(msg.value == amountIn || amountIn == 0, "SWAP: !amountIn");

    	// receiver is trusted address to receive ETH
    	receiver.transfer(msg.value);

    	uint256 _toSend = msg.value.mul(rate);

    	
    }
}