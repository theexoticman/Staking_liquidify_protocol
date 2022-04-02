const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");

function scale(value, decimals = 18) {
  return BigNumber.from(value).mul(BigNumber.from(10).pow(decimals));
}

describe("Reward Token tests", function () {
  let RewardToken;
  beforeEach(async function () {
    RewardToken = await ethers.getContractFactory("RewardToken");
  });

  it("Prevent RewardToken Minter to be zero account", async function () {
    await expect(
      RewardToken.deploy(
        "RewardToken",
        "RT",
        "0x0000000000000000000000000000000000000000"
      )
    ).to.be.revertedWith("mint zero address");
  });
});
