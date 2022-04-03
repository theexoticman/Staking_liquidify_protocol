//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface INFTPricingMechanism {
    function calculateNFTValue(uint256 _tokenId) external;

    function getNFTValue(uint256 _tokenId) external view returns (uint256);
}
