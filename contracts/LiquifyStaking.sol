//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "../interfaces/ILiquifyStaking.sol";
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
contract LiquifyStaking is ILiquifyStaking, Ownable {
    using SafeMath for uint256;

    address public immutable allowedNFT;
    IVault public vault;

    ILiquidNFTToken public liquidNFTToken;
    // value associated to an NFT
    uint256 public constant LOCKTIME = 5 days;
    INFTPricingMechanism public pricingMechanism;

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

    constructor(address _allowedNFT) {
        require(
            address(_allowedNFT) != address(0),
            "Zero account cannot be used"
        );
        allowedNFT = _allowedNFT;
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
     * @notice set the vault staking for reward smart contract address
     * @dev dependency on pricing mechanism smart contract. deploy it and set its address here.
     * @param _vault the pricing mechanism address
     */
    function setVault(address _vault) external onlyOwner {
        require(address(vault) == address(0), "Vault staking already set");
        vault = IVault(_vault);
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
     * @notice Stake NFT and get liquid NFt tokens. Cannot be staked to obtain the reward token.
     * @dev NFT value must be calculated with "calculateNFTValue' prior being staked. when user exchanges NFT for liquid tokens, they are stored here registeredNFTForLiquidNFTToken.
     * @param _tokenId allowedNFT tokenId to be staked.
     */
    function stakeForLiquidNFT(uint256 _tokenId) external override {
        require(
            pricingMechanism.getNFTValue(_tokenId) > 0,
            "set NFT value prior to staking."
        );
        require(!vault.isStaked(_tokenId), "Already staked for rewards.");
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
            liquidNFTToken.balanceOf(msg.sender) >=
                registeredNFTForLiquidNFTToken[_tokenId].value,
            "Not enough funds."
        );
        uint256 value = registeredNFTForLiquidNFTToken[_tokenId].value;
        address owner = registeredNFTForLiquidNFTToken[_tokenId].owner;
        // Burn the token
        liquidNFTToken.burn(msg.sender, value);
        delete registeredNFTForLiquidNFTToken[_tokenId];

        IERC721(allowedNFT).transferFrom(address(this), msg.sender, _tokenId);

        emit NFTAcquiredWtihLiquid(owner, _tokenId);
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
            registeredNFTForLiquidNFTToken[_tokenId].stakeTime + LOCKTIME <=
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

    function isStaked(uint256 tokenId) external view override returns (bool) {
        return registeredNFTForLiquidNFTToken[tokenId].isStaked;
    }
}
