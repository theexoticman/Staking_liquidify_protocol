//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

/**
 * @title A vault for staking ERC20 Liquid Tokens. Stakers will be rewarded with ERC20 Reward Tokens
 * @author Jean-LoÏc Mugnier
 * @notice Such contract can be used to stake NFT that will generate reedemable ERC20 type of token overtime, while NFT is Staked.
 * @dev fully tested. v1.
 */
interface ILiquidVault {
    event RewardTokensMinted(address account, uint256 amount);
    event StakedLiquidTokensWithdrew(address account, uint256 amount);
    event LiquidVaultRewardUpdated(address account, uint256 amount);
    event LiquidNFTTokensDeposited(address from,address to, uint256 amount);

    function setRewardToken(address _rewardToken) external;

    function setLiquidNFTToken(address _liquidNFTToken) external;

    function depositLiquidNFTTokens(uint256 _amount) external;

    function withdrawStakedLiquidTokens(uint256 _amount) external;

    function redeemRewardTokensLiquidStaking() external;

    function updateLiquidVaultReward(address _account) external;
}
