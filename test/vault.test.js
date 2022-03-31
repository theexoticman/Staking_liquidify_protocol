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

describe.skip("Vault tests", function () {
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
      .tokenID;
    tokenId2 = transaction2.events.find((l) => l.event === "NFTMinted").args
      .tokenID;

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

    sleep(5000);
    await vault.connect(alice).updateReward(tokenId1);
    await vault.connect(bob).updateReward(tokenId2);

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

    sleep(5000);
    await vault.connect(alice).updateReward(tokenId1);
    await vault.connect(bob).updateReward(tokenId2);

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

  it("Should set isStacked to false when unstaking NFT, value and stakeTime to 0, keeping owner and reward", async function () {
    /* console.log([owner.address, alice.address ,bob.address] ); */
    //update before unstaking
    sleep(5000);
    await vault.connect(alice).updateReward(tokenId1);

    let transaction1 = await vault.connect(alice).unstakeNFT(tokenId1);

    // Retrieve NFTs metadata
    let metadata1 = await vault.connect(owner).registeredTokens(tokenId1);

    expect(metadata1.value).to.eq(0);
    expect(metadata1.reward).to.above(0);
    expect(metadata1.stakeTime).to.eq(0);
  });

  it("User Reward could be reedemable after unstaking", async function () {
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
    await vault.connect(alice).updateReward(tokenId1);

    let metadata1 = await vault.connect(owner).registeredTokens(id1);

    await vault.connect(alice).unstakeNFT(id1);

    const reward = await vault.getRewards(alice.address);

    expect(reward).to.be.above(0);
  });
  it("NFT Reward should not increase after unstaking", async function () {
    //Update reward;
    sleep(5000);
    await vault.connect(alice).updateReward(tokenId1);

    let metadata1 = await vault.connect(owner).registeredTokens(tokenId1);

    await vault.connect(alice).unstakeNFT(tokenId1);

    const reward = await vault.getRewards(alice.address);

    //Update reward;
    sleep(5000);
    await vault.connect(alice).updateReward(tokenId1);

    const rewardAfterUnstaking = await vault.getRewards(alice.address);

    expect(reward).to.eq(rewardAfterUnstaking);
  });
});



describe.skip("Reward Tests", function () {
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
      .tokenID;
    tokenId2 = transaction2.events.find((l) => l.event === "NFTMinted").args
      .tokenID;

    //Approve vault to transfer their NFT on their behalf.
    await (await nft.connect(alice).approve(vault.address, tokenId1)).wait();
    await (await nft.connect(bob).approve(vault.address, tokenId2)).wait();

    await (await vault.connect(alice).stakeNFT(tokenId1)).wait();
    await (await vault.connect(bob).stakeNFT(tokenId2)).wait();
  });

  it("Staking Fraction Tokens should not be accessible before staking", async function () {
    const claim = await vault.connect(alice).claimRewards(tokenId1);
    const claimRes = claim.wait();

    expect(claimRes).to.be.revertedWith(
      "Only owner can claim StakingRewardTokens"
    );
  });

  it("Staking Fraction Tokens should not be accessible by other owner", async function () {
    await expect(
      vault.connect(alice).claimRewards(tokenId2)
    ).to.be.revertedWith("Only owner can claim StakingRewardTokens");

    claimBob = await expect(
      vault.connect(bob).claimRewards(tokenId1)
    ).to.be.revertedWith("Only owner can claim StakingRewardTokens");
  });
  it("Staking Fraction Tokens should be accessible after staking", async function () {
    const aliceFraction = await (
      await vault.connect(alice).claimRewards(tokenId1)
    ).wait();
    const bobFraction = await (
      await vault.connect(bob).claimRewards(tokenId2)
    ).wait();

    let owner = aliceFraction.events.find((l) => l.event === "TokensMinted").args.account
    let amount = aliceFraction.events.find((l) => l.event === "TokensMinted").args.amount
    
    expect(owner).to.eq(alice.address);
    expect(amount).to.be.above(0);
    /* console.log(owner)
    console.log(amount)
    console.log([owner.address , alice.address, bob.address] )
    console.log(vault.address ) */

    
    const balanceAlice = await rewardToken.balanceOf(alice.address);
    const balanceBob = await rewardToken.balanceOf(bob.address);
    /* console.log(balanceAlice)
    console.log(balanceBob) */
    expect(balanceAlice).to.be.above(0);
    expect(balanceBob).to.be.above(0);
    
   
  });

  
});

describe("Fractions of NFT", function(){
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
      .tokenID;
    tokenId2 = transaction2.events.find((l) => l.event === "NFTMinted").args
      .tokenID;

    //Approve vault to transfer their NFT on their behalf.
    await (await nft.connect(alice).approve(vault.address, tokenId1)).wait();
    await (await nft.connect(bob).approve(vault.address, tokenId2)).wait();

    await (await vault.connect(alice).stakeNFT(tokenId1)).wait();
    await (await vault.connect(bob).stakeNFT(tokenId2)).wait();
  });



  it("One should be able to redeem their ERC20 tokens for their NFT.", async function () {
    const aliceNftValue = await vault.registeredTokens(tokenId1)
    const res = await (await vault.connect(alice).reedemFractionTokens(tokenId1)).wait();

    const args = res.events.find((l) => l.event === "StakingFractionTokenClaimed").args
    
    

    expect(args.account).to.eq(alice.address);
    expect(args.amount).to.eq(aliceNftValue.value);  
    
    const aliceStakingFactionTokenBalance = await stakingFractionToken.balanceOf(alice.address);
    expect(args.amount).to.eq(aliceStakingFactionTokenBalance);  
    
    
    //lock it
    //test NFT ownership and aprovals.
   });
   it("Stack NFT in the Fractionalization Vault and obtain the ERC20 tokens of same value", async function () {
     //deposit NFT
     //redeem ERC20 Tokens
     // compare the values of the NFT fixed random value and the ERC20 token
    
   });
 
   it("Stack NFT in the Fractionalization Vault, obtain the ERC20 tokens and redeem the NFT ", async function () {
     //deposit NFT
     //redeem ERC20 Tokens
     // redeem NFT
   });
   it("Stack NFT in the Fractionalization Vault, ensure no reward ", async function () {
   // stake the NFT
   // ask for reward
   });
   it("Stack NFT in the Fractionalization Vault, stack the ERC20 ", async function () {
     // stack NFT
     // redeedm ERC20
     //  Stack ERC20
   });
})