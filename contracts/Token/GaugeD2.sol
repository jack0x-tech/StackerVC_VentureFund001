// SPDX-License-Identifier: MIT
/*
A simple gauge contract to measure the amount of tokens locked, and reward users in a different token.

Using this for STACK/ETH Uni LP currently.
*/

pragma solidity ^0.6.11;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol"; // call ERC20 safely
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "../Interfaces/IFarmTokenV1.sol";

contract GaugeD2 is IERC20, ReentrancyGuard {
	using SafeERC20 for IERC20;
	using Address for address;
    using SafeMath for uint256;

    address payable public governance = 0xB156d2D9CAdB12a252A9015078fc5cb7E92e656e; // STACK DAO Agent address
    address public constant acceptToken = 0xd78E04a200048a438D9D03C9A3d7E5154dE643b1; // TODO: stackToken rebase token

    // TODO: get STACK token address
    address public constant STACK = 0xe0955F26515d22E347B17669993FCeFcc73c3a0a; // STACK DAO Token

    uint256 public emissionRate = 0; // 60k STACK / delta blocks

    uint256 public depositedShares;

    uint256 public constant startBlock = 0;
    uint256 public endBlock = startBlock + 100;

    uint256 public lastBlock; // last block the distribution has ran
    uint256 public tokensAccrued; // tokens to distribute per weight scaled by 1e18

    // never emitted, only to align with ERC20 spec.
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    struct DepositState {
    	uint256 userShares;
    	uint256 tokensAccrued;
    }

    mapping(address => DepositState) public shares;

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
    	require(msg.sender == governance, "GAUGED2: !governance");
    	_kick(); // catch up the contract to the current block for old rate
    	emissionRate = _new;
    }

    function setEndBlock(uint256 _block) external {
    	require(msg.sender == governance, "GAUGED2: !governance");
    	require(block.number <= endBlock, "GAUGED2: distribution already done, must start another");
        require(block.number <= _block, "GAUGED2: can't set endBlock to past block");
    	
    	endBlock = _block;
    }

    /////////// NOTE: Our gauges now implement mock ERC20 functionality in order to interact nicer with block explorers...
    
    
    function name() external view returns (string memory){
    	return string(abi.encodePacked("gauge-", IFarmTokenV1(acceptToken).name()));
    }
	
	function symbol() external view returns (string memory){
		return string(abi.encodePacked("gauge-", IFarmTokenV1(acceptToken).symbol()));
    }

	function decimals() external view returns (uint8){
		return IFarmTokenV1(acceptToken).decimals();
    }

    function totalSupply() external override view returns (uint256){
    	return IFarmTokenV1(acceptToken).getUnderlyingForShares(depositedShares);
    }

    function balanceOf(address _account) public override view returns (uint256){
    	return IFarmTokenV1(acceptToken).getUnderlyingForShares(shares[_account].userShares);
    }

    // transfer tokens, not shares
    function transfer(address _recipient, uint256 _amount) external override returns (bool){
    	// to squelch
    	_recipient;
    	_amount;

    	revert("transfer not implemented. please withdraw first.");
    }

    function transferFrom(address _sender, address _recipient, uint256 _amount) external override returns (bool){
    	// to squelch
    	_sender;
    	_recipient;
    	_amount;
    	revert("transferFrom not implemented. please withdraw first.");
    }

    // allow tokens, not shares
    function allowance(address _owner, address _spender) external override view returns (uint256){
    	// to squelch
    	_owner;
    	_spender;
    	return 0;
    }

    // approve tokens, not shares
    function approve(address _spender, uint256 _amount) external override returns (bool){
    	// to squelch
    	_spender;
    	_amount;
    	revert("approve not implemented. please withdraw first.");
    }

    //////////

    function deposit(uint256 _amount) nonReentrant external {
    	require(block.number <= endBlock, "GAUGED2: distribution over");

    	_claimSTACK(msg.sender);

    	// trusted contracts
    	IERC20(acceptToken).safeTransferFrom(msg.sender, address(this), _amount);
    	uint256 _sharesFor = IFarmTokenV1(acceptToken).getSharesForUnderlying(_amount);

    	DepositState memory _state = shares[msg.sender];

    	_state.userShares = _state.userShares.add(_sharesFor);
    	depositedShares = depositedShares.add(_sharesFor);

    	emit Deposit(msg.sender, _amount);
    	shares[msg.sender] = _state;
    }

    function withdraw(uint256 _amount) nonReentrant external {
    	_claimSTACK(msg.sender);

    	DepositState memory _state = shares[msg.sender];
    	uint256 _sharesFor = IFarmTokenV1(acceptToken).getSharesForUnderlying(_amount);

    	require(_sharesFor <= _state.userShares, "GAUGED2: insufficient balance");

    	_state.userShares = _state.userShares.sub(_sharesFor);
    	depositedShares = depositedShares.sub(_sharesFor);

    	emit Withdraw(msg.sender, _amount);
    	shares[msg.sender] = _state;

    	IERC20(acceptToken).safeTransfer(msg.sender, _amount);
    }

    function claimSTACK() nonReentrant external returns (uint256) {
    	return _claimSTACK(msg.sender);
    }

    function _claimSTACK(address _user) internal returns (uint256) {
    	_kick();

    	DepositState memory _state = shares[_user];
    	if (_state.tokensAccrued == tokensAccrued){ // user doesn't have any accrued tokens
    		return 0;
    	}
    	else {
    		uint256 _tokensAccruedDiff = tokensAccrued.sub(_state.tokensAccrued);
    		uint256 _tokensGive = _tokensAccruedDiff.mul(_state.userShares).div(1e18);

    		_state.tokensAccrued = tokensAccrued;
    		shares[_user] = _state;

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
    	uint256 _totalDeposited = depositedShares;
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
        require(msg.sender == governance, "GAUGED2: !governance");

        if (_token != address(0)){
            IERC20(_token).safeTransfer(governance, _amount);
        }
        else { // if _tokenContract is 0x0, then escape ETH
            governance.transfer(_amount);
        }
    }
}