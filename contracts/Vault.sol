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

    uint8 RANDOM_MODULO = 50;
    uint256 lockTime = 1; //432000  5 days

    struct RegistrationMetadata {
        address owner;
        uint256 value;
        uint256 stakeTime;
        uint256 rewardSnapshotTime;
        uint256 reward  ;
        bool isStacked;
        bool isRewardEligible;
    }
    

    /*  // mapping player and its stacked NFT
    mapping(address => uint256[]) public playersNFT;
 */
    address public immutable allowedNFT;
    IRewardToken public rewardToken;
    IStakingFractionToken public stakingFractionToken;

   

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

    function stakeNFT(uint256 tokenID) external override {
        require(_isAuthorized(tokenID, msg.sender), "Unauthorized user");
        require(
            _isAuthorized(tokenID, address(this)),
            "Vault requeries authorization"
        );

        address owner = IERC721(allowedNFT).ownerOf(tokenID);

        /* // add NFT to user lists.
        playersNFT[msg.sender].push(tokenID);
 */
        registeredTokens[tokenID].owner = owner;
        registeredTokens[tokenID].value = unsafeNFTRandomValue();
        registeredTokens[tokenID].stakeTime = block.timestamp;
        registeredTokens[tokenID].rewardSnapshotTime = block.timestamp;
        registeredTokens[tokenID].isStacked = true;
        registeredTokens[tokenID].isRewardEligible = true;

        IERC721(allowedNFT).transferFrom(owner, address(this), tokenID);
        emit NFTRegistered(owner, tokenID);
    }

    function unstakeNFT(uint256 tokenID) external override {
        require(
            msg.sender == registeredTokens[tokenID].owner,
            "Only owner can unstake"
        );
        address owner = registeredTokens[tokenID].owner;

        /*         console.log("current owner - volt contract");
        console.log(IERC721(allowedNFT).ownerOf(tokenID));
        console.log("approved - volt contract");
        console.log(IERC721(allowedNFT).getApproved(tokenID)); */

        IERC721(allowedNFT).transferFrom(address(this), owner, tokenID);

        delete registeredTokens[tokenID].stakeTime;
        delete registeredTokens[tokenID].rewardSnapshotTime;
        delete registeredTokens[tokenID].value;

        registeredTokens[tokenID].isStacked = false;

        emit NFTUnregistered(owner, tokenID);
    }

    /**
     * @dev User that stacked their NFT can claim their Reward Tokens
     *
     * Deletes registration metadata before minting token to prevent reentrency/ race condition attacks
     *
     */
    function claimRewards(uint256 tokenId) external override {
        address sender = msg.sender;
        require(
            registeredTokens[tokenId].owner == sender,
            "Only owner can claim StakingRewardTokens"
        );
        uint256 reward = updateReward(tokenId);
        delete registeredTokens[tokenId]; // prevent race condition attacks
        _mintRewards(sender, reward);
    }

    function _isAuthorized(uint256 tokenID, address user)
        internal
        view
        returns (bool)
    {
        return SimpleNFT(allowedNFT).isApprovedOrOwner(user, tokenID);
    }

    function _isStaked(uint256 tokenID) internal view returns (bool) {
        uint256 value = registeredTokens[tokenID].value;
        return
            value != 0 && IERC721(allowedNFT).ownerOf(tokenID) == address(this);
    }

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
        uint256 randomValue = uint256((random % RANDOM_MODULO) + 1); // between 1 and 50
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
    function _calculateNFTStackedReward(
        uint256 nftValue,
        uint256 previousTimestamp
    ) internal view returns (uint256) {
        uint256 currentTime = block.timestamp;
        uint256 delta_stacked = currentTime.sub(previousTimestamp);
        uint256 reward = nftValue.mul(delta_stacked);
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
    function updateReward(uint256 tokenId) public returns (uint256) {
        uint256 res;
        require(    
            msg.sender == registeredTokens[tokenId].owner,
            "Cannot update someonelse's rewards"
        );
        if (
            registeredTokens[tokenId].isStacked &&
            registeredTokens[tokenId].isRewardEligible
        ) {
            //calculaten new reward for the period of time since rewardSnapshotTime
            uint256 reward = registeredTokens[tokenId].reward.add(
                _calculateNFTStackedReward(
                    registeredTokens[tokenId].value,
                    registeredTokens[tokenId].rewardSnapshotTime
                )
            );
            // update time to now
            registeredTokens[tokenId].rewardSnapshotTime = block.timestamp;
            // update the reward of the nft
            registeredTokens[tokenId].reward += reward;
            res = registeredTokens[tokenId].reward;
        }
        return res;
    }

    /**
     * @dev Get Rewards for a specific User
     *
     *
     * Requirements:
     *
     * - `address user` user's reward
     *
     *
     */
    /*   function getRewards(address user) public view returns (uint256) {
        uint256 reward;
        uint256 totalSupply = SimpleNFT(allowedNFT).totalSupply();
        for (uint256 index = 0; index < totalSupply; index++) {
            if (registeredTokens[index].owner == user) {
                reward += registeredTokens[index].reward;
            }
        }
        return reward;
    } */

    function reedemFractionTokens(uint256 tokenId) public {
        require(
            address(stakingFractionToken) != address(0),
            "staking fraction contract not initialized"
        );
        require(
            registeredTokens[tokenId].stakeTime + lockTime < block.timestamp,
            "Lock period of 5 days"
        );

        registeredTokens[tokenId].isRewardEligible = false;

        uint256 value = registeredTokens[tokenId].value;

        stakingFractionToken.mint(msg.sender, value);
        emit StakingFractionTokenClaimed(msg.sender, value);
    }


}
