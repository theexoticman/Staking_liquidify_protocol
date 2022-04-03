//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "hardhat/console.sol";

/**
 * @title Manages the list of different staking ools
 * @author Jean-LoÏc Mugnier
 * @notice Such contract can be used to stake NFT that will generate reedemable ERC20 type of token overtime, while NFT is Staked.
 * @dev fully tested. v1.
 */
contract OGGStaking {
    using SafeMath for uint256;

    address public immutable allowedNFT;

    struct NFTForRewardMetadata {
        address owner;
        uint256 value;
        uint256 stakeTime;
        uint256 rewardCalculationEpoch;
        uint256 reward;
        bool isStaked;
    }

    // NFT staking for reward
    mapping(uint256 => NFTForRewardMetadata) public registeredNFTForReward;

    struct NFTForLiquidMetadata {
        address owner;
        uint256 value;
        uint256 stakeTime;
        bool isRedeemed;
        bool isStaked;
    }

    // NFT staking for liquid tokens.
    mapping(uint256 => NFTForLiquidMetadata)
        public registeredNFTForLiquidNFTToken;

    constructor(address _allowedNFT) {
        require(
            address(_allowedNFT) != address(0),
            "Zero account cannot be used"
        );
        allowedNFT = _allowedNFT;
    }
}
