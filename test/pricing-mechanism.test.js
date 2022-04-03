const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");
const hre = require("hardhat");

function scale(value, decimals = 18) {
  return BigNumber.from(value).mul(BigNumber.from(10).pow(decimals));
}

describe("Princing Mechanism Tests setup", function () {
  const FIVE_DAYS = 432000;
  // contracts
  let nft;
  let pricingMechanism;

  // wallets
  let owner;
  let alice;

  // nfts
  let aliceNFTTokenStakedForReward;

  /**
   * The following test is used as a beforeEach in the next application testing scenario
   */
  it("Beforeach setup for 'Pricing Mechanism Test'", async function () {
    /**
     * Setup and deploy smart contracts
     * mint NFt for alice and bob
     * calculate NFT value
     * Stake NFT in the reward vault
     */
    const SimpleNFT = await ethers.getContractFactory("SimpleNFT");
    [owner, alice] = await ethers.getSigners();

    //setting up contracts
    nft = await SimpleNFT.deploy();

    const PricingMechanism = await ethers.getContractFactory(
      "NFTPricingMechanism"
    );
    pricingMechanism = await PricingMechanism.deploy();

    // minting NFTs
    const transaction1 = await (await nft.mint(alice.address)).wait();

    aliceNFTTokenStakedForReward = transaction1.events.find(
      (l) => l.event === "NFTMinted"
    ).args.tokenId;
  });
});

describe("Pricing Mechanism Test", function () {
  let nft;
  let vault;
  let rewardToken;
  let liquidNFTToken;
  let pricingMechanism;
  let owner;
  let alice;
  let bob;

  let aliceNFTTokenStakedForReward;
  let bobNFTTokenStakedForReward;
  beforeEach(async function () {
    const SimpleNFT = await ethers.getContractFactory("SimpleNFT");
    [owner, alice] = await ethers.getSigners();

    //setting up contracts
    nft = await SimpleNFT.deploy();

    const PricingMechanism = await ethers.getContractFactory(
      "NFTPricingMechanism"
    );
    pricingMechanism = await PricingMechanism.deploy();

    // minting NFTs
    const transaction1 = await (await nft.mint(alice.address)).wait();

    aliceNFTTokenStakedForReward = transaction1.events.find(
      (l) => l.event === "NFTMinted"
    ).args.tokenId;
  });

  it("NFT random Value should be in [1,50]", async function () {
    let value;
    for (let i = 0; i < 1000; i++) {
      value = await pricingMechanism.unsafeNFTRandomValue(i);
      expect(value).to.be.below(51);
      expect(value).to.be.above(0);
    }
  });
  it("Test NFT Calculation set the NFT value in the mapping ", async function () {
    // set NFT price in NFTPricingMechanism
    await (
      await pricingMechanism.calculateNFTValue(aliceNFTTokenStakedForReward)
    ).wait();

    expect(
      await pricingMechanism.getNFTValue(aliceNFTTokenStakedForReward)
    ).to.be.above(0);
  });
  it("Getting an NFT value without first calculating should revert", async function () {
    await expect(
      pricingMechanism.getNFTValue(aliceNFTTokenStakedForReward)
    ).to.be.revertedWith("NFT not yet tracked.");
  });
});
