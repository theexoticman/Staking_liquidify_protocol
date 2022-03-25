//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface ISimpleNFT {
    function mintNFT() external returns (uint256);

    function isApprovedOrOwner(address user, uint256 tokenID)
        external
        view
        returns (bool);
}
