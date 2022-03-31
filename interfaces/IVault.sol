//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IVault {
    event NFTRegistered(address indexed owner, uint256 tokenID);
    event NFTUnregistered(address indexed owner, uint256 tokenID);
    event TokensMinted(address account, uint256 amount);
    event StakingFractionTokenClaimed(address account, uint256 amount);
    
    function stakeNFT(uint256 tokenID) external;

    function unstakeNFT(uint256 tokenID) external;

    function claimRewards(uint256 tokenId) external;

    function adminMint(address account, uint256 amount) external;
    
    //function adminMintStakingToken(address account, uint256 amount) external;
}
