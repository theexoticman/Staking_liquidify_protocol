const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");
const hre = require("hardhat");

function scale(value, decimals = 18) {
  return BigNumber.from(value).mul(BigNumber.from(10).pow(decimals));
}

describe("Setup of NFT Liquid tokens", function () {
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
  it("Beforeach setup for 'Liquid tokens of NFT'", async function () {
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
    const LiquidNFTToken = await ethers.getContractFactory("LiquidNFTToken");
    const PricingMechanism = await ethers.getContractFactory(
      "NFTPricingMechanism"
    );
    [owner, alice, bob] = await ethers.getSigners();
    //setting up contracts
    nft = await SimpleNFT.deploy();
    vault = await Vault.deploy(nft.address);
    pricingMechanism = await PricingMechanism.deploy();

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
    const tx3 = await vault.setPricingMechanism(pricingMechanism.address);
    await tx3.wait();

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

    // set NFT price
    await (
      await pricingMechanism.calculateNFTValue(aliceNFTTokenStakedForReward)
    ).wait();
    await (
      await pricingMechanism.calculateNFTValue(bobNFTTokenStakedForReward)
    ).wait();

    //Set Nft price
    await (
      await pricingMechanism.calculateNFTValue(aliceNFTTokenStakedForFraction)
    ).wait();
    await (
      await pricingMechanism.calculateNFTValue(bobNFTTokenStakedForFraction)
    ).wait();

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

    //stake tokens for reward
    await (
      await vault
        .connect(alice)
        .stakeForRewardToken(aliceNFTTokenStakedForReward)
    ).wait();
    await (
      await vault.connect(bob).stakeForRewardToken(bobNFTTokenStakedForReward)
    ).wait();

    // Stake others for liquid staking.
    stakeAliceFractions = await (
      await vault
        .connect(alice)
        .stakeForLiquidNFT(aliceNFTTokenStakedForFraction)
    ).wait();

    stakeBobFractions = await (
      await vault.connect(bob).stakeForLiquidNFT(bobNFTTokenStakedForFraction)
    ).wait();
  });
});

