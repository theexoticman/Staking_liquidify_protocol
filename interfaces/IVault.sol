//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IVault {
    event NFTRegistered(address indexed owner, uint256 tokenId);
    event NFTRegisteredForFractions(address indexed owner, uint256 tokenId);
    event NFTUnregisteredForFractions(address indexed owner, uint256 tokenId);
    event NFTUnregistered(address indexed owner, uint256 tokenId);
    event TokensMinted(address account, uint256 amount);
    event StakingFractionTokenClaimed(address account, uint256 amount);

    function stakeNFT(uint256 tokenId) external;

    function unstakeNFT(uint256 tokenId) external;
    
    function stakeNFTFractions(uint256 tokenId) external;

    function acquireNFTwithFractions(uint256 tokenId) external;

    function claimRewardTokens(uint256 tokenId) external;

    function adminMint(address account, uint256 amount) external;

    //function adminMintStakingToken(address account, uint256 amount) external;
}
