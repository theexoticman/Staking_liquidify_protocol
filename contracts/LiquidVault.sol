//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "../interfaces/ILiquidVault.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./SimpleNFT.sol";
import "../interfaces/IRewardToken.sol";
import "../interfaces/ILiquidNFTToken.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "hardhat/console.sol";

/**
 * @title A vault for staking ERC20 Liquid Tokens. Stakers will be rewarded with ERC20 Reward Tokens
 * @author Jean-LoÏc Mugnier
 * @notice Such contract can be used to stake NFT that will generate reedemable ERC20 type of token overtime, while NFT is Staked.
 * @dev fully tested. v1.
 */
contract LiquidVault is ILiquidVault, Ownable {
    using SafeMath for uint256;

    IRewardToken public rewardToken;
    ILiquidNFTToken public liquidNFTToken;

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

    constructor() {}

    /**
     * @notice set the reward token ERC20 token smart contract address
     * @dev dependency on rewardtoken smart contract. deploy it and set its address here.
     * @param _rewardToken the reward token address
     */
    function setRewardToken(address _rewardToken) external override onlyOwner {
        require(address(rewardToken) == address(0), "reward token already set");
        rewardToken = IRewardToken(_rewardToken);
    }

    /**
     * @notice set the liquid ERC20 token smart contract address
     * @dev dependency on _liquidNFTToken smart contract. deploy it and set its address here.
     * @param _liquidNFTToken The number of rings from dendrochronological sample
     
     */
    function setLiquidNFTToken(address _liquidNFTToken)
        external
        override
        onlyOwner
    {
        require(
            address(liquidNFTToken) == address(0),
            "LiquidNFTToken token already set"
        );
        liquidNFTToken = ILiquidNFTToken(_liquidNFTToken);
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
     * @notice Deposits liquid tokens to the staking vault.
     * @dev before depositing. user must have approved this smart contract to transferFrom their account.
     * @param _amount amount of tokens to be staked
     */
    function depositLiquidNFTTokens(uint256 _amount) external override {
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
        emit LiquidNFTTokensDeposited(msg.sender, address(this), _amount);
    }

    /**
     * @notice Withdraws staked liquid tokens from the staking vault
     * @param _amount the amount of takens to the withdraw from the staking pool.
     */
    function withdrawStakedLiquidTokens(uint256 _amount) external override {
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
    function redeemRewardTokensLiquidStaking() external override {
        require(
            stakersContributions[msg.sender].reward >= 0,
            "No reward available"
        );
        uint256 reward = stakersContributions[msg.sender].reward;

        delete stakersContributions[msg.sender].reward;

        _mintRewards(msg.sender, reward);
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