describe("Liquid tokens of NFT", function () {
  const FIVE_DAYS = 432000;

  let nft;
  let vault;
  let rewardToken;
  let liquidNFTToken;
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
    const LiquidNFTToken = await ethers.getContractFactory("LiquidNFTToken");
    const PricingMechanism = await ethers.getContractFactory(
      "NFTPricingMechanism"
    );
    [owner, alice, bob] = await ethers.getSigners();
    //setting up contracts
    nft = await SimpleNFT.deploy();
    vault = await Vault.deploy(nft.address);
    pricingMechanism = await PricingMechanism.deploy();

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
    const tx3 = await vault.setPricingMechanism(pricingMechanism.address);
    await tx3.wait();

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

    // set NFT price
    await (
      await pricingMechanism.calculateNFTValue(aliceNFTTokenStakedForReward)
    ).wait();
    await (
      await pricingMechanism.calculateNFTValue(bobNFTTokenStakedForReward)
    ).wait();

    //Set Nft price
    await (
      await pricingMechanism.calculateNFTValue(aliceNFTTokenStakedForFraction)
    ).wait();
    await (
      await pricingMechanism.calculateNFTValue(bobNFTTokenStakedForFraction)
    ).wait();

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

    //stake tokens for reward
    await (
      await vault
        .connect(alice)
        .stakeForRewardToken(aliceNFTTokenStakedForReward)
    ).wait();
    await (
      await vault.connect(bob).stakeForRewardToken(bobNFTTokenStakedForReward)
    ).wait();

    // Stake others for liquid staking.
    stakeAliceFractions = await (
      await vault
        .connect(alice)
        .stakeForLiquidNFT(aliceNFTTokenStakedForFraction)
    ).wait();

    stakeBobFractions = await (
      await vault.connect(bob).stakeForLiquidNFT(bobNFTTokenStakedForFraction)
    ).wait();
  });

  it("When Staking for Liquid tokens, events should log proper data", async function () {
    const stakeAliceArgs = stakeAliceFractions.events.find(
      (l) => l.event === "NFTRegisteredForLiquid"
    ).args;
    const stakeBobArgs = stakeBobFractions.events.find(
      (l) => l.event === "NFTRegisteredForLiquid"
    ).args;

    expect(stakeAliceArgs.owner).to.eq(alice.address);
    expect(stakeBobArgs.owner).to.eq(bob.address);

    expect(stakeAliceArgs.tokenId).to.eq(aliceNFTTokenStakedForFraction);
    expect(stakeBobArgs.tokenId).to.eq(bobNFTTokenStakedForFraction);
  });

  it("When Staking for Liquid tokens, owner should be the vault smart contract", async function () {
    const stakeAliceArgs = stakeAliceFractions.events.find(
      (l) => l.event === "NFTRegisteredForLiquid"
    ).args;
    const stakeBobArgs = stakeBobFractions.events.find(
      (l) => l.event === "NFTRegisteredForLiquid"
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
      vault.connect(alice).stakeForLiquidNFT(aliceNFTTokenStakedForReward)
    ).to.be.revertedWith("Already staked for rewards.");
    //Smart contract owner try to stake again on other satke
    await expect(
      vault.connect(owner).stakeForLiquidNFT(aliceNFTTokenStakedForReward)
    ).to.be.revertedWith("Already staked for rewards.");
    //Bob try to stake again on other satke
    await expect(
      vault.connect(owner).stakeForRewardToken(bobNFTTokenStakedForFraction)
    ).to.be.revertedWith("Already staked for liquid.");
  });

  it("One should be able to redeem their liquid tokens in exchange for their staked NFT after waiting locking period.", async function () {
    const aliceNftValue = (
      await vault.registeredNFTForLiquidNFTToken(aliceNFTTokenStakedForFraction)
    ).value;

    await expect(
      vault.connect(alice).redeemLiquidTokens(aliceNFTTokenStakedForFraction)
    ).to.be.revertedWith("Lock period of 5 days");
    //fast-forward
    hre.network.provider.send("evm_increaseTime", [FIVE_DAYS + 1]);

    const res = await (
      await vault
        .connect(alice)
        .redeemLiquidTokens(aliceNFTTokenStakedForFraction)
    ).wait();

    const args = res.events.find(
      (l) => l.event === "LiquidNFTTokenRedeemed"
    ).args;

    expect(args.account).to.eq(alice.address);
    expect(args.amount).to.eq(aliceNftValue);

    // Expect onwership not to have changed
    const aliceStakingFactionTokenBalance = await liquidNFTToken.balanceOf(
      alice.address
    );

    expect(args.amount).to.eq(aliceStakingFactionTokenBalance);
  });

  it("One should be able to buy any in the Liquid tokens NFT staking pool using their liquid tokens. Liquid tokens tokens are burnt after acquisition", async function () {
    // fast forwards
    hre.network.provider.send("evm_increaseTime", [FIVE_DAYS + 1]);

    await (
      await vault
        .connect(alice)
        .redeemLiquidTokens(aliceNFTTokenStakedForFraction)
    ).wait();
    await (
      await vault.connect(bob).redeemLiquidTokens(bobNFTTokenStakedForFraction)
    ).wait();

    const aliceFractionAmount = await liquidNFTToken.balanceOf(alice.address);
    const bobFractionAmount = await liquidNFTToken.balanceOf(bob.address);

    const aliceNftValue = (
      await vault.registeredNFTForLiquidNFTToken(aliceNFTTokenStakedForFraction)
    ).value;
    const bobNftValue = (
      await vault.registeredNFTForLiquidNFTToken(bobNFTTokenStakedForFraction)
    ).value;

    expect(aliceNftValue).to.eq(aliceFractionAmount);
    expect(bobFractionAmount).to.eq(bobNftValue);

    if (aliceFractionAmount.gt(bobFractionAmount)) {
      //Alice should be able to buy bobs NFT
      await (
        await vault
          .connect(alice)
          .acquireNFTwithLiquidToken(bobNFTTokenStakedForFraction)
      ).wait();
      // alice should be the new owner of NFT bobNFTTokenStakedForFraction
      expect(await nft.ownerOf(bobNFTTokenStakedForFraction)).to.eq(
        alice.address
      );
      // alice staking liquid balance should be = her previous balance less the cost of bob nft price
      expect(await liquidNFTToken.balanceOf(alice.address)).to.eq(
        aliceFractionAmount - bobNftValue
      );
      // if bob tries to buy alice one should revert with "Not enough funds."
      await expect(
        vault
          .connect(bob)
          .acquireNFTwithLiquidToken(aliceNFTTokenStakedForFraction)
      ).to.be.revertedWith("Not enough funds.");
    } else if (aliceFractionAmount.lt(bobFractionAmount)) {
      //Bob should be able to buy alice's NFT
      await (
        await vault
          .connect(bob)
          .acquireNFTwithLiquidToken(aliceNFTTokenStakedForFraction)
      ).wait();
      // bob should be the new owner of NFT aliceNFTTokenStakedForFraction
      expect(await nft.ownerOf(aliceNFTTokenStakedForFraction)).to.eq(
        bob.address
      );
      // bob liquidNFT token balance should be = his previous balance less the cost of alice nft price
      expect(await liquidNFTToken.balanceOf(bob.address)).to.eq(
        bobFractionAmount - aliceNftValue
      );
      // if alice tries to buy bob one should revert with "Not enough funds."
      await expect(
        vault
          .connect(alice)
          .acquireNFTwithLiquidToken(bobNFTTokenStakedForFraction)
      ).to.be.revertedWith("Not enough funds.");
    } else if (aliceFractionAmount.eq(bobFractionAmount)) {
      //Bob should be able to buy alice's NFT
      await (
        await vault
          .connect(bob)
          .acquireNFTwithLiquidToken(aliceNFTTokenStakedForFraction)
      ).wait();
      // bob should be the new owner of NFT aliceNFTTokenStakedForFraction
      expect(await nft.ownerOf(aliceNFTTokenStakedForFraction)).to.eq(
        bob.address
      );
      // bob liquid nft token balance should be = her previous balance less the cost of bob nft price
      expect(await liquidNFTToken.balanceOf(bob.address)).to.eq(
        bobFractionAmount - aliceNftValue
      );
      // alice should be the new owner of NFT bobNFTTokenStakedForFraction
      await (
        await vault
          .connect(alice)
          .acquireNFTwithLiquidToken(bobNFTTokenStakedForFraction)
      ).wait();
      // alice should be the new owner of NFT bobNFTTokenStakedForFraction
      expect(await nft.ownerOf(bobNFTTokenStakedForFraction)).to.eq(
        alice.address
      );
      // alice liquid nft token balance should be = her previous balance less the cost of bob nft price
      expect(await liquidNFTToken.balanceOf(alice.address)).to.eq(
        aliceNftValue - bobFractionAmount
      );
    }
  });
});
