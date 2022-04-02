//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title an simple NFT specific smart contract
 * @notice To be used as an ERC721 token.
 * @dev only the minter can mint new tokens. minter is passed a construction time
 */
contract SimpleNFT is ERC721, Ownable {
    uint256 public totalSupply;
    event NFTMinted(address account, uint256 tokenId);

    constructor() ERC721("SimpleNFT", "NFT") {}


    function _baseURI() internal view virtual override returns (string memory) {
        return "www.SimpleNFTURI.com/";
    }

    function mint(address account) external onlyOwner returns (uint256) {
        uint256 newItemId = totalSupply; // starting the elements index at 0 instead of 1.
        _safeMint(account, newItemId);
        totalSupply += 1;
        emit NFTMinted(account, newItemId);
        return newItemId;
    }

    function isApprovedOrOwner(address user, uint256 tokenId)
        external
        view
        returns (bool)
    {
        return _isApprovedOrOwner(user, tokenId);
    }
}
