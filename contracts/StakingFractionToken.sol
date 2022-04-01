//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../interfaces/IStakingFractionToken.sol";

// Simple ERC20 token to be distributed as a reward to NFT stakers
contract StakingFractionToken is ERC20, IStakingFractionToken {
    address public immutable minter;

    constructor(
        string memory name_,
        string memory symbol_,
        address _minter
    ) ERC20(name_, symbol_) {
        require(address(_minter) != address(0), "mint zero address");
        minter = _minter;
    }

    function mint(address account, uint256 amount) external override {
        require(msg.sender == minter, "Only minter can mint reward tokens");
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external override {
        _burn(account, amount);
    }

    /**
     * @dev TODO get the price externally from dex
     *
     * returns constant price
     *
     */
    function getPrice() public view override returns (uint256) {
        return 1**decimals();
    }

    function decimals() public view virtual override returns (uint8) {
        return 16;
    }
}
