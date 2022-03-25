//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "../interfaces/IVault.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../interfaces/ISimpleNFT.sol";
import "../interfaces/IRewardToken.sol";

// Allows staking of NFTs and can mint rewards in accordance
contract Vault is IVault, Ownable {
    struct RegistrationMetadata {
        address owner;
        uint256 value;
        uint256 stakeTime;
    }

    address public immutable allowedNFT;
    IRewardToken public rewardToken;
    mapping(uint256 => RegistrationMetadata) registeredTokens;

    mapping(uint256 => mapping(address => bool)) approvals;

    constructor(address _allowedNFT) {
        allowedNFT = _allowedNFT;
    }

    function setRewardToken(address _rewardToken) external onlyOwner {
        require(address(rewardToken) == address(0), "reward token already set");
        rewardToken = IRewardToken(_rewardToken);
    }

    function adminMint(address account, uint256 amount)
        external
        override
        onlyOwner
    {
        _mintRewards(account, amount);
    }

    function stakeNFT(uint256 tokenID) external override {
        require(_isAuthorized(tokenID, msg.sender), "Unauthorized user");
        require(
            _isAuthorized(tokenID, address(this)),
            "Vault requries authorization"
        );
        address owner = IERC721(allowedNFT).ownerOf(tokenID);
        registeredTokens[tokenID].owner = owner;
        registeredTokens[tokenID].value = 50e18;
        registeredTokens[tokenID].stakeTime = block.timestamp;
        IERC721(allowedNFT).transferFrom(owner, address(this), tokenID);
        emit NFTRegistered(owner, tokenID);
    }

    function unstakeNFT(uint256 tokenID) external override {
        require(
            msg.sender == registeredTokens[tokenID].owner,
            "Only owner can ustake"
        );
        address owner = registeredTokens[tokenID].owner;
        IERC721(allowedNFT).transferFrom(address(this), owner, tokenID);
        delete registeredTokens[tokenID];
        emit NFTUnregistered(owner, tokenID);
    }

    function _isAuthorized(uint256 tokenID, address user)
        internal
        view
        returns (bool)
    {
        return ISimpleNFT(allowedNFT).isApprovedOrOwner(user, tokenID);
    }

    function _isStaked(uint256 tokenID) internal view returns (bool) {
        uint256 value = registeredTokens[tokenID].value;
        return
            value != 0 && IERC721(allowedNFT).ownerOf(tokenID) == address(this);
    }

    function _mintRewards(address account, uint256 amount) internal {
        rewardToken.mint(account, amount);
        emit TokensMinted(account, amount);
    }
}
