// SPDX-License-Identifier: MIT

pragma solidity ^0.6.11;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol"; // call ERC20 safely
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "../Interfaces/ITokenManager.sol";

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

    bool public paused = false;

    // vesting constants
    uint64 public constant start = 1614585600;
    uint64 public constant cliff = 1625122800;
    uint64 public constant vested = 1646121600;
    bool public constant revokable = false;

    constructor(address _buyer, address _tokenManager, uint256 _rate, uint256 _amountIn) public {
    	governance = msg.sender;
    	receiver = msg.sender;
    	
    	buyer = _buyer;
    	tokenManager = _tokenManager;

    	rate = _rate;
    	amountIn = _amountIn;
    }

    receive() external payable {
    	swap();
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

    function setPaused(bool _new) external {
    	require(msg.sender == governance, "SWAP: !governance");

    	paused = _new;
    }

    // if amountIn is set to 0, then you do not have to purchase a fixed amount
    function setAmountIn(uint256 _new) external {
    	require(msg.sender == governance, "SWAP: !governance");

    	amountIn = _new;
    }

    function swap() public payable {
    	require(msg.sender == buyer || buyer == address(0), "SWAP: !buyer");
    	require(msg.value == amountIn || amountIn == 0, "SWAP: !amountIn");
    	require(!paused, "SWAP: paused");

    	// receiver is trusted address to receive ETH
    	receiver.transfer(msg.value);

    	uint256 _toSend = msg.value.mul(rate).div(1e18);

    	ITokenManager(tokenManager).assignVested(
    		msg.sender,
    		_toSend,
    		start,
    		cliff,
    		vested,
    		revokable
    	);
    }
}