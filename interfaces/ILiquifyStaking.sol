//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface ILiquifyStaking {
    event NFTRegisteredForLiquid(address indexed owner, uint256 tokenId);
    event LiquidNFTTokenRedeemed(address account, uint256 amount);
    event LiquidVaultRewardUpdated(address account, uint256 amount);
    event NFTAcquiredWtihLiquid(address indexed owner, uint256 tokenId);

    function setLiquidNFTToken(address _liquidNFTToken) external;

    //  NFT Staking for fractions Vault
    function acquireNFTwithLiquidToken(uint256 tokenId) external;

    function redeemLiquidTokens(uint256 _tokenId) external;

    function isStaked(uint256 tokenId) external view returns (bool);

    function stakeForLiquidNFT(uint256 _tokenId) external;
}
