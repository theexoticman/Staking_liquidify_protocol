//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IVault {
    
    event NFTRegistered(address indexed owner, uint256 tokenId);
    event NFTRegisteredForLiquid(address indexed owner, uint256 tokenId);
    event NFTUnregistered(address indexed owner, uint256 tokenId);
    event RewardTokensMinted(address account, uint256 amount);
    event LiquidNFTTokenRedeemed(address account, uint256 amount);

    //Liquid Token Events

    event LiquidNFTTokensDeposited(address account, uint256 amount);
    event StakedLiquidTokensWithdrew(address account, uint256 amount);
    event LiquidVaultRewardUpdated(address account, uint256 amount);
    event NFTUnregisteredForLiquidToken(address indexed owner, uint256 tokenId);
    event RewardTokensClaimed(address account, uint256 amount);

    // NFT Staking for reward vault
    function adminMint(address account, uint256 amount) external;

    function claimRewardTokens(uint256 tokenId) external;

    function stakeForRewardToken(uint256 tokenId) external;

    function updateNFTVaultReward(uint256 tokenId) external;

    function unstakeForRewardToken(uint256 tokenId) external;

    //  NFT Staking for fractions Vault
    function acquireNFTwithLiquidToken(uint256 tokenId) external;

    function depositLiquidNFTTokens(uint256 amount) external;

    function redeemLiquidTokens(uint256 _tokenId) external;

    function redeemRewardTokensLiquidStaking() external;

    function stakeForLiquidNFT(uint256 tokenId) external;

    function updateLiquidVaultReward(address account) external;

    function withdrawStakedLiquidTokens(uint256 amount) external;
}
