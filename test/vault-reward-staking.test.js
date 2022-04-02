const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");
const hre = require("hardhat");

function scale(value, decimals = 18) {
  return BigNumber.from(value).mul(BigNumber.from(10).pow(decimals));
}

describe("Reward Tests setup", function () {
  const FIVE_DAYS = 432000;

  let nft;
  let vault;
  let rewardToken;
  let liquidNFTToken;
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
  it("Beforeach setup for 'Reward Test'", async function () {
    /**
     * Setup and deploy smart contracts
     * mint NFt for alice and bob
     * calculate NFT value
     * Stake NFT in the reward vault
     *
     */
    const Vault = await ethers.getContractFactory("Vault");
    const SimpleNFT = await ethers.getContractFactory("SimpleNFT");
    const RewardToken = await ethers.getContractFactory("RewardToken");
    const LiquidNFTToken = await ethers.getContractFactory("LiquidNFTToken");
    [owner, alice, bob] = await ethers.getSigners();
    //setting up contracts
    nft = await SimpleNFT.deploy();
    vault = await Vault.deploy(nft.address);

    rewardToken = await RewardToken.deploy("RewardToken", "RT", vault.address);
    liquidNFTToken = await LiquidNFTToken.deploy(
      "LiquidNFTToken",
      "SFT",
      vault.address
    );
    const tx = await vault.setRewardToken(rewardToken.address);
    await tx.wait();
    const tx2 = await vault.setLiquidNFTToken(liquidNFTToken.address);

    await tx2.wait();

    // testing the setRewardTokena and setLiquidNFTTokens
    expect(await vault.liquidNFTToken()).to.eq(liquidNFTToken.address);
    expect(await vault.rewardToken()).to.eq(rewardToken.address);
    // testing the setRewardTokena nd setLiquidNFTTokens
    expect(
      vault.connect(alice).setLiquidNFTToken(liquidNFTToken.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    // minting NFTs
    const transaction1 = await (await nft.mint(alice.address)).wait();
    const transaction2 = await (await nft.mint(bob.address)).wait();

    aliceNFTTokenStakedForReward = transaction1.events.find(
      (l) => l.event === "NFTMinted"
    ).args.tokenId;
    bobNFTTokenStakedForReward = transaction2.events.find(
      (l) => l.event === "NFTMinted"
    ).args.tokenId;

    // testing simpleNFT min function
    expect(await nft.ownerOf(aliceNFTTokenStakedForReward)).to.eq(
      alice.address
    );
    expect(await nft.ownerOf(bobNFTTokenStakedForReward)).to.eq(bob.address);

    // set NFT price
    await (
      await vault.connect(owner).calculateNFTValue(aliceNFTTokenStakedForReward)
    ).wait();
    await (
      await vault.connect(owner).calculateNFTValue(bobNFTTokenStakedForReward)
    ).wait();

    // test price calculation function and set in the nftValue mapping
    expect(await vault.nftValue(aliceNFTTokenStakedForReward)).to.be.above(0);
    expect(await vault.nftValue(bobNFTTokenStakedForReward)).to.be.above(0);

    // Approve vault to transfer their NFT on their behalf.
    await (
      await nft
        .connect(alice)
        .approve(vault.address, aliceNFTTokenStakedForReward)
    ).wait();
    await (
      await nft.connect(bob).approve(vault.address, bobNFTTokenStakedForReward)
    ).wait();

    // test vault is now approved for tokens
    expect(await nft.getApproved(aliceNFTTokenStakedForReward)).to.eq(
      vault.address
    );
    expect(await nft.getApproved(bobNFTTokenStakedForReward)).to.eq(
      vault.address
    );

    await (
      await vault
        .connect(alice)
        .stakeForRewardToken(aliceNFTTokenStakedForReward)
    ).wait();
    await (
      await vault.connect(bob).stakeForRewardToken(bobNFTTokenStakedForReward)
    ).wait();

    // test vault is owner after staking
    expect(await nft.ownerOf(aliceNFTTokenStakedForReward)).to.eq(
      vault.address
    );
    expect(await nft.ownerOf(bobNFTTokenStakedForReward)).to.eq(vault.address);
  });
});

describe("Reward Tests", function () {
  let nft;
  let vault;
  let rewardToken;
  let liquidNFTToken;
  let owner;

  let alice;
  let bob;

  let aliceNFTTokenStakedForReward;
  let bobNFTTokenStakedForReward;
  beforeEach(async function () {
    const Vault = await ethers.getContractFactory("Vault");
    const SimpleNFT = await ethers.getContractFactory("SimpleNFT");
    const RewardToken = await ethers.getContractFactory("RewardToken");
    const LiquidNFTToken = await ethers.getContractFactory("LiquidNFTToken");
    [owner, alice, bob] = await ethers.getSigners();
    //setting up contracts
    nft = await SimpleNFT.deploy();
    vault = await Vault.deploy(nft.address);

    rewardToken = await RewardToken.deploy("RewardToken", "RT", vault.address);
    liquidNFTToken = await LiquidNFTToken.deploy(
      "LiquidNFTToken",
      "SFT",
      vault.address
    );
    const tx = await vault.setRewardToken(rewardToken.address);
    await tx.wait();
    const tx2 = await vault.setLiquidNFTToken(liquidNFTToken.address);

    await tx2.wait();

    // testing the setRewardTokena and setLiquidNFTTokens
    expect(await vault.liquidNFTToken()).to.eq(liquidNFTToken.address);
    expect(await vault.rewardToken()).to.eq(rewardToken.address);
    // testing the setRewardTokena nd setLiquidNFTTokens
    expect(
      vault.connect(alice).setLiquidNFTToken(liquidNFTToken.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    // minting NFTs
    const transaction1 = await (await nft.mint(alice.address)).wait();
    const transaction2 = await (await nft.mint(bob.address)).wait();

    aliceNFTTokenStakedForReward = transaction1.events.find(
      (l) => l.event === "NFTMinted"
    ).args.tokenId;
    bobNFTTokenStakedForReward = transaction2.events.find(
      (l) => l.event === "NFTMinted"
    ).args.tokenId;

    // testing simpleNFT min function
    expect(await nft.ownerOf(aliceNFTTokenStakedForReward)).to.eq(
      alice.address
    );
    expect(await nft.ownerOf(bobNFTTokenStakedForReward)).to.eq(bob.address);

    // set NFT price
    await (
      await vault.connect(owner).calculateNFTValue(aliceNFTTokenStakedForReward)
    ).wait();
    await (
      await vault.connect(owner).calculateNFTValue(bobNFTTokenStakedForReward)
    ).wait();

    // test price calculation function and set in the nftValue mapping
    expect(await vault.nftValue(aliceNFTTokenStakedForReward)).to.be.above(0);
    expect(await vault.nftValue(bobNFTTokenStakedForReward)).to.be.above(0);

    // Approve vault to transfer their NFT on their behalf.
    await (
      await nft
        .connect(alice)
        .approve(vault.address, aliceNFTTokenStakedForReward)
    ).wait();
    await (
      await nft.connect(bob).approve(vault.address, bobNFTTokenStakedForReward)
    ).wait();

    // test vault is now approved for tokens
    expect(await nft.getApproved(aliceNFTTokenStakedForReward)).to.eq(
      vault.address
    );
    expect(await nft.getApproved(bobNFTTokenStakedForReward)).to.eq(
      vault.address
    );

    await (
      await vault
        .connect(alice)
        .stakeForRewardToken(aliceNFTTokenStakedForReward)
    ).wait();
    await (
      await vault.connect(bob).stakeForRewardToken(bobNFTTokenStakedForReward)
    ).wait();

    // test vault is owner after staking
    expect(await nft.ownerOf(aliceNFTTokenStakedForReward)).to.eq(
      vault.address
    );
    expect(await nft.ownerOf(bobNFTTokenStakedForReward)).to.eq(vault.address);
  });

  it("Claiming Reward Tokens should not be possible before staking", async function () {
    await expect(
      vault.connect(alice).claimRewardTokens(aliceNFTTokenStakedForReward)
    ).to.be.revertedWith("No reward available.");
  });

  it("Claiming Reward Tokens should not be possible via another account", async function () {
    //update the reward for token 1 and 2
    await (
      await vault
        .connect(owner)
        .updateNFTVaultReward(bobNFTTokenStakedForReward)
    ).wait();
    await (
      await vault
        .connect(owner)
        .updateNFTVaultReward(aliceNFTTokenStakedForReward)
    ).wait();

    //Bob minted bobNFTTokenStakedForReward
    await expect(
      vault.connect(alice).claimRewardTokens(bobNFTTokenStakedForReward)
    ).to.be.revertedWith("Only owner can claim StakingRewardTokens.");

    claimBob = await expect(
      vault.connect(bob).claimRewardTokens(aliceNFTTokenStakedForReward)
    ).to.be.revertedWith("Only owner can claim StakingRewardTokens.");
  });

  it("Claiming Reward Tokens should be accessible after staking an NFT and should increase overtime", async function () {
    //fast forward
    hre.network.provider.send("evm_increaseTime", [500]);

    //update the reward for Alice token before claiming tokens
    let res = await vault
      .connect(owner)
      .updateNFTVaultReward(aliceNFTTokenStakedForReward);
    await res.wait();

    let aliceFraction = await (
      await vault.connect(alice).claimRewardTokens(aliceNFTTokenStakedForReward)
    ).wait();

    // testing RewardTokensMinted event
    let account = aliceFraction.events.find(
      (l) => l.event === "RewardTokensMinted"
    ).args.account;
    let amount = aliceFraction.events.find(
      (l) => l.event === "RewardTokensMinted"
    ).args.amount;

    expect(account).to.eq(alice.address);
    expect(amount).to.be.above(0);

    const balanceAlice = await rewardToken.balanceOf(alice.address);

    expect(balanceAlice).to.eq(amount);

    //fast forward
    hre.network.provider.send("evm_increaseTime", [500]);

    //update the reward for Alice token 1
    await (
      await vault
        .connect(owner)
        .updateNFTVaultReward(aliceNFTTokenStakedForReward)
    ).wait();

    aliceFraction = await (
      await vault.connect(alice).claimRewardTokens(aliceNFTTokenStakedForReward)
    ).wait();

    account = aliceFraction.events.find((l) => l.event === "RewardTokensMinted")
      .args.account;

    expect(account).to.eq(alice.address);
    expect(amount).to.be.above(0);

    const balanceAlice2 = await rewardToken.balanceOf(alice.address);

    // Test total reward is growing
    expect(balanceAlice2).to.be.above(balanceAlice);
  });
});
