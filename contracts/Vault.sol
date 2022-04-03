//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "../interfaces/IVault.sol";
import "../interfaces/INFTPricingMechanism.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./SimpleNFT.sol";
import "../interfaces/IRewardToken.sol";
import "../interfaces/ILiquidNFTToken.sol";
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
    //using SafeERC20 for IERC20;

    /**
     *
     * Generic state variables
     *
     */
    uint256 public constant _LOCKTIME = 5 days;

    address public immutable allowedNFT;

    IRewardToken public rewardToken;
    ILiquidNFTToken public liquidNFTToken;
    INFTPricingMechanism public pricingMechanism;
    /**
     *
     * NFT for reward staking
     *
     */

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

    /**
     *
     * NFT for liquid staking
     *
     */

    struct NFTForLiquidMetadata {
        address owner;
        uint256 value;
        uint256 stakeTime;
        bool isRedeemed;
        bool isStaked;
    }

    // NFT staking for liquid tokens.
    mapping(uint256 => NFTForLiquidMetadata)
        public registeredNFTForLiquidNFTToken;

    /**
     *
     * Liquid Vault Part
     *
     */
    struct LiquidStakingUserInfo {
        uint256 stakedAmount;
        uint256 stakeEpoch;
        uint256 reward;
    }
    // List of liquid stackers
    address[] private liquidStakers;

    // liquid staking depositors status
    mapping(address => bool) private existingStakers;

    // LiquidNFTToken s and asscociated amount
    mapping(address => LiquidStakingUserInfo) public stakersContributions;

    constructor(address _allowedNFT) {
        require(
            address(_allowedNFT) != address(0),
            "Zero account cannot be used"
        );
        allowedNFT = _allowedNFT;
    }

    /**
     *
     * Core Functions
     *
     */
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
     * @notice set the liquid ERC20 token smart contract address
     * @dev dependency on _liquidNFTToken smart contract. deploy it and set its address here.
     * @param _liquidNFTToken The number of rings from dendrochronological sample
     
     */
    function setLiquidNFTToken(address _liquidNFTToken) external onlyOwner {
        require(
            address(liquidNFTToken) == address(0),
            "LiquidNFTToken token already set"
        );
        liquidNFTToken = ILiquidNFTToken(_liquidNFTToken);
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
        require(address(pricingMechanism) != address(0), "Pricing mechanism not set");
        require(
            registeredNFTForLiquidNFTToken[_tokenId].isStaked == false,
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
     *
     * NFT Staking for liquid related functions
     *
     */

    /**
     * @notice Stake NFT and get liquid NFt tokens. Cannot be staked to obtain the reward token.
     * @dev NFT value must be calculated with "calculateNFTValue' prior being staked. when user exchanges NFT for liquid tokens, they are stored here registeredNFTForLiquidNFTToken.
     * @param _tokenId allowedNFT tokenId to be staked.
     */
    function stakeForLiquidNFT(uint256 _tokenId) public override {
        require(address(pricingMechanism) != address(0), "Pricing mechanism not set");
        require(
            !registeredNFTForReward[_tokenId].isStaked,
            "Already staked for rewards."
        );
        require(_isAuthorized(_tokenId, msg.sender), "Unauthorized user");
        require(
            _isAuthorized(_tokenId, address(this)),
            "Vault requeries authorization"
        );

        address owner = IERC721(allowedNFT).ownerOf(_tokenId);

        registeredNFTForLiquidNFTToken[_tokenId].owner = owner;
        registeredNFTForLiquidNFTToken[_tokenId].value = pricingMechanism
            .getNFTValue(_tokenId);
        registeredNFTForLiquidNFTToken[_tokenId].isStaked = true;
        registeredNFTForLiquidNFTToken[_tokenId].stakeTime = block.timestamp;
        registeredNFTForLiquidNFTToken[_tokenId].isRedeemed = false;

        IERC721(allowedNFT).transferFrom(owner, address(this), _tokenId);

        emit NFTRegisteredForLiquid(owner, _tokenId);
    }

    /**
     * @notice allow user to acquire an NFT that is staked. Only NFT that have been exchanged for liquid tokens can be bought this way
     * @dev tokens are burnt after acquisition and not transfered to previous NFT owner as one may think.
     * @param _tokenId token to be acquired
     */
    function acquireNFTwithLiquidToken(uint256 _tokenId) public override {
        require(
            registeredNFTForLiquidNFTToken[_tokenId].isStaked,
            "Token is not staked."
        );
        require(
            ILiquidNFTToken(liquidNFTToken).balanceOf(msg.sender) >=
                registeredNFTForLiquidNFTToken[_tokenId].value,
            "Not enough funds."
        );
        uint256 value = registeredNFTForLiquidNFTToken[_tokenId].value;
        address owner = registeredNFTForReward[_tokenId].owner;
        // Burn the token
        liquidNFTToken.burn(msg.sender, value);
        delete registeredNFTForReward[_tokenId];

        IERC721(allowedNFT).transferFrom(address(this), msg.sender, _tokenId);

        emit NFTUnregisteredForLiquidToken(owner, _tokenId);
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

    /**
     * @notice Redeems liquid tokens after staking a NFT and waiting after the locking period.
     * @dev liquidNFTToken address must have been set via setLiquidNFTToken
     * @param _tokenId the token id of the staked NFT.
     */
    function redeemLiquidTokens(uint256 _tokenId) public override {
        require(
            address(liquidNFTToken) != address(0),
            "LiquidNFTToken contract not initialized"
        );
        require(msg.sender == tx.origin, "Expecting a EOA");
        require(
            registeredNFTForLiquidNFTToken[_tokenId].stakeTime + _LOCKTIME <=
                block.timestamp,
            "Lock period of 5 days"
        );
        require(
            registeredNFTForLiquidNFTToken[_tokenId].isStaked,
            "Token not staked"
        );
        require(
            registeredNFTForLiquidNFTToken[_tokenId].owner == msg.sender,
            "Only owner can redeem"
        );
        require(
            !registeredNFTForLiquidNFTToken[_tokenId].isRedeemed,
            "Already redeemed"
        );

        uint256 value = registeredNFTForLiquidNFTToken[_tokenId].value;
        registeredNFTForLiquidNFTToken[_tokenId].isRedeemed = true;
        liquidNFTToken.mint(msg.sender, value);

        emit LiquidNFTTokenRedeemed(msg.sender, value);
    }

    /**
     *
     * Liquid Vault
     *
     */

    /**
     * @notice Deposits liquid tokens to the staking vault.
     * @dev before depositing. user must have approved this smart contract to transferFrom their account.
     * @param _amount amount of tokens to be staked
     */
    function depositLiquidNFTTokens(uint256 _amount) public override {
        require(_amount > 0, "deposit more than 0 liquid tokens");
        ILiquidNFTToken(liquidNFTToken).transferFrom(
            msg.sender,
            address(this),
            _amount
        );
        if (!existingStakers[msg.sender]) {
            existingStakers[msg.sender] = true;
            liquidStakers.push(msg.sender);
        }
        stakersContributions[msg.sender].stakedAmount = _amount;
        stakersContributions[msg.sender].stakeEpoch = block.timestamp;
        emit LiquidNFTTokensDeposited(msg.sender, _amount);
    }

    /**
     * @notice Withdraws staked liquid tokens from the staking vault
     * @param _amount the amount of takens to the withdraw from the staking pool.
     */
    function withdrawStakedLiquidTokens(uint256 _amount) public override {
        require(_amount > 0, "withraw more than 0");
        require(
            stakersContributions[msg.sender].stakedAmount >= _amount,
            "Not enough funds."
        );
        stakersContributions[msg.sender].stakedAmount -= _amount;
        ILiquidNFTToken(liquidNFTToken).transfer(msg.sender, _amount);
        emit StakedLiquidTokensWithdrew(msg.sender, _amount);
    }

    /**
     * @notice Redeems Reward Tokens for the staked liquid tokens to msg sender.
     */
    function redeemRewardTokensLiquidStaking() public override {
        require(
            stakersContributions[msg.sender].reward >= 0,
            "No reward available"
        );
        uint256 reward = stakersContributions[msg.sender].reward;

        delete stakersContributions[msg.sender].reward;

        _mintRewards(msg.sender, reward);
        emit RewardTokensClaimed(msg.sender, reward);
    }

    /**
     * @notice Updates _account reward for staked liquid
     * @dev calculated based on time (block.timestamp)
     * @param _account account for which we should update the reward
     */
    function updateLiquidVaultReward(address _account)
        public
        override
        onlyOwner
    {
        require(existingStakers[_account], "User does not stake.");

        // calculate new reward for the period of time since rewardCalculationEpoch
        uint256 reward = stakersContributions[_account].reward.add(
            _calculateLiquidStakingReward(
                stakersContributions[_account].stakedAmount,
                stakersContributions[_account].stakeEpoch
            )
        );
        // update time to now
        stakersContributions[_account].stakeEpoch = block.timestamp;
        // update the reward of the nft
        stakersContributions[_account].reward += reward;
        emit LiquidVaultRewardUpdated(_account, reward);
    }

    /**
     * @notice Calculates the Reward associated with an NFT giving its value and time since the last calculation.
     * This internal function is called by updateLiquidVaultReward to calculate the reward for a specific NFT.
     * @dev reward is based on evolution of time.
     * @param _amount amount of staked tokens
     * @param _previousEpoch last time rewards were calculated
     * @return reward, reward in tokens.
     */
    function _calculateLiquidStakingReward(
        uint256 _amount,
        uint256 _previousEpoch
    ) internal view returns (uint256) {
        uint256 currentTime = block.timestamp;
        uint256 delta_staked = currentTime.sub(_previousEpoch);
        uint256 reward = _amount.mul(delta_staked);
        return reward;
    }
}
