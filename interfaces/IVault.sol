//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IVault {
    event RewardTokensMinted(address account, uint256 amount);
    event NFTRegistered(address indexed owner, uint256 tokenId);
    event NFTUnregistered(address indexed owner, uint256 tokenId);

    //Liquid Token Events

    event LiquidVaultRewardUpdated(address account, uint256 amount);
    event NFTUnregisteredForLiquidToken(address indexed owner, uint256 tokenId);

    // NFT Staking for reward vault
    function adminMint(address account, uint256 amount) external;

    function claimRewardTokens(uint256 tokenId) external;

    function stakeForRewardToken(uint256 tokenId) external;

    function updateNFTVaultReward(uint256 tokenId) external;

    function unstakeForRewardToken(uint256 tokenId) external;

    function isStaked(uint256 tokenId) external view returns (bool);
}
