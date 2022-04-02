const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");
const hre = require("hardhat");

function scale(value, decimals = 18) {
  return BigNumber.from(value).mul(BigNumber.from(10).pow(decimals));
}

describe("Test application setup", function () {
  it("Should allow the staking of NFTs with transfer of ownership", async function () {
    /*     const rStakeAlice = await stakeTxAlice.wait();
    const rStakeBob = await stakeTxBob.wait();

    const stakeIdAlice = rStakeAlice.events.find(
      (l) => l.event === "NFTRegistered"
    ).args.tokenId;
    const stakeOwnerAlice = rStakeAlice.events.find(
      (l) => l.event === "NFTRegistered"
    ).args.owner;
    const stakeIdBob = rStakeBob.events.find((l) => l.event === "NFTRegistered")
      .args.tokenId;
    const stakeOwnerBob = rStakeBob.events.find(
      (l) => l.event === "NFTRegistered"
    ).args.owner;

    expect(stakeOwnerAlice).to.eq(alice.address);
    expect(stakeOwnerBob).to.eq(bob.address);
    expect(stakeIdAlice).to.eq(id1);
    expect(stakeIdBob).to.eq(id2); */
  });
});

describe("Vault tests", function () {
  let nft;
  let vault;
  let rewardToken;
  let stakingFractionToken;
  let owner;
  let alice;
  let bob;
  let Vault;

  let tokenId1;
  let tokenId2;
  beforeEach(async function () {
    Vault = await ethers.getContractFactory("Vault");
    const SimpleNFT = await ethers.getContractFactory("SimpleNFT");
    const RewardToken = await ethers.getContractFactory("RewardToken");
    const StakingFractionToken = await ethers.getContractFactory(
      "StakingFractionToken"
    );
    [owner, alice, bob] = await ethers.getSigners();
    //setting up contracts
    nft = await SimpleNFT.deploy();
    vault = await Vault.deploy(nft.address);

    rewardToken = await RewardToken.deploy("RewardToken", "RT", vault.address);
    stakingFractionToken = await StakingFractionToken.deploy(
      "StakingFractionToken",
      "SFT",
      vault.address
    );
    const tx = await vault.setRewardToken(rewardToken.address);
    await tx.wait();
    const tx2 = await vault.setStakingFractionToken(
      stakingFractionToken.address
    );
    await tx2.wait();

    // creating NFTs
    const transaction1 = await (await nft.mint(alice.address)).wait();
    const transaction2 = await (await nft.mint(bob.address)).wait();

    tokenId1 = transaction1.events.find((l) => l.event === "NFTMinted").args
      .tokenId;
    tokenId2 = transaction2.events.find((l) => l.event === "NFTMinted").args
      .tokenId;

    // set NFT price
    await (await vault.connect(owner).calculateNFTValue(tokenId1)).wait();
    await (await vault.connect(owner).calculateNFTValue(tokenId2)).wait();

    //Approve vault to transfer their NFT on their behalf.
    await (await nft.connect(alice).approve(vault.address, tokenId1)).wait();
    await (await nft.connect(bob).approve(vault.address, tokenId2)).wait();

    await (await vault.connect(alice).stakeNFT(tokenId1)).wait();
    await (await vault.connect(bob).stakeNFT(tokenId2)).wait();
  });

  it("Should not allow NFT in Vault to be zero account", async function () {
    (
      await expect(Vault.deploy("0x0000000000000000000000000000000000000000"))
    ).to.be.revertedWith("Zero account cannot be used");
  });

  // TODO Refactor this testf
  it("Should allow the staking of NFTs with transfer of ownership", async function () {
    // After Staking, Vault is the new Owner
    expect(await nft.ownerOf(tokenId1)).to.eq(vault.address);
    expect(await nft.ownerOf(tokenId2)).to.eq(vault.address);

    // Owners unstake their NFTs
    const unstakeTxAlice = await vault.connect(alice).unstakeNFT(tokenId1);
    const unstakeTxBob = await vault.connect(bob).unstakeNFT(tokenId2);

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

    //erc721.transferFrom give back ownership to owners in the Unstake function.
    expect(await nft.ownerOf(tokenId1)).to.eq(alice.address);
    expect(await nft.ownerOf(tokenId2)).to.eq(bob.address);
    expect(unstakeOwnerAlice).to.eq(alice.address);
    expect(unstakeOwnerBob).to.eq(bob.address);
    expect(unstakeIdAlice).to.eq(tokenId1);
    expect(unstakeIdBob).to.eq(tokenId2);
  });

  it("Should allow vault to mint reward tokens", async function () {
    const tx = await vault.connect(owner).adminMint(alice.address, scale(100));
    const r = await tx.wait();

    const account = r.events.find((l) => l.event === "RewardTokensMinted").args
      .account;
    const amount = r.events.find((l) => l.event === "RewardTokensMinted").args
      .amount;

    await rewardToken.balanceOf(alice.address);

    expect(account).to.eq(alice.address);
    expect(amount).to.eq(scale(100));
    expect(await rewardToken.balanceOf(alice.address)).to.eq(scale(100));
    let transferRes = await rewardToken
      .connect(alice)
      .transfer(bob.address, 100);
    expect(await rewardToken.balanceOf(bob.address)).to.eq(100);
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

  it("Should update rewards in RegistrationMetadata when calling updateReward ", async function () {
    // Retrieve NFTs metadata
    const metadata1 = await vault.connect(owner).registeredTokens(tokenId1);
    const metadata2 = await vault.connect(owner).registeredTokens(tokenId2);

    hre.network.provider.send("evm_increaseTime", 500);

    await vault.connect(owner).updateReward(tokenId1);
    await vault.connect(owner).updateReward(tokenId2);

    // Retrieve NFTs metadata
    let metadata1After = await vault.connect(owner).registeredTokens(tokenId1);
    let metadata2After = await vault.connect(owner).registeredTokens(tokenId2);

    // reward was 0, now it has been calculated once
    expect(metadata1After.reward).to.be.above(metadata1.reward);
    expect(metadata1After.rewardSnapshotTime).to.be.above(
      metadata1.rewardSnapshotTime
    );

    expect(metadata2After.reward).to.be.above(metadata2.reward);
    expect(metadata2After.rewardSnapshotTime).to.be.above(
      metadata2.rewardSnapshotTime
    );

    hre.network.provider.send("evm_increaseTime", [500]);

    await vault.connect(owner).updateReward(tokenId1);
    await vault.connect(owner).updateReward(tokenId2);

    // Retrieve NFTs metadata
    metadata1After = await vault.connect(owner).registeredTokens(tokenId1);
    metadata2After = await vault.connect(owner).registeredTokens(tokenId2);

    // Make sure the reward accumulates owertime.
    expect(metadata1After.reward).to.be.above(metadata1.reward);
    expect(metadata1After.rewardSnapshotTime).to.be.above(
      metadata1.rewardSnapshotTime
    );

    expect(metadata2After.reward).to.be.above(metadata2.reward);
    expect(metadata2After.rewardSnapshotTime).to.be.above(
      metadata2.rewardSnapshotTime
    );
  });

  it("Should set isStaked to false, stakeTime to 0 when unstaking NFT,  keeping owner and reward and values", async function () {
    //update reward before unstaking
    hre.network.provider.send("evm_increaseTime", [500]);

    await vault.connect(owner).updateReward(tokenId1);

    await (await vault.connect(alice).unstakeNFT(tokenId1)).wait();

    // Retrieve NFTs metadata
    let metadata1 = await vault.connect(owner).registeredTokens(tokenId1);

    expect(metadata1.value).to.above(0);
    expect(metadata1.reward).to.above(0);
    expect(metadata1.stakeTime).to.eq(0);
    assert.isFalse(metadata1.isStaked, "should not be staked");
  });

  it("User Reward could be redeemable after unstaking", async function () {
    // mint 2 NFTs
    const tx1 = await (await nft.mint(alice.address)).wait();

    //starts at 0
    const id1 = tx1.events.find((l) => l.event === "NFTMinted").args.tokenId;

    //Approve vault to transfer their NFT on their behalf.
    await nft.connect(alice).approve(vault.address, id1);

    // set NFT price
    await (await vault.connect(owner).calculateNFTValue(id1)).wait();

    // stak the NFT
    const stakeTxAlice = await (
      await vault.connect(alice).stakeNFT(id1)
    ).wait();

    //Update reward;
    hre.network.provider.send("evm_increaseTime", [500]);

    await vault.connect(owner).updateReward(id1);

    let metadata1 = await vault.registeredTokens(id1);

    await vault.connect(alice).unstakeNFT(id1);

    await (await vault.connect(alice).claimRewardTokens(id1)).wait();

    expect(await rewardToken.balanceOf(alice.address)).to.be.above(0);
    // check reward has been set to 0;
  });
  it("NFT Reward should not increase after unstaking", async function () {
    //Update reward;
    hre.network.provider.send("evm_increaseTime", [500]);
    await vault.connect(owner).updateReward(tokenId1);

    let tokenMetadata1 = await vault.registeredTokens(tokenId1);

    // claim reward
    await (await vault.connect(alice).claimRewardTokens(tokenId1)).wait();

    // alice unstake
    await vault.connect(alice).unstakeNFT(tokenId1);

    const rewardAfterUnstaking = await rewardToken.balanceOf(alice.address);

    //try to Update reward;
    hre.network.provider.send("evm_increaseTime", [500]);
    await expect(vault.connect(owner).updateReward(tokenId1)).to.revertedWith(
      "Token not staked"
    );

    // try to get reward
    await expect(
      vault.connect(alice).claimRewardTokens(tokenId1)
    ).to.revertedWith("No reward available");

    const rewardAfterUnstakingUpdated = await rewardToken.balanceOf(
      alice.address
    );

    expect(rewardAfterUnstaking).to.eq(rewardAfterUnstakingUpdated);
  });
});

describe("Reward Tests", function () {
  let nft;
  let vault;
  let rewardToken;
  let stakingFractionToken;
  let owner;
  let owner2;
  let alice;
  let bob;
  let Vault;

  let tokenId1;
  let tokenId2;
  beforeEach(async function () {
    Vault = await ethers.getContractFactory("Vault");
    const SimpleNFT = await ethers.getContractFactory("SimpleNFT");
    const RewardToken = await ethers.getContractFactory("RewardToken");
    const StakingFractionToken = await ethers.getContractFactory(
      "StakingFractionToken"
    );
    [owner, alice, bob] = await ethers.getSigners();
    owner2 = owner;
    //setting up contracts
    nft = await SimpleNFT.deploy();
    vault = await Vault.deploy(nft.address);
    rewardToken = await RewardToken.deploy("RewardToken", "RT", vault.address);
    stakingFractionToken = await StakingFractionToken.deploy(
      "StakingFractionToken",
      "SFT",
      vault.address
    );
    const tx = await vault.setRewardToken(rewardToken.address);
    await tx.wait();
    const tx2 = await vault.setStakingFractionToken(
      stakingFractionToken.address
    );
    await tx2.wait();

    // creating NFTs
    const transaction1 = await (await nft.mint(alice.address)).wait();
    const transaction2 = await (await nft.mint(bob.address)).wait();

    tokenId1 = transaction1.events.find((l) => l.event === "NFTMinted").args
      .tokenId;
    tokenId2 = transaction2.events.find((l) => l.event === "NFTMinted").args
      .tokenId;

    // set NFT price
    await (await vault.connect(owner).calculateNFTValue(tokenId1)).wait();
    await (await vault.connect(owner).calculateNFTValue(tokenId2)).wait();

    //Approve vault to transfer their NFT on their behalf.
    await (await nft.connect(alice).approve(vault.address, tokenId1)).wait();
    await (await nft.connect(bob).approve(vault.address, tokenId2)).wait();

    await (await vault.connect(alice).stakeNFT(tokenId1)).wait();
    await (await vault.connect(bob).stakeNFT(tokenId2)).wait();
  });

  it("Claiming Reward Tokens should not be accessible before staking", async function () {
    await expect(
      vault.connect(alice).claimRewardTokens(tokenId1)
    ).to.be.revertedWith("No reward available");
  });

  it("Claiming Reward Tokens should not be accessible by other account", async function () {
    //update the reward for token 1 and 2
    await (await vault.connect(owner).updateReward(tokenId2)).wait();
    await (await vault.connect(owner).updateReward(tokenId1)).wait();

    //Bob minted tokenId2
    await expect(
      vault.connect(alice).claimRewardTokens(tokenId2)
    ).to.be.revertedWith("Only owner can claim StakingRewardTokens");

    claimBob = await expect(
      vault.connect(bob).claimRewardTokens(tokenId1)
    ).to.be.revertedWith("Only owner can claim StakingRewardTokens");
  });

  it("Claiming Reward Tokens should be accessible after staking", async function () {
    // Owner variable went to a festival. It is not referenced anymore.
    // Owner2 took his place
    let res = await vault.connect(owner2).updateReward(tokenId1);
    await res.wait();
    //update the reward for Alice token 1 before claiming tokens

    let aliceFraction = await (
      await vault.connect(alice).claimRewardTokens(tokenId1)
    ).wait();

    let owner = aliceFraction.events.find(
      (l) => l.event === "RewardTokensMinted"
    ).args.account;
    let amount = aliceFraction.events.find(
      (l) => l.event === "RewardTokensMinted"
    ).args.amount;

    expect(owner).to.eq(alice.address);
    expect(amount).to.be.above(0);

    const balanceAlice = await rewardToken.balanceOf(alice.address);

    expect(balanceAlice).to.be.above(0);

    //update the reward for Alice token 1
    await (await vault.connect(owner2).updateReward(tokenId1)).wait();

    aliceFraction = await (
      await vault.connect(alice).claimRewardTokens(tokenId1)
    ).wait();

    owner = aliceFraction.events.find((l) => l.event === "RewardTokensMinted")
      .args.account;

    expect(owner).to.eq(alice.address);
    expect(amount).to.be.above(0);

    const balanceAlice2 = await rewardToken.balanceOf(alice.address);

    // Test total reward is growing
    expect(balanceAlice2).to.be.above(balanceAlice);
  });
});

describe("Fraction tokens of NFT", function () {
  const FIVE_DAYS = 432000;

  let nft;
  let vault;
  let rewardToken;
  let stakingFractionToken;
  let owner;
  let alice;
  let bob;
  let Vault;

  let tokenId1;
  let tokenId2;
  let tokenId3;
  let tokenId4;

  let stakeAliceReward;
  let stakeBobReward;
  let stakeAliceFractions;
  let stakeBobFractions;
  beforeEach(async function () {
    Vault = await ethers.getContractFactory("Vault");
    const SimpleNFT = await ethers.getContractFactory("SimpleNFT");
    const RewardToken = await ethers.getContractFactory("RewardToken");
    const StakingFractionToken = await ethers.getContractFactory(
      "StakingFractionToken"
    );
    [owner, alice, bob] = await ethers.getSigners();
    //Deploying and setting up contracts

    nft = await SimpleNFT.deploy();
    await nft.deployTransaction.wait();

    vault = await Vault.deploy(nft.address);
    await vault.deployTransaction.wait();

    rewardToken = await RewardToken.deploy("RewardToken", "RT", vault.address);
    await rewardToken.deployTransaction.wait();

    stakingFractionToken = await StakingFractionToken.deploy(
      "StakingFractionToken",
      "SFT",
      vault.address
    );
    await stakingFractionToken.deployTransaction.wait();

    await (await vault.setRewardToken(rewardToken.address)).wait();

    await (
      await vault.setStakingFractionToken(stakingFractionToken.address)
    ).wait();

    // creating NFTs
    const transaction1 = await (await nft.mint(alice.address)).wait();

    const transaction2 = await (await nft.mint(bob.address)).wait();

    const transaction3 = await (await nft.mint(alice.address)).wait();
    const transaction4 = await (await nft.mint(bob.address)).wait();

    tokenId1 = transaction1.events.find((l) => l.event === "NFTMinted").args
      .tokenId;
    tokenId2 = transaction2.events.find((l) => l.event === "NFTMinted").args
      .tokenId;

    tokenId3 = transaction3.events.find((l) => l.event === "NFTMinted").args
      .tokenId;
    tokenId4 = transaction4.events.find((l) => l.event === "NFTMinted").args
      .tokenId;

    //Approve vault to transfer their NFT on their behalf.
    await (await nft.connect(alice).approve(vault.address, tokenId1)).wait();
    await (await nft.connect(bob).approve(vault.address, tokenId2)).wait();
    await (await nft.connect(alice).approve(vault.address, tokenId3)).wait();
    await (await nft.connect(bob).approve(vault.address, tokenId4)).wait();

    // set NFT price
    await (await vault.connect(owner).calculateNFTValue(tokenId1)).wait();
    await (await vault.connect(owner).calculateNFTValue(tokenId2)).wait();
    await (await vault.connect(owner).calculateNFTValue(tokenId3)).wait();
    await (await vault.connect(owner).calculateNFTValue(tokenId4)).wait();

    // Stake token1 and token 2 for reward staking.

    stakeAliceReward = await (
      await vault.connect(alice).stakeNFT(tokenId1)
    ).wait();
    stakeBobReward = await (await vault.connect(bob).stakeNFT(tokenId2)).wait();

    // Stake token3 and token4 for Fraction staking.
    stakeAliceFractions = await (
      await vault.connect(alice).stakeNFTFractions(tokenId3)
    ).wait();

    stakeBobFractions = await (
      await vault.connect(bob).stakeNFTFractions(tokenId4)
    ).wait();
  });

  it("When Staking for Fractions, events should log proper data", async function () {
    const stakeAliceArgs = stakeAliceFractions.events.find(
      (l) => l.event === "NFTRegisteredForFractions"
    ).args;
    const stakeBobArgs = stakeBobFractions.events.find(
      (l) => l.event === "NFTRegisteredForFractions"
    ).args;

    expect(stakeAliceArgs.owner).to.eq(alice.address);
    expect(stakeBobArgs.owner).to.eq(bob.address);

    expect(stakeAliceArgs.tokenId).to.eq(tokenId3);
    expect(stakeBobArgs.tokenId).to.eq(tokenId4);
  });

  it("When Staking for Fractions, owner should be the vault smart smart contract", async function () {
    const stakeAliceArgs = stakeAliceFractions.events.find(
      (l) => l.event === "NFTRegisteredForFractions"
    ).args;
    const stakeBobArgs = stakeBobFractions.events.find(
      (l) => l.event === "NFTRegisteredForFractions"
    ).args;

    expect(await nft.ownerOf(tokenId3)).to.eq(vault.address);
    expect(await nft.ownerOf(tokenId4)).to.eq(vault.address);
  });

  it("An NFT should not stakable in two stakes", async function () {
    //Alice try to stake again on other satke
    await expect(
      vault.connect(alice).stakeNFTFractions(tokenId1)
    ).to.be.revertedWith("Already staked for rewards");
    //Smart contract owner try to stake again on other satke
    await expect(
      vault.connect(owner).stakeNFTFractions(tokenId1)
    ).to.be.revertedWith("Already staked for rewards");
    //Bob try to stake again on other satke
    await expect(vault.connect(owner).stakeNFT(tokenId4)).to.be.revertedWith(
      "Already staked for fractions"
    );
  });

  it("One should be able to redeem their ERC20 tokens for their staked NFT after waiting locking period.", async function () {
    const aliceNftValue = (await vault.stakingToFractionRegistry(tokenId3))
      .value;

    await expect(
      vault.connect(alice).redeemFractionTokens(tokenId3)
    ).to.be.revertedWith("Lock period of 5 days");
    //fast-forward
    hre.network.provider.send("evm_increaseTime", [FIVE_DAYS + 1]);

    const res = await (
      await vault.connect(alice).redeemFractionTokens(tokenId3)
    ).wait();

    const args = res.events.find(
      (l) => l.event === "StakingFractionTokenRedeemed"
    ).args;

    expect(args.account).to.eq(alice.address);
    expect(args.amount).to.eq(aliceNftValue);

    // Expect onwership not to have changed
    const aliceStakingFactionTokenBalance =
      await stakingFractionToken.balanceOf(alice.address);

    expect(args.amount).to.eq(aliceStakingFactionTokenBalance);
  });

  it("One should be able to buy a NFT with its fraction tokens", async function () {
    // TODO
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

  let tokenId1;
  let tokenId2;

  let redeemRes;
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

    // creating NFTs
    const transaction1 = await (await nft.mint(alice.address)).wait();

    const transaction2 = await (await nft.mint(bob.address)).wait();

    tokenId1 = transaction1.events.find((l) => l.event === "NFTMinted").args
      .tokenId;
    tokenId2 = transaction2.events.find((l) => l.event === "NFTMinted").args
      .tokenId;

    //Approve vault to transfer their NFT on their behalf.
    await (await nft.connect(alice).approve(vault.address, tokenId1)).wait();
    await (await nft.connect(bob).approve(vault.address, tokenId2)).wait();

    // set NFT price
    await (await vault.connect(owner).calculateNFTValue(tokenId1)).wait();
    await (await vault.connect(owner).calculateNFTValue(tokenId2)).wait();

    // Stake token1 and token 2 for reward staking.

    stakeAliceReward = await (
      await vault.connect(alice).stakeNFTFractions(tokenId1)
    ).wait();
    stakeBobReward = await (
      await vault.connect(bob).stakeNFTFractions(tokenId2)
    ).wait();

    hre.network.provider.send("evm_increaseTime", [FIVE_DAYS + 1]);

    // redeem staking fraction tokens
    redeemRes = await (
      await vault.connect(alice).redeemFractionTokens(tokenId1)
    ).wait();
    let val = redeemRes.events.find(
      (l) => l.event === "StakingFractionTokenRedeemed"
    ).args;
    const balance1 = await stakingFractionToken.balanceOf(alice.address);
  });

  it("Should be able to deposit Staking Fraction tokens, balance is removed from owner and added to the vault", async function () {
    let val = redeemRes.events.find(
      (l) => l.event === "StakingFractionTokenRedeemed"
    ).args;
    const balance1 = await stakingFractionToken.balanceOf(alice.address);

    expect(balance1).to.be.above(0);
    stakingFractionToken.connect(alice).approve(vault.address, balance1);
    let aliceDeposit = await (
      await vault.connect(alice).depositStakingFractionTokens(balance1)
    ).wait();

    const balance2 = await stakingFractionToken.balanceOf(alice.address);

    expect(balance2).to.eq(0);

    const balance3 = await stakingFractionToken.balanceOf(vault.address);

    expect(balance3).to.eq(balance1);
  });

  it("Reward should evolve overtime and one should be able to collect it", async function () {
    let val = redeemRes.events.find(
      (l) => l.event === "StakingFractionTokenRedeemed"
    ).args;
    const balance1 = await stakingFractionToken.balanceOf(alice.address);

    expect(balance1).to.be.above(0);
    stakingFractionToken.connect(alice).approve(vault.address, balance1);
    let aliceDeposit = await (
      await vault.connect(alice).depositStakingFractionTokens(balance1)
    ).wait();

    hre.network.provider.send("evm_increaseTime", [100]);

    await vault.connect(owner).updateFractionVaultReward(alice.address);

    await vault.connect(alice).redeemRewardTokensFractionStaking();

    const balanceReward = await rewardToken.balanceOf(alice.address);

    const account = await vault.stakersContributions(alice.address);

    expect(balanceReward).to.be.above(0);
  });

  it("Reward token should be updated overtime for someone depositing Staking Fraction Tokens", async function () {
    let val = redeemRes.events.find(
      (l) => l.event === "StakingFractionTokenRedeemed"
    ).args;
    const balance1 = await stakingFractionToken.balanceOf(alice.address);

    expect(balance1).to.be.above(0);
    stakingFractionToken.connect(alice).approve(vault.address, balance1);
    let aliceDeposit = await (
      await vault.connect(alice).depositStakingFractionTokens(balance1)
    ).wait();

    hre.network.provider.send("evm_increaseTime", [100]);

    await vault.connect(owner).updateFractionVaultReward(alice.address);

    await vault.connect(alice).redeemRewardTokensFractionStaking();

    const balanceReward = await rewardToken.balanceOf(alice.address);

    const account = await vault.stakersContributions(alice.address);

    hre.network.provider.send("evm_increaseTime", [5000]);

    await vault.connect(alice).redeemRewardTokensFractionStaking();

    const balance2 = await rewardToken.balanceOf(alice.address);

    expect(balance2).to.be.above(balance1);
  });
  it("One should be able to withdraw part or all their deposit", async function () {
    let amount = redeemRes.events.find(
      (l) => l.event === "StakingFractionTokenRedeemed"
    ).args.amount;
    const balance1 = await stakingFractionToken.balanceOf(alice.address);

    expect(balance1).to.eq(amount);

    stakingFractionToken.connect(alice).approve(vault.address, balance1);

    let aliceDeposit = await (
      await vault.connect(alice).depositStakingFractionTokens(balance1)
    ).wait();

    expect(await stakingFractionToken.balanceOf(alice.address)).to.eq(0);
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
    let amount = redeemRes.events.find(
      (l) => l.event === "StakingFractionTokenRedeemed"
    ).args.amount;
    const balance1 = await stakingFractionToken.balanceOf(alice.address);

    expect(balance1).to.eq(amount);

    stakingFractionToken.connect(alice).approve(vault.address, balance1);

    let aliceDeposit = await (
      await vault.connect(alice).depositStakingFractionTokens(balance1)
    ).wait();

    expect(await stakingFractionToken.balanceOf(alice.address)).to.eq(0);

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
      await vault.connect(alice).acquireNFTwithFractions(tokenId1)
    ).wait();
    const acquiredNftOwner = await nft.ownerOf(tokenId1);

    // expect Alice is the new owner
    expect(acquiredNftOwner).to.eq(alice.address);
  });
});
