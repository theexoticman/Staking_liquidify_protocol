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
    uint8 MINTERNUMBER = 2;
    address public immutable vaultMinter;
    address public immutable liquidVaultMinter;

    constructor(
        string memory name_,
        string memory symbol_,
        address _minter1,
        address _minter2
    ) ERC20(name_, symbol_) {
        require(address(_minter1) != address(0), "mint zero address");
        require(address(_minter2) != address(0), "mint zero address");
        vaultMinter = _minter1;
        liquidVaultMinter = _minter2;
    }

    function mint(address account, uint256 amount) external override {
        require(
            msg.sender == vaultMinter || msg.sender == liquidVaultMinter,
            "Only minter can mint reward tokens"
        );
        _mint(account, amount);
    }

    function decimals() public view virtual override returns (uint8) {
        return 16;
    }
}
