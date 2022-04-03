//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../interfaces/INFTPricingMechanism.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "hardhat/console.sol";

/**
 * @title A vault for staking NFTs and ERC20 tokens
 * @author Jean-LoÏc Mugnier
 * @notice Such contract can be used to stake NFT that will generate reedemable ERC20 type of token overtime, while NFT is Staked.
 * @dev fully tested. v1.
 */
contract NFTPricingMechanism is INFTPricingMechanism {
    using SafeMath for uint256;

    uint8 public constant _RANDOMMODULO = 50;
    // value associated to an NFT
    mapping(uint256 => uint256) public nftValue;
    // is NFT is Set
    mapping(uint256 => bool) public trackedNFTs;

    constructor() {}

    function getNFTValue(uint256 _tokenId)
        public
        view
        override
        returns (uint256)
    {
        require(trackedNFTs[_tokenId], "NFT not yet tracked.");
        return nftValue[_tokenId];
    }

    /**
     * @notice Calculates NFT value. for now, random value is attributed
     * @dev for now uses a pseudo random algorithm based on nft value
     * @param _tokenId to be used as a pseudo random value.
     
     */
    function calculateNFTValue(uint256 _tokenId) public override {
        trackedNFTs[_tokenId] = true;
        nftValue[_tokenId] = unsafeNFTRandomValue(_tokenId);
    }

    /**
     * @notice Calculate of random number.
     * @dev Unsafe random calculation. for random numbers migrate to Chainlink VRF.
     * @param _pseudoRandomNumber a pseudo random number that the miner does not control.
     * @return _pseudoRandomNumber a pseudo random number.
     */
    function unsafeNFTRandomValue(uint256 _pseudoRandomNumber)
        public
        view
        returns (uint256)
    {
        uint256 random = uint256(
            keccak256(
                abi.encodePacked(
                    block.difficulty,
                    block.timestamp,
                    _pseudoRandomNumber
                )
            )
        );
        uint256 randomValue = uint256((random % _RANDOMMODULO) + 1); // between 1 and 50
        return randomValue;
    }
}
