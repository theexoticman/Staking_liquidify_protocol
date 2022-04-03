//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "../interfaces/IVault.sol";
import "../interfaces/INFTPricingMechanism.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./SimpleNFT.sol";
import "../interfaces/IRewardToken.sol";
import "../interfaces/ILiquidNFTToken.sol";
import "../interfaces/ILiquifyStaking.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "hardhat/console.sol";

/**
 * @title A vault for staking NFTs and ERC20 tokens
 * @author Jean-LoÏc Mugnier
 * @notice Such contract can be used to stake NFT that will generate reedemable ERC20 type of token overtime, while NFT is Staked.
 * @dev fully tested. v1.
 */
contract Vault is IVault, Ownable {
    using SafeMath for uint256;

    /**
     *
     * Generic state variables
     *
     */
    ILiquifyStaking public liquify;
    address public immutable allowedNFT;

    IRewardToken public rewardToken;

    INFTPricingMechanism public pricingMechanism;

    struct NFTForRewardMetadata {
        address owner;
        uint256 value;
        uint256 stakeTime;
        uint256 rewardCalculationEpoch;
        uint256 reward;
        bool isStaked;
    }

    // NFT staking for reward
    mapping(uint256 => NFTForRewardMetadata) public registeredNFTForReward;

    constructor(address _allowedNFT) {
        require(
            address(_allowedNFT) != address(0),
            "Zero account cannot be used"
        );
        allowedNFT = _allowedNFT;
    }

    /**
     * @notice set the vault staking for reward smart contract address
     * @dev dependency on pricing mechanism smart contract. deploy it and set its address here.
     * @param _liquify the pricing mechanism address
     */
    function setLiquify(address _liquify) external onlyOwner {
        require(
            address(liquify) == address(0),
            "liquify staking already set"
        );
        liquify = ILiquifyStaking(_liquify);
    }

    /**
     * @notice set the reward token ERC20 token smart contract address
     * @dev dependency on rewardtoken smart contract. deploy it and set its address here.
     * @param _rewardToken the reward token address
     */
    function setRewardToken(address _rewardToken) external onlyOwner {
        require(address(rewardToken) == address(0), "reward token already set");
        rewardToken = IRewardToken(_rewardToken);
    }

    /**
     * @notice set the pricing mechanism smart contract address
     * @dev dependency on pricing mechanism smart contract. deploy it and set its address here.
     * @param _pricingMechanism the pricing mechanism address
     */
    function setPricingMechanism(address _pricingMechanism) external onlyOwner {
        require(
            address(pricingMechanism) == address(0),
            "pricing mechanism already set"
        );
        pricingMechanism = INFTPricingMechanism(_pricingMechanism);
    }

    /**
     * @notice Mints new reward token.
     * @dev only owner should be able to mint.
     * @param _account minting tokens to this accounts.
     * @param _amount minting _amount tokens.
     */
    function adminMint(address _account, uint256 _amount)
        public
        override
        onlyOwner
    {
        _mintRewards(_account, _amount);
    }

    /**
     * @notice To know if _user is authorized to manipulate allowedNFT _tokenId
     * @dev relies on ERC721 isApprovedOrOwner
     * @param _tokenId is the user authorized for this token.
     * @param _user is this user authorized
     */
    function _isAuthorized(uint256 _tokenId, address _user)
        internal
        view
        returns (bool)
    {
        return SimpleNFT(allowedNFT).isApprovedOrOwner(_user, _tokenId);
    }

    /**
     * @notice allow a user to stake their NFTs in the vault. After staking they can be rewarded in reward tokens.
     * @dev NFT value must be calculated with "calculateNFTValue' prior being staked.
     * @param _tokenId allowedNFT tokenId to be unstaked.
     */
    function stakeForRewardToken(uint256 _tokenId) public override {
        require(
            address(pricingMechanism) != address(0),
            "Pricing mechanism not set"
        );
        require(
            !liquify.isStaked(_tokenId),
            "Already staked for liquid."
        );
        require(_isAuthorized(_tokenId, msg.sender), "Unauthorized user");
        require(
            _isAuthorized(_tokenId, address(this)),
            "Vault requeries authorization."
        );
        address owner = IERC721(allowedNFT).ownerOf(_tokenId);

        registeredNFTForReward[_tokenId].owner = owner;
        registeredNFTForReward[_tokenId].value = pricingMechanism.getNFTValue(
            _tokenId
        );
        registeredNFTForReward[_tokenId].stakeTime = block.timestamp;
        registeredNFTForReward[_tokenId].rewardCalculationEpoch = block
            .timestamp;
        registeredNFTForReward[_tokenId].isStaked = true;

        IERC721(allowedNFT).transferFrom(owner, address(this), _tokenId);
        emit NFTRegistered(owner, _tokenId);
    }

    /**
     * @notice Unstake NFT from the reward staking vault.
     * @dev unstake but keep reward so user can claim it later.
     * @param _tokenId allowedNFT tokenId to be unstaked.
     */
    function unstakeForRewardToken(uint256 _tokenId) public override {
        require(
            msg.sender == registeredNFTForReward[_tokenId].owner,
            "Only owner can unstake"
        );
        address owner = registeredNFTForReward[_tokenId].owner;

        IERC721(allowedNFT).transferFrom(address(this), owner, _tokenId);

        // Just keep the reward, Owner and NFT value for a reward staked NFT
        delete registeredNFTForReward[_tokenId].stakeTime;
        delete registeredNFTForReward[_tokenId].rewardCalculationEpoch;
        delete registeredNFTForReward[_tokenId].isStaked;

        emit NFTUnregistered(owner, _tokenId);
    }

    /**
     * @notice Claim reward tokens obtained through NFT staking.
     * @param _tokenId claim reward associated with allowedNFT tokenId.
     */
    function claimRewardTokens(uint256 _tokenId) public override {
        address sender = msg.sender;
        require(
            registeredNFTForReward[_tokenId].reward > 0,
            "No reward available."
        );
        require(
            registeredNFTForReward[_tokenId].owner == sender,
            "Only owner can claim StakingRewardTokens."
        );

        uint256 reward = registeredNFTForReward[_tokenId].reward;
        delete registeredNFTForReward[_tokenId].reward; // prevent race condition attacks

        _mintRewards(sender, reward);
    }

    /**
     * @notice Mints new reward token. Restricted access to contract owner.
     * @dev Restricted access to contract owner.
     * @param _account will receive the minted tokens.
     * @param _amount amount of tokens to be minted.
     */
    function _mintRewards(address _account, uint256 _amount) private {
        require(
            address(rewardToken) != address(0),
            "reward token contract not initialized"
        );
        rewardToken.mint(_account, _amount);
        emit RewardTokensMinted(_account, _amount);
    }

 
    /**
     * @notice Calculate the reward for staked NFT.
     * @dev calculates the reward based on time (block.timestamp)
     * @param _nftValue value of the NFT
     * @param _previousEpoch last time rewards were calculated
     * @return reward reward in reward tokens.
     */
    function _calculateNFTStakedReward(
        uint256 _nftValue,
        uint256 _previousEpoch
    ) internal view returns (uint256) {
        uint256 currentTime = block.timestamp;
        uint256 delta_staked = currentTime.sub(_previousEpoch);
        uint256 reward = _nftValue.mul(delta_staked);
        return reward;
    }

    /**
     * @notice Updates the reward asscociated with the staking of NFT for reward staking
     * @param _tokenId update the reward for the specific tokenId.
     */
    function updateNFTVaultReward(uint256 _tokenId) public override {
        require(registeredNFTForReward[_tokenId].isStaked, "Token not staked");

        //calculaten new reward for the period of time since rewardCalculationEpoch
        uint256 reward = registeredNFTForReward[_tokenId].reward.add(
            _calculateNFTStakedReward(
                registeredNFTForReward[_tokenId].value,
                registeredNFTForReward[_tokenId].rewardCalculationEpoch
            )
        );
        // update time to now
        registeredNFTForReward[_tokenId].rewardCalculationEpoch = block
            .timestamp;
        // update the reward of the nft
        registeredNFTForReward[_tokenId].reward += reward;
    }

    function isStaked(uint256 tokenId)
        external
        view
        override
        returns (bool)
    {
        return registeredNFTForReward[tokenId].isStaked;
    }
}
