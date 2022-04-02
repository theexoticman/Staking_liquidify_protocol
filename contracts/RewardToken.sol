//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../interfaces/IRewardToken.sol";

/**
 * @title an ERC20 specific token implementation.
 * @notice To be used as an ERC20 token token that can only be minted by a specific user or smart contract
 * @dev only the minter can mint new tokens. minter is passed at construction time.
 */
contract RewardToken is ERC20, IRewardToken {
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

    function decimals() public view virtual override returns (uint8) {
        return 16;
    }
}
