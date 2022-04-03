const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");
const hre = require("hardhat");

function scale(value, decimals = 18) {
  return BigNumber.from(value).mul(BigNumber.from(10).pow(decimals));
}

describe("Vault core tests setup", function () {
  const FIVE_DAYS = 432000;

  let nft;
  let vault;
  let liquifyStaking;
  let rewardToken;
  let pricingMechanism;
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
  it("Beforeach setup for 'Test Vault' and 'Reward Test'", async function () {
    /**
     * Setup and deploy smart contracts
     * mint NFt for alice and bob
     * calculate NFT value
     * Stake NFT in the reward vault
     *
     */
    const Vault = await ethers.getContractFactory("Vault");
    const LiquifyStaking = await ethers.getContractFactory("LiquifyStaking");

    const SimpleNFT = await ethers.getContractFactory("SimpleNFT");
    const RewardToken = await ethers.getContractFactory("RewardToken");

    [owner, alice, bob] = await ethers.getSigners();
    //setting up contracts
    nft = await SimpleNFT.deploy();
    vault = await Vault.deploy(nft.address);
    liquifyStaking = await LiquifyStaking.deploy(nft.address);

    rewardToken = await RewardToken.deploy(
      "RewardToken",
      "RT",
      vault.address,
      liquifyStaking.address
    );

    const PricingMechanism = await ethers.getContractFactory(
      "NFTPricingMechanism"
    );
    pricingMechanism = await PricingMechanism.deploy();

    // setting variables for vault
    await vault.setPricingMechanism(pricingMechanism.address);
    await vault.setLiquify(liquifyStaking.address);
    await vault.setRewardToken(rewardToken.address);

    // testing the setRewardTokena,  and setPricingMechanism
    expect(await vault.rewardToken()).to.eq(rewardToken.address);
    expect(await vault.liquify()).to.eq(liquifyStaking.address);
    expect(await vault.pricingMechanism()).to.eq(pricingMechanism.address);

    // testing the setRewardToken,  set setPricingMechanism ownerOnly caller
    // minting NFTs
    const transaction1 = await (await nft.mint(alice.address)).wait();
    const transaction2 = await (await nft.mint(bob.address)).wait();

    aliceNFTTokenStakedForReward = transaction1.events.find(
      (l) => l.event === "NFTMinted"
    ).args.tokenId;
    bobNFTTokenStakedForReward = transaction2.events.find(
      (l) => l.event === "NFTMinted"
    ).args.tokenId;

    // testing simpleNFT mint function
    expect(await nft.ownerOf(aliceNFTTokenStakedForReward)).to.eq(
      alice.address
    );
    expect(await nft.ownerOf(bobNFTTokenStakedForReward)).to.eq(bob.address);

    // set NFT price in NFTPricingMechanism
    await (
      await pricingMechanism.calculateNFTValue(aliceNFTTokenStakedForReward)
    ).wait();
    await (
      await pricingMechanism.calculateNFTValue(bobNFTTokenStakedForReward)
    ).wait();

    expect(
      await pricingMechanism.getNFTValue(aliceNFTTokenStakedForReward)
    ).to.be.above(0);
    expect(
      await pricingMechanism.getNFTValue(bobNFTTokenStakedForReward)
    ).to.be.above(0);

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

  it("Should not allow NFT in Vault to be zero account", async function () {
    const Vault = await ethers.getContractFactory("Vault");
    (
      await expect(Vault.deploy("0x0000000000000000000000000000000000000000"))
    ).to.be.revertedWith("Zero account cannot be used");
  });
});

describe("Vault core tests", function () {
  let nft;
  let vault;
  let rewardToken;
  let pricingMechanism;
  let owner;
  let alice;
  let bob;

  let aliceNFTTokenStakedForReward;
  let bobNFTTokenStakedForReward;
  beforeEach(async function () {
    const Vault = await ethers.getContractFactory("Vault");
    const LiquifyStaking = await ethers.getContractFactory("LiquifyStaking");

    const SimpleNFT = await ethers.getContractFactory("SimpleNFT");
    const RewardToken = await ethers.getContractFactory("RewardToken");

    [owner, alice, bob] = await ethers.getSigners();
    //setting up contracts
    nft = await SimpleNFT.deploy();
    vault = await Vault.deploy(nft.address);
    liquifyStaking = await LiquifyStaking.deploy(nft.address);

    rewardToken = await RewardToken.deploy(
      "RewardToken",
      "RT",
      vault.address,
      liquifyStaking.address
    );

    const PricingMechanism = await ethers.getContractFactory(
      "NFTPricingMechanism"
    );
    pricingMechanism = await PricingMechanism.deploy();

    // setting variables for vault
    await vault.setPricingMechanism(pricingMechanism.address);
    await vault.setLiquify(liquifyStaking.address);
    await vault.setRewardToken(rewardToken.address);

    // testing the setRewardTokena,  and setPricingMechanism
    expect(await vault.rewardToken()).to.eq(rewardToken.address);
    expect(await vault.liquify()).to.eq(liquifyStaking.address);
    expect(await vault.pricingMechanism()).to.eq(pricingMechanism.address);

    // testing the setRewardToken,  set setPricingMechanism ownerOnly caller
    // minting NFTs
    const transaction1 = await (await nft.mint(alice.address)).wait();
    const transaction2 = await (await nft.mint(bob.address)).wait();

    aliceNFTTokenStakedForReward = transaction1.events.find(
      (l) => l.event === "NFTMinted"
    ).args.tokenId;
    bobNFTTokenStakedForReward = transaction2.events.find(
      (l) => l.event === "NFTMinted"
    ).args.tokenId;

    // testing simpleNFT mint function
    expect(await nft.ownerOf(aliceNFTTokenStakedForReward)).to.eq(
      alice.address
    );
    expect(await nft.ownerOf(bobNFTTokenStakedForReward)).to.eq(bob.address);

    // set NFT price in NFTPricingMechanism
    await (
      await pricingMechanism.calculateNFTValue(aliceNFTTokenStakedForReward)
    ).wait();
    await (
      await pricingMechanism.calculateNFTValue(bobNFTTokenStakedForReward)
    ).wait();

    expect(
      await pricingMechanism.getNFTValue(aliceNFTTokenStakedForReward)
    ).to.be.above(0);
    expect(
      await pricingMechanism.getNFTValue(bobNFTTokenStakedForReward)
    ).to.be.above(0);

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

  it("Should not allow NFT in Vault to be zero account", async function () {
    const Vault = await ethers.getContractFactory("Vault");
    (
      await expect(Vault.deploy("0x0000000000000000000000000000000000000000"))
    ).to.be.revertedWith("Zero account cannot be used");
  });

  it("Should allow the staking of NFTs with transfer of ownership", async function () {
    // Owners unstake their NFTs
    const unstakeTxAlice = await vault
      .connect(alice)
      .unstakeForRewardToken(aliceNFTTokenStakedForReward);
    const unstakeTxBob = await vault
      .connect(bob)
      .unstakeForRewardToken(bobNFTTokenStakedForReward);

    const rUnstakeAlice = await unstakeTxAlice.wait();
    const rUnstakeBob = await unstakeTxBob.wait();

    const unstakeIdAlice = rUnstakeAlice.events.find(
      (l) => l.event === "NFTUnregistered"
    ).args.tokenId;
    const unstakeOwnerAlice = rUnstakeAlice.events.find(
      (l) => l.event === "NFTUnregistered"
    ).args.owner;
    const unstakeIdBob = rUnstakeBob.events.find(
      (l) => l.event === "NFTUnregistered"
    ).args.tokenId;
    const unstakeOwnerBob = rUnstakeBob.events.find(
      (l) => l.event === "NFTUnregistered"
    ).args.owner;

    // Test event emission
    expect(unstakeOwnerAlice).to.eq(alice.address);
    expect(unstakeIdAlice).to.eq(aliceNFTTokenStakedForReward);

    expect(unstakeOwnerBob).to.eq(bob.address);
    expect(unstakeIdBob).to.eq(bobNFTTokenStakedForReward);

    //Test ownership back to alice and bobo after unstaking
    expect(await nft.ownerOf(aliceNFTTokenStakedForReward)).to.eq(
      alice.address
    );
    expect(await nft.ownerOf(bobNFTTokenStakedForReward)).to.eq(bob.address);

    // Test no one is approved for the unstaked tokens
    expect(await nft.getApproved(aliceNFTTokenStakedForReward)).to.eq(
      ethers.constants.AddressZero
    );
    expect(await nft.getApproved(bobNFTTokenStakedForReward)).to.eq(
      ethers.constants.AddressZero
    );
  });

  it("Should allow vault to mint reward tokens", async function () {
    const tx = await vault.connect(owner).adminMint(alice.address, scale(100));
    const r = await tx.wait();

    const account = r.events.find((l) => l.event === "RewardTokensMinted").args
      .account;
    const amount = r.events.find((l) => l.event === "RewardTokensMinted").args
      .amount;

    await rewardToken.balanceOf(alice.address);

    // Test event emission for reward token minting
    expect(account).to.eq(alice.address);
    expect(amount).to.eq(scale(100));

    // Test reward token minting for Alice
    expect(await rewardToken.balanceOf(alice.address)).to.eq(scale(100));
    let transferRes = await rewardToken
      .connect(alice)
      .transfer(bob.address, 100);

    // Test alice could use the reward tokens
    expect(await rewardToken.balanceOf(bob.address)).to.eq(100);
  });

  it("Only vault should be able to mint reward tokens", async function () {
    await expect(
      rewardToken.connect(owner).mint(owner.address, scale(100))
    ).to.be.revertedWith("Only minter can mint reward tokens");
  });

  it("When unstaking NFT should update rewards in RegistrationMetadata ", async function () {
    // Retrieve NFTs metadata
    const metadata1 = await vault
      .connect(owner)
      .registeredNFTForReward(aliceNFTTokenStakedForReward);
    const metadata2 = await vault
      .connect(owner)
      .registeredNFTForReward(bobNFTTokenStakedForReward);

    hre.network.provider.send("evm_increaseTime", 500);

    await vault
      .connect(alice)
      .updateNFTVaultReward(aliceNFTTokenStakedForReward);
    await vault.connect(bob).updateNFTVaultReward(bobNFTTokenStakedForReward);

    // Retrieve NFTs metadata
    const metadata1After = await vault
      .connect(owner)
      .registeredNFTForReward(aliceNFTTokenStakedForReward);
    const metadata2After = await vault
      .connect(owner)
      .registeredNFTForReward(bobNFTTokenStakedForReward);

    // reward was 0, now it has been increased after update
    expect(metadata1After.reward).to.be.above(metadata1.reward);
    expect(metadata2After.reward).to.be.above(metadata2.reward);
    // Test that rewardCalculationEpoch has been updated with the latest calculation epoch
    expect(metadata1After.rewardCalculationEpoch).to.be.above(
      metadata1.rewardCalculationEpoch
    );
    expect(metadata2After.rewardCalculationEpoch).to.be.above(
      metadata2.rewardCalculationEpoch
    );

    hre.network.provider.send("evm_increaseTime", [500]);

    await vault
      .connect(alice)
      .updateNFTVaultReward(aliceNFTTokenStakedForReward);
    await vault.connect(bob).updateNFTVaultReward(bobNFTTokenStakedForReward);

    // Retrieve staked for reward NFTs metadata
    const metadata1After2 = await vault
      .connect(owner)
      .registeredNFTForReward(aliceNFTTokenStakedForReward);
    const metadata2After2 = await vault
      .connect(owner)
      .registeredNFTForReward(bobNFTTokenStakedForReward);

    // Make sure the reward accumulates owertime after second update
    expect(metadata1After2.reward).to.be.above(metadata1After.reward);
    expect(metadata1After2.rewardCalculationEpoch).to.be.above(
      metadata1After.rewardCalculationEpoch
    );

    expect(metadata2After2.reward).to.be.above(metadata2After.reward);
    expect(metadata2After2.rewardCalculationEpoch).to.be.above(
      metadata2After.rewardCalculationEpoch
    );
  });

  it("When unstaking NFT should set isStaked to false, stakeTime to 0 ,  keeping owner and reward and nft value", async function () {
    //update reward before unstaking
    hre.network.provider.send("evm_increaseTime", [500]);

    await vault
      .connect(alice)
      .updateNFTVaultReward(aliceNFTTokenStakedForReward);

    await (
      await vault
        .connect(alice)
        .unstakeForRewardToken(aliceNFTTokenStakedForReward)
    ).wait();

    // Retrieve NFTs metadata
    let metadata1 = await vault
      .connect(owner)
      .registeredNFTForReward(aliceNFTTokenStakedForReward);

    // Test value hasn't been reset
    expect(metadata1.value).to.above(0);
    // Test reward hasn't been reset
    expect(metadata1.reward).to.above(0);
    // Test stakeTime has been reset
    expect(metadata1.stakeTime).to.eq(0);
    // Test isStaked set to false
    assert.isFalse(metadata1.isStaked, "should not be staked");
  });

  it("User rewards could be redeemable after unstaking", async function () {
    //fast forward
    hre.network.provider.send("evm_increaseTime", [500]);

    await vault
      .connect(alice)
      .updateNFTVaultReward(aliceNFTTokenStakedForReward);

    let aliceReward = (
      await vault.registeredNFTForReward(aliceNFTTokenStakedForReward)
    ).reward;

    await vault
      .connect(alice)
      .unstakeForRewardToken(aliceNFTTokenStakedForReward);

    await (
      await vault.connect(alice).claimRewardTokens(aliceNFTTokenStakedForReward)
    ).wait();

    // Test alice now owns $reward reward token
    expect(await rewardToken.balanceOf(alice.address)).to.eq(aliceReward);
    // Test reward has been set to 0 after Claiming Reward
    expect(
      (await vault.registeredNFTForReward(aliceNFTTokenStakedForReward)).reward
    ).to.eq(0);
  });

  it("NFT Reward should not increase after unstaking", async function () {
    //fast forward
    hre.network.provider.send("evm_increaseTime", [500]);

    await vault
      .connect(alice)
      .updateNFTVaultReward(aliceNFTTokenStakedForReward);

    let tokenMetadata1 = await vault.registeredNFTForReward(
      aliceNFTTokenStakedForReward
    );

    // claim reward, -> 0
    await (
      await vault.connect(alice).claimRewardTokens(aliceNFTTokenStakedForReward)
    ).wait();

    // alice unstake
    await vault
      .connect(alice)
      .unstakeForRewardToken(aliceNFTTokenStakedForReward);

    const rewardAfterUnstaking = await rewardToken.balanceOf(alice.address);

    //try to Update reward;
    hre.network.provider.send("evm_increaseTime", [500]);

    await expect(
      vault.connect(alice).updateNFTVaultReward(aliceNFTTokenStakedForReward)
    ).to.revertedWith("Token not staked");

    // try to get reward
    await expect(
      vault.connect(alice).claimRewardTokens(aliceNFTTokenStakedForReward)
    ).to.revertedWith("No reward available.");

    const rewardAfterUnstakingUpdated = await rewardToken.balanceOf(
      alice.address
    );

    // Test that alice balance hasn't changed since
    expect(rewardAfterUnstaking).to.eq(rewardAfterUnstakingUpdated);
  });
});
