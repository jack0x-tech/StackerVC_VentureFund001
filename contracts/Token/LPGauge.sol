// SPDX-License-Identifier: MIT
/*
A simple gauge contract to measure the amount of tokens locked, and reward users in a different token.

Using this for STACK/ETH Uni LP currently.
*/

pragma solidity ^0.6.11;

import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol"; // call ERC20 safely
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract LPGauge is ReentrancyGuard {
	using SafeERC20 for IERC20;
	using Address for address;
    using SafeMath for uint256;

    address payable public governance = 0xB156d2D9CAdB12a252A9015078fc5cb7E92e656e; // STACK DAO Agent address
    address public constant acceptToken = 0xd78E04a200048a438D9D03C9A3d7E5154dE643b1; // STACK/ETH Uniswap LP Token

    // TODO: get STACK token address
    address public constant STACK = 0xe0955F26515d22E347B17669993FCeFcc73c3a0a; // STACK DAO Token

    uint256 public emissionRate = 25209284627092800; // amount of STACK/block given

    uint256 public deposited;

    uint256 public constant startBlock = 11955015;
    uint256 public endBlock = startBlock + 2380075;

    // uint256 public constant startBlock = 11226037 + 100;
    // uint256 public endBlock = startBlock + 2425846;
    uint256 public lastBlock; // last block the distribution has ran
    uint256 public tokensAccrued; // tokens to distribute per weight scaled by 1e18

    struct DepositState {
    	uint256 balance;
    	uint256 tokensAccrued;
    }

    mapping(address => DepositState) public balances;

    event Deposit(address indexed from, uint256 amount);
    event Withdraw(address indexed to, uint256 amount);
    event STACKClaimed(address indexed to, uint256 amount);

    constructor() public {
    }

    function setGovernance(address payable _new) external {
    	require(msg.sender == governance);
    	governance = _new;
    }

    function setEmissionRate(uint256 _new) external {
    	require(msg.sender == governance, "LPGAUGE: !governance");
    	_kick(); // catch up the contract to the current block for old rate
    	emissionRate = _new;
    }

    function setEndBlock(uint256 _block) external {
    	require(msg.sender == governance, "LPGAUGE: !governance");
    	require(block.number <= endBlock, "LPGAUGE: distribution already done, must start another");
        require(block.number <= _block, "LPGAUGE: can't set endBlock to past block");
    	
    	endBlock = _block;
    }

    function deposit(uint256 _amount) nonReentrant external {
    	require(block.number <= endBlock, "LPGAUGE: distribution over");

    	_claimSTACK(msg.sender);

    	IERC20(acceptToken).safeTransferFrom(msg.sender, address(this), _amount);

    	DepositState memory _state = balances[msg.sender];
    	_state.balance = _state.balance.add(_amount);
    	deposited = deposited.add(_amount);

    	emit Deposit(msg.sender, _amount);
    	balances[msg.sender] = _state;
    }

    function withdraw(uint256 _amount) nonReentrant external {
    	_claimSTACK(msg.sender);

    	DepositState memory _state = balances[msg.sender];

    	require(_amount <= _state.balance, "LPGAUGE: insufficient balance");

    	_state.balance = _state.balance.sub(_amount);
    	deposited = deposited.sub(_amount);

    	emit Withdraw(msg.sender, _amount);
    	balances[msg.sender] = _state;

    	IERC20(acceptToken).safeTransfer(msg.sender, _amount);
    }

    function claimSTACK() nonReentrant external returns (uint256) {
    	return _claimSTACK(msg.sender);
    }

    function _claimSTACK(address _user) internal returns (uint256) {
    	_kick();

    	DepositState memory _state = balances[_user];
    	if (_state.tokensAccrued == tokensAccrued){ // user doesn't have any accrued tokens
    		return 0;
    	}
    	else {
    		uint256 _tokensAccruedDiff = tokensAccrued.sub(_state.tokensAccrued);
    		uint256 _tokensGive = _tokensAccruedDiff.mul(_state.balance).div(1e18);

    		_state.tokensAccrued = tokensAccrued;
    		balances[_user] = _state;

            // if the guage has enough tokens to grant the user, then send their tokens
            // otherwise, don't fail, just log STACK claimed, and a reimbursement can be done via chain events
            if (IERC20(STACK).balanceOf(address(this)) >= _tokensGive){
                IERC20(STACK).safeTransfer(_user, _tokensGive);
            }

            // log event
            emit STACKClaimed(_user, _tokensGive);

            return _tokensGive;
    	}
    }

    function _kick() internal {
    	uint256 _totalDeposited = deposited;
    	// if there are no tokens committed, then don't kick.
    	if (_totalDeposited == 0){
    		return;
    	}
    	// already done for this block || already did all blocks || not started yet
    	if (lastBlock == block.number || lastBlock >= endBlock || block.number < startBlock){
    		return;
    	}

		uint256 _deltaBlock;
		// edge case where kick was not called for entire period of blocks.
		if (lastBlock <= startBlock && block.number >= endBlock){
			_deltaBlock = endBlock.sub(startBlock);
		}
		// where block.number is past the endBlock
		else if (block.number >= endBlock){
			_deltaBlock = endBlock.sub(lastBlock);
		}
		// where last block is before start
		else if (lastBlock <= startBlock){
			_deltaBlock = block.number.sub(startBlock);
		}
		// normal case, where we are in the middle of the distribution
		else {
			_deltaBlock = block.number.sub(lastBlock);
		}

		uint256 _tokensToAccrue = _deltaBlock.mul(emissionRate);
		tokensAccrued = tokensAccrued.add(_tokensToAccrue.mul(1e18).div(_totalDeposited));

    	// if not allowed to mint it's just like the emission rate = 0. So just update the lastBlock.
    	// always update last block 
    	lastBlock = block.number;
    }

    // decentralized rescue function for any stuck tokens, will return to governance
    function rescue(address _token, uint256 _amount) nonReentrant external {
        require(msg.sender == governance, "LPGAUGE: !governance");

        if (_token != address(0)){
            IERC20(_token).safeTransfer(governance, _amount);
        }
        else { // if _tokenContract is 0x0, then escape ETH
            governance.transfer(_amount);
        }
    }
}