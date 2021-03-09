// SPDX-License-Identifier: MIT
/*

*/

pragma solidity ^0.6.11;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol"; // call ERC20 safely
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "./FarmTreasuryV1.sol";

abstract contract FarmBossV1 {
	using SafeERC20 for IERC20;
	using SafeMath for uint256;
	using Address for address;

	mapping(address => mapping(bytes4 => bool)) public whitelist; // contracts -> mapping (functionSig -> allowed)
	mapping(address => bool) public farmers;


	// for passing to functions more cleanly
	struct WhitelistData {
		address account;
		bytes4 fnSig;
	}

	// for passing to functions more cleanly
	struct Approves{
		address token;
		address allow;
	}

	address payable public governance;
	address public treasury;
	address public underlying;

	uint256 public constant LOOP_LIMIT = 200;
	uint256 public constant MAX_UINT256 = 2**256 - 1; // aka: 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff

	event NewFarmer(address _farmer);
	event RmFarmer(address _farmer);

	event NewWhitelist(address _contract, bytes4 _fnSig);
	event RmWhitelist(address _contract, bytes4 _fnSig);

	event NewApproval(address _token, address _contract);
	event RmApproval(address _token, address _contract);

	event Executed(bytes _returnData);
	event Failed(bytes _returnData);

	constructor(address payable _governance, address _treasury, address _underlying) public {
		governance = _governance;
		treasury = _treasury;
		underlying = _underlying;

		farmers[msg.sender] = true;
		// no need to set to zero first on safeApprove, is brand new contract
		IERC20(_underlying).safeApprove(_treasury, MAX_UINT256); // treasury has full control over underlying in this contract

		_initFirstFarms();
	}

	// some fixed logic to set up the first farmers, farms, whitelists, approvals, etc.
	// future farms will need to be approved by governance
	// called on init only
	function _initFirstFarms() internal virtual;

	function setGovernance(address payable _new) external {
		require(msg.sender == governance, "FARMBOSSV1: !governance");

		governance = _new;
	}

	function changeFarmers(address[] calldata _newFarmers, address[] calldata _rmFarmers) external {
		require(msg.sender == governance, "FARMBOSSV1: !governance");
		require(_newFarmers.length <= LOOP_LIMIT && _rmFarmers.length <= LOOP_LIMIT, "FARMBOSSV1: >LOOP_LIMIT"); //  dont allow unbounded loops

		// add the new farmers in
		for (uint256 i = 0; i < _newFarmers.length; i++){
			farmers[_newFarmers[i]] = true;

			emit NewFarmer(_newFarmers[i]);
		}
		// remove farmers
		for (uint256 j = 0; j < _rmFarmers.length; j++){
			farmers[_rmFarmers[j]] = false;

			emit RmFarmer(_rmFarmers[j]);
		}
	}

	function addWhitelist(WhitelistData[] calldata _newActions, WhitelistData[] calldata _rmActions, Approves[] calldata _newApprovals, Approves[] calldata _newDepprovals) external {
		
		require(msg.sender == governance, "FARMBOSSV1: !governance");
		require(_newActions.length.add(_rmActions.length).add(_newApprovals.length).add(_newDepprovals.length) <= LOOP_LIMIT);

		// add to whitelist
		for (uint256 i = 0; i < _newActions.length; i++){
			whitelist[_newActions[i].account][_newActions[i].fnSig] = true;

			emit NewWhitelist(_newActions[i].account, _newActions[i].fnSig);
		}
		// remove from whitelist
		for (uint256 j = 0; j < _rmActions.length; j++){
			whitelist[_rmActions[j].account][_rmActions[j].fnSig] = false;

			emit RmWhitelist(_rmActions[j].account, _rmActions[j].fnSig);
		}
		// approve safely, needs to be set to zero, then max.
		for (uint256 k = 0; k < _newApprovals.length; k++){
			IERC20(_newApprovals[k].token).safeApprove(_newApprovals[k].allow, 0);
			IERC20(_newApprovals[k].token).safeApprove(_newApprovals[k].allow, MAX_UINT256);

			emit NewApproval(_newApprovals[k].token, _newApprovals[k].allow);
		}
		// de-approve these contracts
		for (uint256 l = 0; l < _newDepprovals.length; l++){
			IERC20(_newDepprovals[l].token).safeApprove(_newDepprovals[l].allow, 0);

			emit RmApproval(_newDepprovals[l].token, _newDepprovals[l].allow);
		}
	}

	function govExecute(address payable _target, uint256 _value, bytes calldata _data) external returns (bool){
		require(msg.sender == governance, "FARMBOSSV1: !governance");

		 return _execute(_target, _value, _data);
	}

	function farmerExecute(address payable _target, uint256 _value, bytes calldata _data) external returns (bool){
		require(farmers[msg.sender], "FARMBOSSV1: !farmer");
		
		require(_checkContractAndFn(_target, _value, _data), "FARMBOSSV1: target.fn() not allowed. ask DAO for approval.");
		return _execute(_target, _value, _data);
	}

	// farmer is NOT allowed to call the functions approve, transfer on an ERC20
	// this will give the farmer direct control over assets held by the contract
	// governance must approve() farmer to interact with contracts & whitelist these contracts
	// even if contracts are whitelisted, farmer cannot call transfer/approve (many vault strategies will have ERC20 inheritance)
	// these approvals must also be called when setting up a new strategy from governance

	// if there is a strategy that has additonal functionality for the farmer to take control of assets ie: Uniswap "add a send"
	// then a "safe" wrapper contract must be made, ie: you can call Uniswap but "add a send is disabled, only msg.sender in this field"
	// strategies must be checked carefully so that farmers cannot take control of assets. trustless farming!
	function _checkContractAndFn(address _target, uint256 _value, bytes calldata _data) internal view returns(bool) {
		bytes4 _fnSig;
		if (_data.length < 4){ // we are calling a payable function
			_fnSig = 0x00000000;
		}
		else { // we are calling a normal function, get the function signature from the calldata
			_fnSig = abi.decode(_data[:4], (bytes4)); // truncates all but the first 4 bytes, will be the function sig
		}
		
		bytes4 _transferSig = 0xa9059cbb;
		bytes4 _approveSig = 0x095ea7b3;
		if (_fnSig == _transferSig || _fnSig == _approveSig || !whitelist[_target][_fnSig]){
			return false;
		}

		_value; // squelch, we don't check value in V1
		
		// require(_fnSig != _transferSig && _fnSig != _approveSig, "FARMBOSSV1: farmer not allowed to transfer/approve ERC20");
		// require(whitelist[_target][_fnSig], "FARMBOSSV1: target.fn() not allowed. ask DAO for approval.");
		return true;
	}

	// call arbitrary contract & function, forward all gas, return success? & data
	function _execute(address payable _target, uint256 _value, bytes memory _data) internal returns (bool){
		(bool _success, bytes memory _returnData) = _target.call{value: _value}(_data);

		if (_success){
			emit Executed(_returnData);
		}
		else {
			emit Failed(_returnData);
		}

		return _success;
	}

	// we can call this function from farmer/govExecute, but let's make it easy
	function rebalanceUp(uint256 _amount, address _farmerRewards) external {
		require(msg.sender == governance || farmers[msg.sender], "FARMBOSSV1: !(governance || farmer)");

		FarmTreasuryV1(treasury).rebalanceUp(_amount, _farmerRewards);
	}

	function rescue(address _token, uint256 _amount) external {
        require(msg.sender == governance, "FARMTREASURYV1: !governance");

        if (_token != address(0)){
            IERC20(_token).safeTransfer(governance, _amount);
        }
        else { // if _tokenContract is 0x0, then escape ETH
            governance.transfer(_amount);
        }
    }
}