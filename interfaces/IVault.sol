//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IVault {
    event NFTRegistered(address indexed owner, uint256 tokenID);
    event NFTUnregistered(address indexed owner, uint256 tokenID);
    event TokensMinted(address account, uint256 amount);

    function stakeNFT(uint256 tokenID) external;

    function unstakeNFT(uint256 tokenID) external;

    function adminMint(address account, uint256 amount) external;
}
