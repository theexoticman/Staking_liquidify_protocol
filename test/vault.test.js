const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");

function scale(value, decimals = 18) {
  return BigNumber.from(value).mul(BigNumber.from(10).pow(decimals));
}

function sleep(milliseconds) {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
}

describe("Vault tests", function () {
  let nft;
  let vault;
  let rewardToken;
  let owner;
  let alice;
  let bob;
  let Vault;
  beforeEach(async function () {
    Vault = await ethers.getContractFactory("Vault");
    const SimpleNFT = await ethers.getContractFactory("SimpleNFT");
    const RewardToken = await ethers.getContractFactory("RewardToken");
    [owner, alice, bob] = await ethers.getSigners();
    nft = await SimpleNFT.deploy();
    vault = await Vault.deploy(nft.address);
    rewardToken = await RewardToken.deploy("RewardToken", "RT", vault.address);
    const tx = await vault.setRewardToken(rewardToken.address);
    await tx.wait();
  });

  it("Should not allow NFT in Vault to be zero account", async function () {
    await expect(
      Vault.deploy("0x0000000000000000000000000000000000000000")
    ).to.be.revertedWith("Zero account cannot be used");
  });

  it("Should allow the staking of NFTs with transfer of ownership", async function () {
    // Mint 2 new Simple NFTs
    const tx1 = await nft.mint(alice.address);
    const tx2 = await nft.mint(bob.address);

    const rcpt1 = await tx1.wait();
    const rcpt2 = await tx2.wait();

    //starts at 0
    const id1 = rcpt1.events.find((l) => l.event === "NFTMinted").args.tokenID;
    const id2 = rcpt2.events.find((l) => l.event === "NFTMinted").args.tokenID;

    //Approve vault to transfer their NFT on their behalf.
    await nft.connect(alice).approve(vault.address, id1);
    await nft.connect(bob).approve(vault.address, id2);

    //Check Vault is approved.
    expect(await nft.getApproved(id1)).to.eq(vault.address);
    expect(await nft.getApproved(id2)).to.eq(vault.address);

    //Make sure Owners keep ownership
    expect(await nft.ownerOf(id1)).to.eq(alice.address);
    expect(await nft.ownerOf(id2)).to.eq(bob.address);

    const stakeTxAlice = await vault.connect(alice).stakeNFT(id1);
    const stakeTxBob = await vault.connect(bob).stakeNFT(id2);

    const rStakeAlice = await stakeTxAlice.wait();
    const rStakeBob = await stakeTxBob.wait();

    const stakeIdAlice = rStakeAlice.events.find(
      (l) => l.event === "NFTRegistered"
    ).args.tokenID;
    const stakeOwnerAlice = rStakeAlice.events.find(
      (l) => l.event === "NFTRegistered"
    ).args.owner;
    const stakeIdBob = rStakeBob.events.find((l) => l.event === "NFTRegistered")
      .args.tokenID;
    const stakeOwnerBob = rStakeBob.events.find(
      (l) => l.event === "NFTRegistered"
    ).args.owner;

    expect(stakeOwnerAlice).to.eq(alice.address);
    expect(stakeOwnerBob).to.eq(bob.address);
    expect(stakeIdAlice).to.eq(id1);
    expect(stakeIdBob).to.eq(id2);

    // After Staking, Vault is the new Owner
    expect(await nft.ownerOf(id1)).to.eq(vault.address);
    expect(await nft.ownerOf(id2)).to.eq(vault.address);

    // Owners unstake their NFTs
    const unstakeTxAlice = await vault.connect(alice).unstakeNFT(id1);
    const unstakeTxBob = await vault.connect(bob).unstakeNFT(id2);

    const rUnstakeAlice = await unstakeTxAlice.wait();
    const rUnstakeBob = await unstakeTxBob.wait();

    const unstakeIdAlice = rUnstakeAlice.events.find(
      (l) => l.event === "NFTUnregistered"
    ).args.tokenID;
    const unstakeOwnerAlice = rUnstakeAlice.events.find(
      (l) => l.event === "NFTUnregistered"
    ).args.owner;
    const unstakeIdBob = rUnstakeBob.events.find(
      (l) => l.event === "NFTUnregistered"
    ).args.tokenID;
    const unstakeOwnerBob = rUnstakeBob.events.find(
      (l) => l.event === "NFTUnregistered"
    ).args.owner;

    //erc721.transferFrom give back ownership to owners in the Unstake function.
    expect(await nft.ownerOf(id1)).to.eq(alice.address);
    expect(await nft.ownerOf(id2)).to.eq(bob.address);
    expect(unstakeOwnerAlice).to.eq(alice.address);
    expect(unstakeOwnerBob).to.eq(bob.address);
    expect(unstakeIdAlice).to.eq(id1);
    expect(unstakeIdBob).to.eq(id2);
  });

  it("Should allow vault to mint reward tokens", async function () {
    const tx = await vault.adminMint(alice.address, scale(100));
    const r = await tx.wait();
    const account = r.events.find((l) => l.event === "TokensMinted").args
      .account;
    const amount = r.events.find((l) => l.event === "TokensMinted").args.amount;
    expect(account).to.eq(alice.address);
    expect(amount).to.eq(scale(100));
    expect(await rewardToken.balanceOf(alice.address)).to.eq(scale(100));
  });

  it("Only vault should be able to mint reward tokens", async function () {
    await expect(
      rewardToken.connect(owner).mint(owner.address, scale(100))
    ).to.be.revertedWith("Only minter can mint reward tokens");
  });

  it("NFT random Value should be in [1,50]", async function () {
    let value;
    for (let i = 0; i < 1000; i++) {
      value = await vault.unsafeNFTRandomValue();
      expect(value).to.be.below(51);
      expect(value).to.be.above(0);
    }
  });

  it("Should update rewards in RegistrationMetadata", async function () {
    // mint 2 NFTs
    const tx1 = await (await nft.mint(alice.address)).wait();
    const tx2 = await (await nft.mint(bob.address)).wait();
    const tx3 = await (await nft.mint(bob.address)).wait();

    //starts at 0
    const id1 = tx1.events.find((l) => l.event === "NFTMinted").args.tokenID;
    const id2 = tx2.events.find((l) => l.event === "NFTMinted").args.tokenID;
    const id3 = tx3.events.find((l) => l.event === "NFTMinted").args.tokenID;

    //Approve vault to transfer their NFT on their behalf.
    await nft.connect(alice).approve(vault.address, id1);
    await nft.connect(bob).approve(vault.address, id2);
    await nft.connect(bob).approve(vault.address, id3);

    // stack the NFT
    const stakeTxAlice = await (
      await vault.connect(alice).stakeNFT(id1)
    ).wait();
    const stakeTxBob1 = await (await vault.connect(bob).stakeNFT(id2)).wait();
    const stakeTxBob2 = await (await vault.connect(bob).stakeNFT(id3)).wait();

    // Retrieve NFTs metadata
    const metadata1 = await vault.connect(owner).registeredTokens(id1);
    const metadata2 = await vault.connect(owner).registeredTokens(id2);
    const metadata3 = await vault.connect(owner).registeredTokens(id3);

    sleep(5000);
    await vault.udpateReward();

    // Retrieve NFTs metadata
    let metadata1After = await vault.connect(owner).registeredTokens(id1);
    let metadata2After = await vault.connect(owner).registeredTokens(id2);
    let metadata3After = await vault.connect(owner).registeredTokens(id3);

    // reward was 0, now it has been calculated once
    expect(metadata1After.reward).to.be.above(metadata1.reward);
    expect(metadata1After.stakeTime).to.be.above(metadata1.stakeTime);

    expect(metadata2After.reward).to.be.above(metadata2.reward);
    expect(metadata2After.stakeTime).to.be.above(metadata2.stakeTime);

    expect(metadata3After.reward).to.be.above(metadata3.reward);
    expect(metadata3After.stakeTime).to.be.above(metadata3.stakeTime);

    sleep(5000);

    await vault.udpateReward();

    // Retrieve NFTs metadata
    metadata1After = await vault.connect(owner).registeredTokens(id1);
    metadata2After = await vault.connect(owner).registeredTokens(id2);
    metadata3After = await vault.connect(owner).registeredTokens(id3);

    // Make sure the reward accumulates owertime.
    expect(metadata1After.reward).to.be.above(metadata1.reward);
    expect(metadata1After.stakeTime).to.be.above(metadata1.stakeTime);

    expect(metadata2After.reward).to.be.above(metadata2.reward);
    expect(metadata2After.stakeTime).to.be.above(metadata2.stakeTime);

    expect(metadata3After.reward).to.be.above(metadata3.reward);
    expect(metadata3After.stakeTime).to.be.above(metadata3.stakeTime);
  });

  it("Should set isStacked to false when unstaking NFT, value and stakeTime to 0, keeping owner and reward", async function () {
    // mint 2 NFTs
    const tx1 = await (await nft.mint(alice.address)).wait();

    //starts at 1
    const id1 = tx1.events.find((l) => l.event === "NFTMinted").args.tokenID;

    //Approve vault to transfer their NFT on their behalf.
    await nft.connect(alice).approve(vault.address, id1);

    // stack the NFT
    const stakeTxAlice = await (
      await vault.connect(alice).stakeNFT(id1)
    ).wait();

    //update before unstaking
    sleep(5000);
    await vault.udpateReward();

    await vault.connect(alice).unstakeNFT(id1);

    // Retrieve NFTs metadata
    let metadata1 = await vault.connect(owner).registeredTokens(id1);

    expect(metadata1.value).to.eq(0);
    expect(metadata1.reward).to.above(0);
    expect(metadata1.stakeTime).to.eq(0);
  });

  it("User Reward Should be claimable after unstaking", async function () {
    // mint 2 NFTs
    const tx1 = await (await nft.mint(alice.address)).wait();

    //starts at 0
    const id1 = tx1.events.find((l) => l.event === "NFTMinted").args.tokenID;

    //Approve vault to transfer their NFT on their behalf.
    await nft.connect(alice).approve(vault.address, id1);

    // stack the NFT
    const stakeTxAlice = await (
      await vault.connect(alice).stakeNFT(id1)
    ).wait();

    //Update reward;
    sleep(5000);
    await vault.udpateReward();

    let metadata1 = await vault.connect(owner).registeredTokens(id1);

    await vault.connect(alice).unstakeNFT(id1);

    const reward = await vault.getRewards(alice.address);

    expect(reward).to.be.above(0);
  });
});
