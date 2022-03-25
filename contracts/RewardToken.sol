//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../interfaces/IRewardToken.sol";

// Simple ERC20 token to be distributed as a reward to NFT stakers
contract RewardToken is ERC20, IRewardToken {
    address public immutable minter;

    constructor(
        string memory name_,
        string memory symbol_,
        address _minter
    ) ERC20(name_, symbol_) {
        minter = _minter;
    }

    function mint(address account, uint256 amount) external override {
        require(msg.sender == minter, "Only minter can mint reward tokens");
        _mint(account, amount);
    }
}
