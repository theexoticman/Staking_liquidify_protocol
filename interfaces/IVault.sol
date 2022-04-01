//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IVault {
    event NFTRegistered(address indexed owner, uint256 tokenId);
    event NFTRegisteredForFractions(address indexed owner, uint256 tokenId);
    event NFTUnregisteredForFractions(address indexed owner, uint256 tokenId);
    event NFTUnregistered(address indexed owner, uint256 tokenId);
    event RewardTokensMinted(address account, uint256 amount);
    event StakingFractionTokenRedeemed(address account, uint256 amount);

    //Fraction Events
    event StakingFractionTokensDeposited(address account, uint256 amount);
    event StakedFractionTokensWithdrew(address account, uint256 amount);
    event FractionVaultRewardUpdated(address account, uint256 amount);
    event RewardTokensClaimed(address account, uint256 amount);

    function stakeNFT(uint256 tokenId) external;

    function unstakeNFT(uint256 tokenId) external;
    
    function stakeNFTFractions(uint256 tokenId) external;

    function acquireNFTwithFractions(uint256 tokenId) external;

    function claimRewardTokens(uint256 tokenId) external;

    function adminMint(address account, uint256 amount) external;

    //Fraction Vault related
    function depositStakingFractionTokens(uint256 amount) external;
    function withdrawStakedFractionTokens(uint256 amount) external;
    function updateFractionVaultReward(address account) external;
    function redeemRewardTokensFractionStaking() external;
}
