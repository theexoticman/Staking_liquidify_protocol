//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "../interfaces/IVault.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./SimpleNFT.sol";
import "../interfaces/IRewardToken.sol";
import "../interfaces/IStakingFractionToken.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "hardhat/console.sol";

// Allows staking of NFTs and can mint rewards in accordance
contract Vault is IVault, Ownable {
    using SafeMath for uint256;
    //using SafeERC20 for IERC20;

    uint8 private constant _RANDOMMODULO = 50;
    uint256 private constant _LOCKTIME = 5 days;

    struct RegistrationMetadata {
        address owner;
        uint256 value;
        uint256 stakeTime;
        uint256 rewardSnapshotTime;
        uint256 reward;
        bool isStaked;
    }
    struct NFTFroFractionsMetadata {
        address owner;
        uint256 value;
        uint256 stakeTime;
        bool isRedeemed;
        bool isStaked;
    }

    /*  // mapping player and its staked NFT
    mapping(address => uint256[]) public playersNFT;
 */
    address public immutable allowedNFT;
    IRewardToken public rewardToken;
    IStakingFractionToken public stakingFractionToken;

    // Managing classic NFT staking.
    mapping(uint256 => NFTFroFractionsMetadata)
        public stakingToFractionRegistry;

    // Managing classic NFT staking.
    mapping(uint256 => RegistrationMetadata) public registeredTokens;

    mapping(uint256 => mapping(address => bool)) approvals;

    constructor(address _allowedNFT) {
        require(
            address(_allowedNFT) != address(0),
            "Zero account cannot be used"
        );
        allowedNFT = _allowedNFT;
    }

    function setRewardToken(address _rewardToken) external onlyOwner {
        require(address(rewardToken) == address(0), "reward token already set");
        rewardToken = IRewardToken(_rewardToken);
    }

    function setStakingFractionToken(address _stakingFractionToken)
        external
        onlyOwner
    {
        require(
            address(stakingFractionToken) == address(0),
            "staking fraction token already set"
        );
        stakingFractionToken = IStakingFractionToken(_stakingFractionToken);
    }

    function adminMint(address account, uint256 amount)
        external
        override
        onlyOwner
    {
        _mintRewards(account, amount);
    }

    function stakeNFT(uint256 tokenId) external override {
        require(
            stakingToFractionRegistry[tokenId].isStaked == false,
            "Already staked for fractions"
        );
        require(_isAuthorized(tokenId, msg.sender), "Unauthorized user");
        require(
            _isAuthorized(tokenId, address(this)),
            "Vault requeries authorization"
        );

        address owner = IERC721(allowedNFT).ownerOf(tokenId);

        registeredTokens[tokenId].owner = owner;
        registeredTokens[tokenId].value = unsafeNFTRandomValue();
        registeredTokens[tokenId].stakeTime = block.timestamp;
        registeredTokens[tokenId].rewardSnapshotTime = block.timestamp;
        registeredTokens[tokenId].isStaked = true;

        IERC721(allowedNFT).transferFrom(owner, address(this), tokenId);
        emit NFTRegistered(owner, tokenId);
    }

    function unstakeNFT(uint256 tokenId) external override {
        require(
            msg.sender == registeredTokens[tokenId].owner,
            "Only owner can unstake"
        );
        address owner = registeredTokens[tokenId].owner;

        IERC721(allowedNFT).transferFrom(address(this), owner, tokenId);

        // Just keep the reward and the Owner for a reward staked NFT
        delete registeredTokens[tokenId].value;
        delete registeredTokens[tokenId].stakeTime;
        delete registeredTokens[tokenId].rewardSnapshotTime;
        delete registeredTokens[tokenId].isStaked;

        emit NFTUnregistered(owner, tokenId);
    }

    function stakeNFTFractions(uint256 tokenId) external override {
        require(
            !registeredTokens[tokenId].isStaked,
            "Already staked for rewards"
        );
        require(_isAuthorized(tokenId, msg.sender), "Unauthorized user");
        require(
            _isAuthorized(tokenId, address(this)),
            "Vault requeries authorization"
        );

        address owner = IERC721(allowedNFT).ownerOf(tokenId);

        stakingToFractionRegistry[tokenId].owner = owner;
        stakingToFractionRegistry[tokenId].value = unsafeNFTRandomValue();
        stakingToFractionRegistry[tokenId].isStaked = true;
        stakingToFractionRegistry[tokenId].stakeTime = block.timestamp;
        stakingToFractionRegistry[tokenId].isRedeemed = false;

        IERC721(allowedNFT).transferFrom(owner, address(this), tokenId);

        emit NFTRegisteredForFractions(owner, tokenId);
    }

    /**
     *
     *TokenId, selected NFT
     *
     */
    function acquireNFTwithFractions(uint256 tokenId) external override {
        require(
            stakingToFractionRegistry[tokenId].isStaked,
            "Token is not staked."
        );
        require(
            IStakingFractionToken(stakingFractionToken).balanceOf(msg.sender) >
                stakingToFractionRegistry[tokenId].value,
            "Not enough funds."
        );
        uint256 value = stakingToFractionRegistry[tokenId].value;
        address owner = registeredTokens[tokenId].owner;
        // Burn the token
        stakingFractionToken.burn(msg.sender, value);
        delete registeredTokens[tokenId];

        IERC721(allowedNFT).transferFrom(address(this), msg.sender, tokenId);

        emit NFTUnregisteredForFractions(owner, tokenId);
    }

    /**
     * @dev User that staked their NFT can claim their Reward Tokens
     *
     * Deletes registration metadata before minting token to prevent reentrency/ race condition attacks
     *
     */
    function claimRewardTokens(uint256 tokenId) external override {
        address sender = msg.sender;
        require(registeredTokens[tokenId].reward > 0, "No reward available");
        require(
            registeredTokens[tokenId].owner == sender,
            "Only owner can claim StakingRewardTokens"
        );
        uint256 reward = registeredTokens[tokenId].reward;
        delete registeredTokens[tokenId].reward; // prevent race condition attacks

        _mintRewards(sender, reward);
    }

    function _isAuthorized(uint256 tokenId, address user)
        internal
        view
        returns (bool)
    {
        return SimpleNFT(allowedNFT).isApprovedOrOwner(user, tokenId);
    }

    /* function isStaked(uint256 tokenId) internal view returns (bool) {
        uint256 value = registeredTokens[tokenId].value;
        return
            value != 0 && IERC721(allowedNFT).ownerOf(tokenId) == address(this);
    } */

    function _mintRewards(address account, uint256 amount) internal {
        require(
            address(rewardToken) != address(0),
            "reward token contract not initialized"
        );
        rewardToken.mint(account, amount);
        emit TokensMinted(account, amount);
    }

    /**
     * @dev unsafe random number based on block parameters.
     *
     * Unsafe pseud random generation.
     * TODO migrate to Chainlink VRF
     *
     */
    function unsafeNFTRandomValue() public view returns (uint256) {
        uint256 random = uint256(
            keccak256(abi.encodePacked(block.difficulty, block.timestamp))
        );
        uint256 randomValue = uint256((random % _RANDOMMODULO) + 1); // between 1 and 50
        return randomValue;
    }

    /**
     * @dev Calculates the Reward associated with an NFT giving its value and time since the last calculation.
     *
     * This internal function is called by updateReward to calculate the reward of a specific NFT.
     * This calculation formula is predefined and result is in wei
     *
     *
     * Requirements:
     *
     * - `nftValue` NFT value setup at NFT staking step.
     * - `previousTimestamp` the last time the reward was calculated.
     *
     */
    function _calculateNFTStakedReward(
        uint256 nftValue,
        uint256 previousTimestamp
    ) internal view returns (uint256) {
        uint256 currentTime = block.timestamp;
        uint256 delta_staked = currentTime.sub(previousTimestamp);
        uint256 reward = nftValue.mul(delta_staked);
        return reward;
    }

    /**
     * @dev Updates the reward asscociated with all NFTs
     *
     * UpdateReward updates the reward for their staked NFT with latest values.
     * It calculates the reward based on the time the NFT has been staked.
     * This function can be called anytime Rewards need to be updated.
     * When updating the reward, the reward timestamp is updated to current timestamp.
     *
     */
    function updateReward(uint256 tokenId) public onlyOwner {
        require(registeredTokens[tokenId].isStaked, "Token not staked");

        //calculaten new reward for the period of time since rewardSnapshotTime
        uint256 reward = registeredTokens[tokenId].reward.add(
            _calculateNFTStakedReward(
                registeredTokens[tokenId].value,
                registeredTokens[tokenId].rewardSnapshotTime
            )
        );
        // update time to now
        registeredTokens[tokenId].rewardSnapshotTime = block.timestamp;
        // update the reward of the nft
        registeredTokens[tokenId].reward += reward;
    }

    function redeemFractionTokens(uint256 tokenId) public {
        require(
            address(stakingFractionToken) != address(0),
            "Staking fraction contract not initialized"
        );
        require(
            stakingToFractionRegistry[tokenId].stakeTime + _LOCKTIME <=
                block.timestamp,
            "Lock period of 5 days"
        );
        require(
            stakingToFractionRegistry[tokenId].isStaked,
            "Token not staked"
        );
        require(
            stakingToFractionRegistry[tokenId].owner == msg.sender,
            "Only owner can redeem"
        );
        require(
            !stakingToFractionRegistry[tokenId].isRedeemed,
            "Already redeemed"
        );

        uint256 value = stakingToFractionRegistry[tokenId].value;
        stakingToFractionRegistry[tokenId].isRedeemed = true;
        stakingFractionToken.mint(msg.sender, value);

        emit StakingFractionTokenClaimed(msg.sender, value);
    }
}
