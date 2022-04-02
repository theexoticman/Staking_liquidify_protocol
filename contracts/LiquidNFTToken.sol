//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../interfaces/ILiquidNFTToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title an ERC20 specific token implementation.
 * @author Jean-LoÏc Mugnier
 * @notice Only used to create liquidity for NFTs, internally. after usage, the NFTs are burnt.
 * @dev only the minter can mint new tokens. minter is passed a deployment time in constructor.
 */
contract LiquidNFTToken is ERC20, ILiquidNFTToken {
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
        emit Burn(account, amount);
    }

    function decimals() public view virtual override returns (uint8) {
        return 16;
    }
}
