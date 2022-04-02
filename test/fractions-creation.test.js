const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");
const hre = require("hardhat");

function scale(value, decimals = 18) {
  return BigNumber.from(value).mul(BigNumber.from(10).pow(decimals));
}

describe("Fraction tokens of NFT setup", function () {
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
  it("Beforeach setup for 'Fraction Tokens of NFT'", async function () {
    /**
     * Setup and deploy smart contracts
     * mint 2 NFT for alice and bob each
     * calculate NFT value
     * Stake 2 NFT in the reward vault
     * Stake 2 NFT in the Fraction vault
     */
    const Vault = await ethers.getContractFactory("Vault");
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

    // testing the setRewardTokena and setStakingFractionTokens
    expect(await vault.stakingFractionToken()).to.eq(
      stakingFractionToken.address
    );
    expect(await vault.rewardToken()).to.eq(rewardToken.address);
    // testing the setRewardTokena nd setStakingFractionTokens
    expect(
      vault.connect(alice).setStakingFractionToken(stakingFractionToken.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");

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

    //Set Nft price
    await (
      await vault
        .connect(owner)
        .calculateNFTValue(aliceNFTTokenStakedForFraction)
    ).wait();
    await (
      await vault.connect(owner).calculateNFTValue(bobNFTTokenStakedForFraction)
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

    // Approve vault to transfer their NFT on their behalf.
    await (
      await nft
        .connect(alice)
        .approve(vault.address, aliceNFTTokenStakedForFraction)
    ).wait();
    await (
      await nft
        .connect(bob)
        .approve(vault.address, bobNFTTokenStakedForFraction)
    ).wait();

    // test vault is now approved for tokens
    expect(await nft.getApproved(aliceNFTTokenStakedForReward)).to.eq(
      vault.address
    );
    expect(await nft.getApproved(bobNFTTokenStakedForReward)).to.eq(
      vault.address
    );

    await (
      await vault.connect(alice).stakeNFT(aliceNFTTokenStakedForReward)
    ).wait();
    await (
      await vault.connect(bob).stakeNFT(bobNFTTokenStakedForReward)
    ).wait();

    // test vault is owner after staking
    expect(await nft.ownerOf(aliceNFTTokenStakedForReward)).to.eq(
      vault.address
    );
    expect(await nft.ownerOf(bobNFTTokenStakedForReward)).to.eq(vault.address);

    // Stake token3 and token4 for Fraction staking.
    stakeAliceFractions = await (
      await vault
        .connect(alice)
        .stakeNFTFractions(aliceNFTTokenStakedForFraction)
    ).wait();

    stakeBobFractions = await (
      await vault.connect(bob).stakeNFTFractions(bobNFTTokenStakedForFraction)
    ).wait();

    // test vault is owner after staking
    expect(await nft.ownerOf(aliceNFTTokenStakedForFraction)).to.eq(
      vault.address
    );
    expect(await nft.ownerOf(bobNFTTokenStakedForFraction)).to.eq(
      vault.address
    );
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

  let aliceNFTTokenStakedForReward;
  let bobNFTTokenStakedForReward;
  let aliceNFTTokenStakedForFraction;
  let bobNFTTokenStakedForFraction;

  let stakeAliceFractions;
  let stakeBobFractions;
  beforeEach(async function () {
    const Vault = await ethers.getContractFactory("Vault");
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

    // testing the setRewardTokena and setStakingFractionTokens
    expect(await vault.stakingFractionToken()).to.eq(
      stakingFractionToken.address
    );
    expect(await vault.rewardToken()).to.eq(rewardToken.address);
    // testing the setRewardTokena nd setStakingFractionTokens
    expect(
      vault.connect(alice).setStakingFractionToken(stakingFractionToken.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");

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

    //Set Nft price
    await (
      await vault
        .connect(owner)
        .calculateNFTValue(aliceNFTTokenStakedForFraction)
    ).wait();
    await (
      await vault.connect(owner).calculateNFTValue(bobNFTTokenStakedForFraction)
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

    // Approve vault to transfer their NFT on their behalf.
    await (
      await nft
        .connect(alice)
        .approve(vault.address, aliceNFTTokenStakedForFraction)
    ).wait();
    await (
      await nft
        .connect(bob)
        .approve(vault.address, bobNFTTokenStakedForFraction)
    ).wait();

    // test vault is now approved for tokens
    expect(await nft.getApproved(aliceNFTTokenStakedForReward)).to.eq(
      vault.address
    );
    expect(await nft.getApproved(bobNFTTokenStakedForReward)).to.eq(
      vault.address
    );

    await (
      await vault.connect(alice).stakeNFT(aliceNFTTokenStakedForReward)
    ).wait();
    await (
      await vault.connect(bob).stakeNFT(bobNFTTokenStakedForReward)
    ).wait();

    // test vault is owner after staking
    expect(await nft.ownerOf(aliceNFTTokenStakedForReward)).to.eq(
      vault.address
    );
    expect(await nft.ownerOf(bobNFTTokenStakedForReward)).to.eq(vault.address);

    // Stake token3 and token4 for Fraction staking.
    stakeAliceFractions = await (
      await vault
        .connect(alice)
        .stakeNFTFractions(aliceNFTTokenStakedForFraction)
    ).wait();

    stakeBobFractions = await (
      await vault.connect(bob).stakeNFTFractions(bobNFTTokenStakedForFraction)
    ).wait();

    // test vault is owner after staking
    expect(await nft.ownerOf(aliceNFTTokenStakedForFraction)).to.eq(
      vault.address
    );
    expect(await nft.ownerOf(bobNFTTokenStakedForFraction)).to.eq(
      vault.address
    );
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

    expect(stakeAliceArgs.tokenId).to.eq(aliceNFTTokenStakedForFraction);
    expect(stakeBobArgs.tokenId).to.eq(bobNFTTokenStakedForFraction);
  });

  it("When Staking for Fractions, owner should be the vault smart contract", async function () {
    const stakeAliceArgs = stakeAliceFractions.events.find(
      (l) => l.event === "NFTRegisteredForFractions"
    ).args;
    const stakeBobArgs = stakeBobFractions.events.find(
      (l) => l.event === "NFTRegisteredForFractions"
    ).args;

    expect(await nft.ownerOf(aliceNFTTokenStakedForFraction)).to.eq(
      vault.address
    );
    expect(await nft.ownerOf(bobNFTTokenStakedForFraction)).to.eq(
      vault.address
    );
  });

  it("An NFT should not stakable in two stakes", async function () {
    //Alice try to stake again on other satke
    await expect(
      vault.connect(alice).stakeNFTFractions(aliceNFTTokenStakedForReward)
    ).to.be.revertedWith("Already staked for rewards");
    //Smart contract owner try to stake again on other satke
    await expect(
      vault.connect(owner).stakeNFTFractions(aliceNFTTokenStakedForReward)
    ).to.be.revertedWith("Already staked for rewards");
    //Bob try to stake again on other satke
    await expect(
      vault.connect(owner).stakeNFT(bobNFTTokenStakedForFraction)
    ).to.be.revertedWith("Already staked for fractions");
  });

  it("One should be able to redeem their Fraction tokens in exchange for their staked NFT after waiting locking period.", async function () {
    const aliceNftValue = (
      await vault.registeredNFTForFractionToken(aliceNFTTokenStakedForFraction)
    ).value;

    await expect(
      vault.connect(alice).redeemFractionTokens(aliceNFTTokenStakedForFraction)
    ).to.be.revertedWith("Lock period of 5 days");
    //fast-forward
    hre.network.provider.send("evm_increaseTime", [FIVE_DAYS + 1]);

    const res = await (
      await vault
        .connect(alice)
        .redeemFractionTokens(aliceNFTTokenStakedForFraction)
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

  it("One should be able to buy any in the fraction NFT staking pool using their fraction tokens. Fraction tokens are burnt after acquisition", async function () {
    // fast forwards
    hre.network.provider.send("evm_increaseTime", [FIVE_DAYS + 1]);

    await (
      await vault
        .connect(alice)
        .redeemFractionTokens(aliceNFTTokenStakedForFraction)
    ).wait();
    await (
      await vault
        .connect(bob)
        .redeemFractionTokens(bobNFTTokenStakedForFraction)
    ).wait();

    const aliceFractionAmount = await stakingFractionToken.balanceOf(
      alice.address
    );
    const bobFractionAmount = await stakingFractionToken.balanceOf(bob.address);

    const aliceNftValue = (
      await vault.registeredNFTForFractionToken(aliceNFTTokenStakedForFraction)
    ).value;
    const bobNftValue = (
      await vault.registeredNFTForFractionToken(bobNFTTokenStakedForFraction)
    ).value;

    expect(aliceNftValue).to.eq(aliceFractionAmount);
    expect(bobFractionAmount).to.eq(bobNftValue);

    if (aliceFractionAmount > bobFractionAmount) {
      //Alice should be able to buy bobs NFT
      await (
        await vault
          .connect(alice)
          .acquireNFTwithFractions(bobNFTTokenStakedForFraction)
      ).wait();
      // alice should be the new owner of NFT bobNFTTokenStakedForFraction
      expect(await nft.ownerOf(bobNFTTokenStakedForFraction)).to.eq(
        alice.address
      );
      // alice staking fraction token balance should be = her previous balance less the cost of bob nft price
      expect(await stakingFractionToken.balanceOf(alice.address)).to.eq(
        aliceFractionAmount - bobNftValue
      );
      // if bob tries to buy alice one should revert with "Not enough funds."
      await expect(
        vault
          .connect(bob)
          .acquireNFTwithFractions(aliceNFTTokenStakedForFraction)
      ).to.be.revertedWith("Not enough funds.");
    } else if (aliceFractionAmount < bobFractionAmount) {
      //Bob should be able to buy alice's NFT
      await (
        await vault
          .connect(bob)
          .acquireNFTwithFractions(aliceNFTTokenStakedForFraction)
      ).wait();
      // alice should be the new owner of NFT bobNFTTokenStakedForFraction
      expect(await nft.ownerOf(aliceNFTTokenStakedForFraction)).to.eq(
        bob.address
      );
      // alice staking fraction token balance should be = her previous balance less the cost of bob nft price
      expect(await stakingFractionToken.balanceOf(bob.address)).to.eq(
        bobFractionAmount - aliceNftValue
      );
      // if bob tries to buy alice one should revert with "Not enough funds."
      await expect(
        vault
          .connect(alice)
          .acquireNFTwithFractions(bobNFTTokenStakedForFraction)
      ).to.be.revertedWith("Not enough funds.");
    } else if (aliceFractionAmount === bobFractionAmount) {
      //Bob should be able to buy alice's NFT
      await (
        await vault
          .connect(bob)
          .acquireNFTwithFractions(aliceNFTTokenStakedForFraction)
      ).wait();
      // alice should be the new owner of NFT bobNFTTokenStakedForFraction
      expect(await nft.ownerOf(aliceNFTTokenStakedForFraction)).to.eq(
        bob.address
      );
      // alice staking fraction token balance should be = her previous balance less the cost of bob nft price
      expect(await stakingFractionToken.balanceOf(bob.address)).to.eq(
        bobFractionAmount - aliceNftValue
      );
      // if bob tries to buy alice one should revert with "Not enough funds."
      await (
        await vault
          .connect(alice)
          .acquireNFTwithFractions(bobNFTTokenStakedForFraction)
      ).wait();
      // alice should be the new owner of NFT bobNFTTokenStakedForFraction
      expect(await nft.ownerOf(bobNFTTokenStakedForFraction)).to.eq(
        alice.address
      );
      // alice staking fraction token balance should be = her previous balance less the cost of bob nft price
      expect(await stakingFractionToken.balanceOf(alice.address)).to.eq(
        aliceNftValue - bobFractionAmount 
      );
    }
  });
});
