const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");
const hre = require("hardhat");

function scale(value, decimals = 18) {
  return BigNumber.from(value).mul(BigNumber.from(10).pow(decimals));
}

describe("Liquid tokens Vault tests setup", function () {
  const FIVE_DAYS = 432000;

  let nft;
  let vault;
  let liquidVault;
  let rewardToken;
  let liquidNFTToken;
  let pricingMechanism;
  let owner;
  let alice;
  let bob;

  let aliceNFTTokenStakedForLiquid;
  let bobNFTTokenStakedForLiquid;
  let depositedFractionsInVault;
  /**
   * The following test is used as a beforeEach in the next application testing scenario
   */

  it("Beforeach setup for 'Liquid tokens Vault Test'", async function () {
    /**
     * Setup and deploy smart contracts
     * mint 2 NFT for alice and bob each
     * calculate NFT value
     * Stake 2 NFT in the reward vault
     * Stake 2 NFT in the Fraction vault
     */
    // Collecting contracts
    const Vault = await ethers.getContractFactory("Vault");
    const SimpleNFT = await ethers.getContractFactory("SimpleNFT");
    const RewardToken = await ethers.getContractFactory("RewardToken");
    const LiquidNFTToken = await ethers.getContractFactory("LiquidNFTToken");
    const PricingMechanism = await ethers.getContractFactory(
      "NFTPricingMechanism"
    );
    const LiquidVault = await ethers.getContractFactory("LiquidVault");
    // Collecting Signers
    [owner, alice, bob] = await ethers.getSigners();

    //Deploying Contractss
    nft = await SimpleNFT.deploy();
    vault = await Vault.deploy(nft.address);
    liquidNFTToken = await LiquidNFTToken.deploy(
      "LiquidNFTToken",
      "SFT",
      vault.address
    );
    liquidVault = await LiquidVault.deploy();
    rewardToken = await RewardToken.deploy(
      "RewardToken",
      "RT",
      vault.address,
      liquidVault.address
    );
    // liquidVault not used in this tests scenarios.);
    pricingMechanism = await PricingMechanism.deploy();

    // setting for vault.
    await (await vault.setRewardToken(rewardToken.address)).wait();
    await (await vault.setLiquidNFTToken(liquidNFTToken.address)).wait();
    await (await vault.setPricingMechanism(pricingMechanism.address)).wait();

    // setting for liquid studio,
    await (await liquidVault.setRewardToken(rewardToken.address)).wait();
    await (await liquidVault.setLiquidNFTToken(liquidNFTToken.address)).wait();

    // minting NFTs
    const transaction1 = await (await nft.mint(alice.address)).wait();
    const transaction2 = await (await nft.mint(bob.address)).wait();

    aliceNFTTokenStakedForLiquid = transaction1.events.find(
      (l) => l.event === "NFTMinted"
    ).args.tokenId;
    bobNFTTokenStakedForLiquid = transaction2.events.find(
      (l) => l.event === "NFTMinted"
    ).args.tokenId;

    //Approve vault to transfer their NFT on their behalf.
    await (
      await nft
        .connect(alice)
        .approve(vault.address, aliceNFTTokenStakedForLiquid)
    ).wait();
    await (
      await nft.connect(bob).approve(vault.address, bobNFTTokenStakedForLiquid)
    ).wait();

    // set NFT price
    await (
      await pricingMechanism.calculateNFTValue(aliceNFTTokenStakedForLiquid)
    ).wait();
    //ADDED
    await (
      await pricingMechanism.calculateNFTValue(bobNFTTokenStakedForLiquid)
    ).wait();

    // Stake token1 and token 2 for reward staking.

    stakeAliceReward = await (
      await vault.connect(alice).stakeForLiquidNFT(aliceNFTTokenStakedForLiquid)
    ).wait();
    stakeBobReward = await (
      await vault.connect(bob).stakeForLiquidNFT(bobNFTTokenStakedForLiquid)
    ).wait();

    hre.network.provider.send("evm_increaseTime", [FIVE_DAYS + 1]);

    // redeem staking liquid tokens
    redeemRes = await (
      await vault
        .connect(alice)
        .redeemLiquidTokens(aliceNFTTokenStakedForLiquid)
    ).wait();

    // Test Event is called
    let val = redeemRes.events.find(
      (l) => l.event === "LiquidNFTTokenRedeemed"
    ).args;

    depositedFractionsInVault = redeemRes.events.find(
      (l) => l.event === "LiquidNFTTokenRedeemed"
    ).args.amount;
    const depositedFractionsInVault2 = await liquidNFTToken.balanceOf(
      alice.address
    );

    expect(depositedFractionsInVault2).to.eq(depositedFractionsInVault);

    // Approve vault smart contract to transfer liquidNFTToken with allowance
    liquidNFTToken
      .connect(alice)
      .approve(liquidVault.address, depositedFractionsInVault2);

    // Stake all liquid tokens
    const deposit = await (
      await liquidVault
        .connect(alice)
        .depositLiquidNFTTokens(depositedFractionsInVault2)
    ).wait();

    const args = deposit.events.find(
      (l) => l.event === "LiquidNFTTokensDeposited"
    ).args;
    depositedFractionsInVault = depositedFractionsInVault2;
    expect(await liquidNFTToken.balanceOf(alice.address)).to.eq(0);
  });
});

