const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");
const hre = require("hardhat");

function scale(value, decimals = 18) {
  return BigNumber.from(value).mul(BigNumber.from(10).pow(decimals));
}

describe("Fraction Vault tests setup", function () {
  const FIVE_DAYS = 432000;

  let nft;
  let vault;
  let rewardToken;
  let stakingFractionToken;
  let owner;
  let alice;
  let bob;

  let aliceNFTTokenStakedForReward;
  let aliceNFTTokenStakedForFraction;
  let bobNFTTokenStakedForReward;
  let bobNFTTokenStakedForFraction;
  let depositedFractionsInVault;
  /**
   * The following test is used as a beforeEach in the next application testing scenario
   */

  it("Beforeach setup for 'Fraction Vault Test'", async function () {
    /**
     * Setup and deploy smart contracts
     * mint 2 NFT for alice and bob each
     * calculate NFT value
     * Stake 2 NFT in the reward vault
     * Stake 2 NFT in the Fraction vault
     */
    // Collecting contracts
    Vault = await ethers.getContractFactory("Vault");
    const SimpleNFT = await ethers.getContractFactory("SimpleNFT");
    const RewardToken = await ethers.getContractFactory("RewardToken");
    const StakingFractionToken = await ethers.getContractFactory(
      "StakingFractionToken"
    );

    // Collecting Signers
    [owner, alice, bob] = await ethers.getSigners();

    //Deploying Contractss
    nft = await SimpleNFT.deploy();
    vault = await Vault.deploy(nft.address);
    rewardToken = await RewardToken.deploy("RewardToken", "RT", vault.address);
    stakingFractionToken = await StakingFractionToken.deploy(
      "StakingFractionToken",
      "SFT",
      vault.address
    );

    //Setting relevant variables.
    const tx = await vault.setRewardToken(rewardToken.address);
    const tx2 = await vault.setStakingFractionToken(
      stakingFractionToken.address
    );

    // minting NFTs
    const transaction1 = await (await nft.mint(alice.address)).wait();
    const transaction2 = await (await nft.mint(bob.address)).wait();
    const transaction3 = await (await nft.mint(alice.address)).wait();
    const transaction4 = await (await nft.mint(bob.address)).wait();

    aliceNFTTokenStakedForReward = transaction1.events.find(
      (l) => l.event === "NFTMinted"
    ).args.tokenId;
    bobNFTTokenStakedForReward = transaction2.events.find(
      (l) => l.event === "NFTMinted"
    ).args.tokenId;
    aliceNFTTokenStakedForFraction = transaction3.events.find(
      (l) => l.event === "NFTMinted"
    ).args.tokenId;
    bobNFTTokenStakedForFraction = transaction4.events.find(
      (l) => l.event === "NFTMinted"
    ).args.tokenId;

    //Approve vault to transfer their NFT on their behalf.
    await (
      await nft
        .connect(alice)
        .approve(vault.address, aliceNFTTokenStakedForReward)
    ).wait();
    await (
      await nft.connect(bob).approve(vault.address, bobNFTTokenStakedForReward)
    ).wait();

    // set NFT price
    await (
      await vault.connect(owner).calculateNFTValue(aliceNFTTokenStakedForReward)
    ).wait();
    await (
      await vault.connect(owner).calculateNFTValue(bobNFTTokenStakedForReward)
    ).wait();

    // Stake token1 and token 2 for reward staking.

    stakeAliceReward = await (
      await vault.connect(alice).stakeNFTFractions(aliceNFTTokenStakedForReward)
    ).wait();
    stakeBobReward = await (
      await vault.connect(bob).stakeNFTFractions(bobNFTTokenStakedForReward)
    ).wait();

    hre.network.provider.send("evm_increaseTime", [FIVE_DAYS + 1]);

    // redeem staking fraction tokens
    redeemRes = await (
      await vault
        .connect(alice)
        .redeemFractionTokens(aliceNFTTokenStakedForReward)
    ).wait();

    // Test Event is called
    let val = redeemRes.events.find(
      (l) => l.event === "StakingFractionTokenRedeemed"
    ).args;
    depositedFractionsInVault = await stakingFractionToken.balanceOf(
      alice.address
    );

    let amount = redeemRes.events.find(
      (l) => l.event === "StakingFractionTokenRedeemed"
    ).args.amount;

    depositedFractionsInVault = await stakingFractionToken.balanceOf(
      alice.address
    );

    expect(depositedFractionsInVault).to.eq(amount);

    // Approve vault smart contract to transfer stakingFractionToken with allowance
    stakingFractionToken
      .connect(alice)
      .approve(vault.address, depositedFractionsInVault);

    // Stake all fraction tokens
    await (
      await vault
        .connect(alice)
        .depositStakingFractionTokens(depositedFractionsInVault)
    ).wait();

    expect(await stakingFractionToken.balanceOf(alice.address)).to.eq(0);
  });
});

