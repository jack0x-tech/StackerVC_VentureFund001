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

contract FarmBossV1_USDC is FarmBossV1 {
	using SafeERC20 for IERC20;
	using SafeMath for uint256;
	using Address for address;

	// breaking some constants out here, getting stack ;) issues

	// CRV FUNCTIONS
	bytes4 constant private add_liquidity_2 = 0x0b4c7e4d;
	bytes4 constant private add_liquidity_3 = 0x4515cef3;
	bytes4 constant private add_liquidity_4 = 0x029b2f34;

	bytes4 constant private add_liquidity_u_2 = 0xee22be23;
	bytes4 constant private add_liquidity_u_3 = 0x2b6e993a;

	bytes4 constant private remove_liquidity_one_burn = 0x517a55a3;
	bytes4 constant private remove_liquidity_one = 0x1a4d01d2;

	bytes4 constant private remove_liquidity_4 = 0x18a7bd76;

	// YEARN FUNCTIONS
	bytes4 constant private deposit = 0xb6b55f25; // deposit(uint256 _amount)
	bytes4 constant private withdraw = 0x2e1a7d4d; // withdraw(uint256 _shares)

	// COMP FUNCTIONS
	bytes4 constant private mint_ctoken = 0xa0712d68; // mint(uint256 mintAmount)
	bytes4 constant private redeem_ctoken = 0xdb006a75; // redeem(uint256 redeemTokens)
	bytes4 constant private claim_COMP = 0x1c3db2e0; // claimComp(address holder, address[] cTokens)
	bytes4 constant private swap_erc20_1inch = 0x90411a32; // swap(address,address,address,address,address,uint256,uint256,uint256,uint256,address,bytes,uint256,uint256,uint256,bytes)

	constructor(address payable _governance, address _treasury, address _underlying) public FarmBossV1(_governance, _treasury, _underlying){
	}

	function _initFirstFarms() internal override {

		/*
			For our intro USDC strategies, we are mostly relying on yEarn and their genius veCrv boost contracts.
			We also allow compound.finance deposits, as a reserve, and we can sell $COMP on 1inch.exchange.
			Aave is not supported for now, we need to make a safe-wrapper contracts because you can deposit w/ a _creditTo_ variable.
			--> We would need to not allow this variable to be populated w/ anything besides msg.sender to allow this.
		*/

		////////////// ALLOW crv3Pool & yEarn //////////////

		/*
			CRV Notes:
				add_liquidity takes a fixed size array of input, so it will change the function signature
				0x0b4c7e4d --> 2 coin pool --> add_liquidity(uint256[2] uamounts, uint256 min_mint_amount)
				0x4515cef3 --> 3 coin pool --> add_liquidity(uint256[3] amounts, uint256 min_mint_amount)
				0x029b2f34 --> 4 coin pool --> add_liquidity(uint256[4] amounts, uint256 min_mint_amount)

				0xee22be23 --> 2 coin pool underlying --> add_liquidity(uint256[2] _amounts, uint256 _min_mint_amount, bool _use_underlying)
				0x2b6e993a -> 3 coin pool underlying --> add_liquidity(uint256[3] _amounts, uint256 _min_mint_amount, bool _use_underlying)

				remove_liquidity_one_coin has an optional end argument, bool donate_dust

				0x517a55a3 --> remove_liquidity_one_coin(uint256 _token_amount, int128 i, uint256 min_uamount, bool donate_dust)
				0x1a4d01d2 --> remove_liquidity_one_coin(uint256 _token_amount, int128 i, uint256 min_amount)

				remove_liquidity_imbalance takes a fixes array of input too
				0x18a7bd76 --> 4 coin pool --> remove_liquidity_imbalance(uint256[4] amounts, uint256 max_burn_amount)
		*/

		// CRV FUNCTIONS
		// bytes4 add_liquidity_2 = 0x0b4c7e4d;
		// bytes4 add_liquidity_3 = 0x4515cef3;
		// bytes4 add_liquidity_4 = 0x029b2f34;

		// bytes4 add_liquidity_u_2 = 0xee22be23;
		// bytes4 add_liquidity_u_3 = 0x2b6e993a;

		// bytes4 remove_liquidity_one_burn = 0x517a55a3;
		// bytes4 remove_liquidity_one = 0x1a4d01d2;

		// bytes4 remove_liquidity_4 = 0x18a7bd76;

		// // YEARN FUNCTIONS
		// bytes4 deposit = 0xb6b55f25; // deposit(uint256 _amount)
		// bytes4 withdraw = 0x2e1a7d4d; // withdraw(uint256 _shares)

		// deposit USDC to 3Pool, receive _crv3PoolToken
		address _crv3Pool = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
		address _crv3PoolToken = 0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490;
		IERC20(underlying).safeApprove(_crv3Pool, MAX_UINT256); // can set directly to value, called on contract init
		whitelist[_crv3Pool][add_liquidity_3] = true;
		whitelist[_crv3Pool][remove_liquidity_one] = true;

		// deposit _crv3PoolToken to yEarn, receive yCrv3Pool
		address _yearn3Pool = 0x9cA85572E6A3EbF24dEDd195623F188735A5179f;
		IERC20(_crv3PoolToken).safeApprove(_yearn3Pool, MAX_UINT256); 
		whitelist[_yearn3Pool][deposit] = true; 
		whitelist[_yearn3Pool][withdraw] = true; 
		////////////// END ALLOW crv3Pool & yEarn //////////////

		////////////// ALLOW crvSUSD & yEarn //////////////
		// deposit USDC to pool, receive _crvSUSDToken
		// this is a weird pool, like it was configured for lending accidentally... we will allow the swap and zap contract both
		address _crvSUSDPool = 0xA5407eAE9Ba41422680e2e00537571bcC53efBfD;
		address _crvSUSDToken = 0xC25a3A3b969415c80451098fa907EC722572917F;
		IERC20(underlying).safeApprove(_crvSUSDPool, MAX_UINT256);
		whitelist[_crvSUSDPool][add_liquidity_4] = true;
		whitelist[_crvSUSDPool][remove_liquidity_4] = true;

		address _yearnSUSDPool = 0x5533ed0a3b83F70c3c4a1f69Ef5546D3D4713E44;
		IERC20(_crvSUSDToken).safeApprove(_yearnSUSDPool, MAX_UINT256);
		whitelist[_yearnSUSDPool][deposit] = true;
		whitelist[_yearnSUSDPool][withdraw] = true;

		address _crvSUSDWithdraw = 0xFCBa3E75865d2d561BE8D220616520c171F12851; // because crv frontend is misconfigured to think this is a lending pool
		IERC20(_crvSUSDToken).safeApprove(_crvSUSDWithdraw, MAX_UINT256);
		IERC20(underlying).safeApprove(_crvSUSDWithdraw, MAX_UINT256); // unneeded
		whitelist[_crvSUSDWithdraw][add_liquidity_4] = true; // add_liquidity(uint256[4] _deposit_amounts, uint256 _min_mint_amount)
		whitelist[_crvSUSDWithdraw][remove_liquidity_one_burn] = true; // remove_liquidity_one_coin(uint256 _token_amount, int128 i, uint256 min_uamount, bool donate_dust)
		////////////// END ALLOW crvSUDC & yEarn //////////////

		////////////// ALLOW crvCOMP & yEarn //////////////
		address _crvCOMPDeposit = 0xeB21209ae4C2c9FF2a86ACA31E123764A3B6Bc06;
		address _crvCOMPToken = 0x845838DF265Dcd2c412A1Dc9e959c7d08537f8a2;
		IERC20(underlying).safeApprove(_crvCOMPDeposit, MAX_UINT256);
		IERC20(_crvCOMPToken).safeApprove(_crvCOMPDeposit, MAX_UINT256); // allow withdraws, lending pool
		whitelist[_crvCOMPDeposit][add_liquidity_2] = true;
		whitelist[_crvCOMPDeposit][remove_liquidity_one_burn] = true;

		address _yearnCOMPPool = 0x629c759D1E83eFbF63d84eb3868B564d9521C129;
		IERC20(_crvCOMPToken).safeApprove(_crvCOMPDeposit, MAX_UINT256);
		whitelist[_yearnCOMPPool][deposit] = true;
		whitelist[_yearnCOMPPool][withdraw] = true;
		////////////// END ALLOW crvCOMP & yEarn //////////////

		////////////// ALLOW crvBUSD & yEarn //////////////
		address _crvBUSDDeposit = 0xb6c057591E073249F2D9D88Ba59a46CFC9B59EdB;
		address _crvBUSDToken = 0x3B3Ac5386837Dc563660FB6a0937DFAa5924333B;
		IERC20(underlying).safeApprove(_crvBUSDDeposit, MAX_UINT256);
		IERC20(_crvBUSDToken).safeApprove(_crvBUSDDeposit, MAX_UINT256);
		whitelist[_crvBUSDDeposit][add_liquidity_4] = true;
		whitelist[_crvBUSDDeposit][remove_liquidity_one_burn] = true;

		address _yearnBUSDPool = 0x2994529C0652D127b7842094103715ec5299bBed;
		IERC20(_crvBUSDToken).safeApprove(_yearnBUSDPool, MAX_UINT256);
		whitelist[_yearnBUSDPool][deposit] = true;
		whitelist[_yearnBUSDPool][withdraw] = true;
		////////////// END ALLOW crvBUSD & yEarn //////////////

		////////////// ALLOW crvAave & yEarn //////////////
		address _crvAavePool = 0xDeBF20617708857ebe4F679508E7b7863a8A8EeE; // new style lending pool w/o second approve needed... direct burn from msg.sender
		address _crvAaveToken = 0xFd2a8fA60Abd58Efe3EeE34dd494cD491dC14900;
		IERC20(underlying).safeApprove(_crvAavePool, MAX_UINT256);
		whitelist[_crvAavePool][add_liquidity_u_3] = true;
		whitelist[_crvAavePool][remove_liquidity_one_burn] = true;

		address _yearnAavePool = 0x03403154afc09Ce8e44C3B185C82C6aD5f86b9ab;
		IERC20(_crvAaveToken).safeApprove(_yearnAavePool, MAX_UINT256);
		whitelist[_yearnAavePool][deposit] = true;
		whitelist[_yearnAavePool][withdraw] = true;
		////////////// END ALLOW crvAave & yEarn //////////////

		////////////// ALLOW crvYpool & yEarn //////////////
		address _crvYDeposit = 0xbBC81d23Ea2c3ec7e56D39296F0cbB648873a5d3;
		address _crvYToken = 0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8;
		IERC20(underlying).safeApprove(_crvYDeposit, MAX_UINT256);
		IERC20(_crvYToken).safeApprove(_crvYDeposit, MAX_UINT256); // allow withdraws, lending pool
		whitelist[_crvYDeposit][add_liquidity_4] = true;
		whitelist[_crvYDeposit][remove_liquidity_one_burn] = true;

		address _yearnYPool = 0x5dbcF33D8c2E976c6b560249878e6F1491Bca25c; // yearnception
		IERC20(_crvYToken).safeApprove(_yearnYPool, MAX_UINT256);
		whitelist[_yearnYPool][deposit] = true;
		whitelist[_yearnYPool][withdraw] = true;
		////////////// END ALLOW crvYpool & yEarn //////////////

		////////////// ALLOW crvSAave & yEarn //////////////
		address _crvSAavePool = 0xEB16Ae0052ed37f479f7fe63849198Df1765a733; // new style lending pool w/o second approve needed... direct burn from msg.sender
		address _crvSAaveToken = 0x02d341CcB60fAaf662bC0554d13778015d1b285C;
		IERC20(underlying).safeApprove(_crvSAavePool, MAX_UINT256);
		whitelist[_crvSAavePool][add_liquidity_u_2] = true;
		whitelist[_crvSAavePool][remove_liquidity_one_burn] = true;

		address _yearnSAavePool = 0xBacB69571323575C6a5A3b4F9EEde1DC7D31FBc1;
		IERC20(_crvSAaveToken).safeApprove(_yearnSAavePool, MAX_UINT256);
		whitelist[_yearnSAavePool][deposit] = true;
		whitelist[_yearnSAavePool][withdraw] = true;
		////////////// END ALLOW crvSAave & yEarn //////////////

		////////////// ALLOW yEarn USDC //////////////
		address _yearnUSDC = 0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9;
		IERC20(underlying).safeApprove(_yearnUSDC, MAX_UINT256);
		whitelist[_yearnUSDC][deposit] = true;
		whitelist[_yearnUSDC][withdraw] = true;
		////////////// END ALLOW yEarn USDC //////////////

		////////////// ALLOW Compound USDC //////////////
		address _compUSDC = 0x39AA39c021dfbaE8faC545936693aC917d5E7563;
		IERC20(underlying).safeApprove(_compUSDC, MAX_UINT256);
		whitelist[_compUSDC][mint_ctoken] = true;
		whitelist[_compUSDC][redeem_ctoken] = true;

		address _comptroller = 0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B; // claimComp
		whitelist[_comptroller][claim_COMP] = true;

		address _COMP = 0xc00e94Cb662C3520282E6f5717214004A7f26888; // allow COMP sell on 1inch
		address _1inchEx = 0x111111125434b319222CdBf8C261674aDB56F3ae;
		IERC20(_COMP).safeApprove(_1inchEx, MAX_UINT256);
		whitelist[_1inchEx][swap_erc20_1inch] = true;
		////////////// END ALLOW Compound USDC //////////////
	}
}