describe("Liquid tokens Vault tests", function () {
  const FIVE_DAYS = 432000;

  let nft;
  let vault;
  let liquidNFTToken;
  let liquidVault;
  let owner;
  let alice;
  let bob;

  let aliceNFTTokenStakedForLiquid;
  let bobNFTTokenStakedForLiquid;

  let redeemRes;

  let depositedFractionsInVault;
  beforeEach(async function () {
    // Collecting contracts
    const Vault = await ethers.getContractFactory("Vault");
    const SimpleNFT = await ethers.getContractFactory("SimpleNFT");
    const RewardToken = await ethers.getContractFactory("RewardToken");
    const LiquidNFTToken = await ethers.getContractFactory("LiquidNFTToken");
    const PricingMechanism = await ethers.getContractFactory(
      "NFTPricingMechanism"
    );
    const LiquidVault = await ethers.getContractFactory("LiquidVault");
    // Collecting Signers
    [owner, alice, bob] = await ethers.getSigners();

    //Deploying Contractss
    nft = await SimpleNFT.deploy();
    vault = await Vault.deploy(nft.address);
    liquidNFTToken = await LiquidNFTToken.deploy(
      "LiquidNFTToken",
      "SFT",
      vault.address
    );
    liquidVault = await LiquidVault.deploy();
    rewardToken = await RewardToken.deploy(
      "RewardToken",
      "RT",
      vault.address,
      liquidVault.address
    );
    // liquidVault not used in this tests scenarios.);
    pricingMechanism = await PricingMechanism.deploy();

    // setting for vault.
    await (await vault.setRewardToken(rewardToken.address)).wait();
    await (await vault.setLiquidNFTToken(liquidNFTToken.address)).wait();
    await (await vault.setPricingMechanism(pricingMechanism.address)).wait();

    // setting for liquid studio,
    await (await liquidVault.setRewardToken(rewardToken.address)).wait();
    await (await liquidVault.setLiquidNFTToken(liquidNFTToken.address)).wait();

    // minting NFTs
    const transaction1 = await (await nft.mint(alice.address)).wait();
    const transaction2 = await (await nft.mint(bob.address)).wait();

    aliceNFTTokenStakedForLiquid = transaction1.events.find(
      (l) => l.event === "NFTMinted"
    ).args.tokenId;
    bobNFTTokenStakedForLiquid = transaction2.events.find(
      (l) => l.event === "NFTMinted"
    ).args.tokenId;

    //Approve vault to transfer their NFT on their behalf.
    await (
      await nft
        .connect(alice)
        .approve(vault.address, aliceNFTTokenStakedForLiquid)
    ).wait();
    await (
      await nft.connect(bob).approve(vault.address, bobNFTTokenStakedForLiquid)
    ).wait();

    // set NFT price
    await (
      await pricingMechanism.calculateNFTValue(aliceNFTTokenStakedForLiquid)
    ).wait();
    //ADDED
    await (
      await pricingMechanism.calculateNFTValue(bobNFTTokenStakedForLiquid)
    ).wait();

    // Stake token1 and token 2 for reward staking.

    stakeAliceReward = await (
      await vault.connect(alice).stakeForLiquidNFT(aliceNFTTokenStakedForLiquid)
    ).wait();
    stakeBobReward = await (
      await vault.connect(bob).stakeForLiquidNFT(bobNFTTokenStakedForLiquid)
    ).wait();

    hre.network.provider.send("evm_increaseTime", [FIVE_DAYS + 1]);

    // redeem staking liquid tokens
    redeemRes = await (
      await vault
        .connect(alice)
        .redeemLiquidTokens(aliceNFTTokenStakedForLiquid)
    ).wait();

    // Test Event is called
    let val = redeemRes.events.find(
      (l) => l.event === "LiquidNFTTokenRedeemed"
    ).args;

    depositedFractionsInVault = redeemRes.events.find(
      (l) => l.event === "LiquidNFTTokenRedeemed"
    ).args.amount;
    const depositedFractionsInVault2 = await liquidNFTToken.balanceOf(
      alice.address
    );

    expect(depositedFractionsInVault2).to.eq(depositedFractionsInVault);

    // Approve vault smart contract to transfer liquidNFTToken with allowance
    liquidNFTToken
      .connect(alice)
      .approve(liquidVault.address, depositedFractionsInVault2);

    // Stake all liquid tokens
    const deposit = await (
      await liquidVault
        .connect(alice)
        .depositLiquidNFTTokens(depositedFractionsInVault2)
    ).wait();

    const args = deposit.events.find(
      (l) => l.event === "LiquidNFTTokensDeposited"
    ).args;
    depositedFractionsInVault = depositedFractionsInVault2;
    expect(await liquidNFTToken.balanceOf(alice.address)).to.eq(0);
  });

  it("Should be able to deposit Liquidtokens, balance is removed from owner and added to the vault", async function () {
    // getting balance after staking all
    const balance2 = await liquidNFTToken.balanceOf(alice.address);
    expect(balance2).to.eq(0);

    // getting vault balance after alice staked all
    const balance3 = await liquidNFTToken.balanceOf(liquidVault.address);

    // should be equal to her deposit
    expect(balance3).to.eq(depositedFractionsInVault);
  });

  it("Reward token amount should be updated overtime for someone depositing Staking Liquid Tokens", async function () {
    hre.network.provider.send("evm_increaseTime", [100]);

    await liquidVault.connect(owner).updateLiquidVaultReward(alice.address);

    await liquidVault.connect(alice).redeemRewardTokensLiquidStaking();

    const balanceReward = await rewardToken.balanceOf(alice.address);

    const account = await liquidVault.stakersContributions(alice.address);

    hre.network.provider.send("evm_increaseTime", [5000]);

    await liquidVault.connect(alice).redeemRewardTokensLiquidStaking();

    const balance2 = await rewardToken.balanceOf(alice.address);

    expect(balance2).to.be.above(depositedFractionsInVault);
  });

  it("One should be able to withdraw part or all their deposit", async function () {
    hre.network.provider.send("evm_increaseTime", [100]);

    await (
      await liquidVault.connect(owner).updateLiquidVaultReward(alice.address)
    ).wait();
    let stakedAmount = (await liquidVault.stakersContributions(alice.address))
      .stakedAmount;

    await (
      await liquidVault.connect(alice).withdrawStakedLiquidTokens(stakedAmount)
    ).wait();

    expect(await liquidNFTToken.balanceOf(alice.address)).to.eq(stakedAmount);
  });

  it("After withdrawing their deposit, one should still be able to acquire an NFT ", async function () {
    hre.network.provider.send("evm_increaseTime", [100]);

    await (
      await liquidVault.connect(owner).updateLiquidVaultReward(alice.address)
    ).wait();
    let stakedAmount = (await liquidVault.stakersContributions(alice.address))
      .stakedAmount;

    await (
      await liquidVault.connect(alice).withdrawStakedLiquidTokens(stakedAmount)
    ).wait();

    expect(await liquidNFTToken.balanceOf(alice.address)).to.eq(stakedAmount);

    const nftAcquisiton = await (
      await vault
        .connect(alice)
        .acquireNFTwithLiquidToken(aliceNFTTokenStakedForLiquid)
    ).wait();
    const acquiredNftOwner = await nft.ownerOf(aliceNFTTokenStakedForLiquid);

    // expect Alice is the new owner
    expect(acquiredNftOwner).to.eq(alice.address);
  });
});