describe("Fraction Vault tests", function () {
  const FIVE_DAYS = 432000;

  let nft;
  let vault;
  let stakingFractionToken;
  let owner;
  let alice;
  let bob;

  let aliceNFTTokenStakedForReward;
  let bobNFTTokenStakedForReward;

  let redeemRes;

  let depositedFractionsInVault;
  beforeEach(async function () {
    // Collecting contracts
    Vault = await ethers.getContractFactory("Vault");
    const SimpleNFT = await ethers.getContractFactory("SimpleNFT");
    const RewardToken = await ethers.getContractFactory("RewardToken");
    const StakingFractionToken = await ethers.getContractFactory(
      "StakingFractionToken"
    );

    // Collecting Signers
    [owner, alice, bob] = await ethers.getSigners();

    //Deploying Contractss
    nft = await SimpleNFT.deploy();
    vault = await Vault.deploy(nft.address);
    rewardToken = await RewardToken.deploy("RewardToken", "RT", vault.address);
    stakingFractionToken = await StakingFractionToken.deploy(
      "StakingFractionToken",
      "SFT",
      vault.address
    );

    //Setting relevant variables.
    const tx = await vault.setRewardToken(rewardToken.address);
    const tx2 = await vault.setStakingFractionToken(
      stakingFractionToken.address
    );

    // minting NFTs
    const transaction1 = await (await nft.mint(alice.address)).wait();
    const transaction2 = await (await nft.mint(bob.address)).wait();
    const transaction3 = await (await nft.mint(alice.address)).wait();
    const transaction4 = await (await nft.mint(bob.address)).wait();

    aliceNFTTokenStakedForReward = transaction1.events.find(
      (l) => l.event === "NFTMinted"
    ).args.tokenId;
    bobNFTTokenStakedForReward = transaction2.events.find(
      (l) => l.event === "NFTMinted"
    ).args.tokenId;
    aliceNFTTokenStakedForFraction = transaction3.events.find(
      (l) => l.event === "NFTMinted"
    ).args.tokenId;
    bobNFTTokenStakedForFraction = transaction4.events.find(
      (l) => l.event === "NFTMinted"
    ).args.tokenId;

    //Approve vault to transfer their NFT on their behalf.
    await (
      await nft
        .connect(alice)
        .approve(vault.address, aliceNFTTokenStakedForReward)
    ).wait();
    await (
      await nft.connect(bob).approve(vault.address, bobNFTTokenStakedForReward)
    ).wait();

    // set NFT price
    await (
      await vault.connect(owner).calculateNFTValue(aliceNFTTokenStakedForReward)
    ).wait();
    await (
      await vault.connect(owner).calculateNFTValue(bobNFTTokenStakedForReward)
    ).wait();

    // Stake token1 and token 2 for reward staking.

    stakeAliceReward = await (
      await vault.connect(alice).stakeNFTFractions(aliceNFTTokenStakedForReward)
    ).wait();
    stakeBobReward = await (
      await vault.connect(bob).stakeNFTFractions(bobNFTTokenStakedForReward)
    ).wait();

    hre.network.provider.send("evm_increaseTime", [FIVE_DAYS + 1]);

    // redeem staking fraction tokens
    redeemRes = await (
      await vault
        .connect(alice)
        .redeemFractionTokens(aliceNFTTokenStakedForReward)
    ).wait();

    // Test Event is called
    let val = redeemRes.events.find(
      (l) => l.event === "StakingFractionTokenRedeemed"
    ).args;
    depositedFractionsInVault = await stakingFractionToken.balanceOf(
      alice.address
    );

    let amount = redeemRes.events.find(
      (l) => l.event === "StakingFractionTokenRedeemed"
    ).args.amount;

    depositedFractionsInVault = await stakingFractionToken.balanceOf(
      alice.address
    );

    expect(depositedFractionsInVault).to.eq(amount);

    // Approve vault smart contract to transfer stakingFractionToken with allowance
    stakingFractionToken
      .connect(alice)
      .approve(vault.address, depositedFractionsInVault);

    // Stake all fraction tokens
    await (
      await vault
        .connect(alice)
        .depositStakingFractionTokens(depositedFractionsInVault)
    ).wait();

    expect(await stakingFractionToken.balanceOf(alice.address)).to.eq(0);
  });

  it("Should be able to deposit Staking Fraction tokens, balance is removed from owner and added to the vault", async function () {
    // getting balance after staking all
    const balance2 = await stakingFractionToken.balanceOf(alice.address);

    expect(balance2).to.eq(0);
    // getting balance after staking all
    const balance3 = await stakingFractionToken.balanceOf(vault.address);

    expect(balance3).to.eq(depositedFractionsInVault);
  });

  it("Reward token amount should be updated overtime for someone depositing Staking Fraction Tokens", async function () {
    hre.network.provider.send("evm_increaseTime", [100]);

    await vault.connect(owner).updateFractionVaultReward(alice.address);

    await vault.connect(alice).redeemRewardTokensFractionStaking();

    const balanceReward = await rewardToken.balanceOf(alice.address);

    const account = await vault.stakersContributions(alice.address);

    hre.network.provider.send("evm_increaseTime", [5000]);

    await vault.connect(alice).redeemRewardTokensFractionStaking();

    const balance2 = await rewardToken.balanceOf(alice.address);

    expect(balance2).to.be.above(depositedFractionsInVault);
  });

  it("One should be able to withdraw part or all their deposit", async function () {
    hre.network.provider.send("evm_increaseTime", [100]);

    await (
      await vault.connect(owner).updateFractionVaultReward(alice.address)
    ).wait();
    let stakedAmount = (await vault.stakersContributions(alice.address))
      .stakedAmount;

    await (
      await vault.connect(alice).withdrawStakedFractionTokens(stakedAmount)
    ).wait();

    expect(await stakingFractionToken.balanceOf(alice.address)).to.eq(
      stakedAmount
    );
  });

  it("After withdrawing their deposit, one should still be able to acquire an NFT ", async function () {
    hre.network.provider.send("evm_increaseTime", [100]);

    await (
      await vault.connect(owner).updateFractionVaultReward(alice.address)
    ).wait();
    let stakedAmount = (await vault.stakersContributions(alice.address))
      .stakedAmount;

    await (
      await vault.connect(alice).withdrawStakedFractionTokens(stakedAmount)
    ).wait();

    expect(await stakingFractionToken.balanceOf(alice.address)).to.eq(
      stakedAmount
    );

    const nftAcquisiton = await (
      await vault
        .connect(alice)
        .acquireNFTwithFractions(aliceNFTTokenStakedForReward)
    ).wait();
    const acquiredNftOwner = await nft.ownerOf(aliceNFTTokenStakedForReward);

    // expect Alice is the new owner
    expect(acquiredNftOwner).to.eq(alice.address);
  });
});
