//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IStakingFractionToken is IERC20 {
    
    event Burn(address account, uint256 amount);

    function mint(address account, uint256 amount) external;

    function getPrice() external view returns(uint256);
    
    function burn(address account, uint256 amount) external;
}
