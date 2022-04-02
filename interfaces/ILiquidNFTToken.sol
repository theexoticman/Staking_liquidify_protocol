//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title an ERC20 token specific interface.
 * @author Jean-LoÏc Mugnier
 */
interface ILiquidNFTToken is IERC20 {
    event Burn(address account, uint256 amount);

    function mint(address account, uint256 amount) external;

    function burn(address account, uint256 amount) external;
}
