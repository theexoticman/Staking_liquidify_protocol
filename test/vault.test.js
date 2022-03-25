const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");

function scale(value, decimals = 18) {
    return BigNumber.from(value).mul(BigNumber.from(10).pow(decimals));
}


describe("Vault tests", function () {
    let nft;
    let vault;
    let rewardToken;
    let owner;
    let alice;
    let bob;
    beforeEach(async function () {
        const Vault = await ethers.getContractFactory("Vault");
        const SimpleNFT = await ethers.getContractFactory("SimpleNFT");
        const RewardToken = await ethers.getContractFactory("RewardToken");
        [owner, alice, bob] = await ethers.getSigners();
        nft = await SimpleNFT.deploy();
        vault = await Vault.deploy(nft.address, scale(100));
        rewardToken = await RewardToken.deploy("RewardToken", "RT", vault.address);
        const tx = await vault.setRewardToken(rewardToken.address)
        await tx.wait()
    })
    it("Should allow the staking of NFTs with transfer of ownership", async function () {
        const tx1 = await nft.mint(alice.address)
        const tx2 = await nft.mint(bob.address)

        const rcpt1 = await tx1.wait()
        const rcpt2 = await tx2.wait()
        const id1 = rcpt1.events.find(l => l.event === "NFTMinted").args.tokenID
        const id2 = rcpt2.events.find(l => l.event === "NFTMinted").args.tokenID

        await nft.connect(alice).approve(vault.address, id1)
        await nft.connect(bob).approve(vault.address, id2)

        expect(await nft.ownerOf(id1)).to.eq(alice.address)
        expect(await nft.ownerOf(id2)).to.eq(bob.address)

        const stakeTxAlice = await vault.connect(alice).stakeNFT(id1)
        const stakeTxBob = await vault.connect(bob).stakeNFT(id2)

        const rStakeAlice = await stakeTxAlice.wait()
        const rStakeBob = await stakeTxBob.wait()

        const stakeIdAlice = rStakeAlice.events.find(l => l.event === "NFTRegistered").args.tokenID
        const stakeOwnerAlice = rStakeAlice.events.find(l => l.event === "NFTRegistered").args.owner
        const stakeIdBob = rStakeBob.events.find(l => l.event === "NFTRegistered").args.tokenID
        const stakeOwnerBob = rStakeBob.events.find(l => l.event === "NFTRegistered").args.owner

        expect(stakeOwnerAlice).to.eq(alice.address);
        expect(stakeOwnerBob).to.eq(bob.address);
        expect(stakeIdAlice).to.eq(id1);
        expect(stakeIdBob).to.eq(id2);
        expect(await nft.ownerOf(id1)).to.eq(vault.address)
        expect(await nft.ownerOf(id2)).to.eq(vault.address)

        const unstakeTxAlice = await vault.connect(alice).unstakeNFT(id1)
        const unstakeTxBob = await vault.connect(bob).unstakeNFT(id2)

        const rUnstakeAlice = await unstakeTxAlice.wait()
        const rUnstakeBob = await unstakeTxBob.wait()

        const unstakeIdAlice = rUnstakeAlice.events.find(l => l.event === "NFTUnregistered").args.tokenID
        const unstakeOwnerAlice = rUnstakeAlice.events.find(l => l.event === "NFTUnregistered").args.owner
        const unstakeIdBob = rUnstakeBob.events.find(l => l.event === "NFTUnregistered").args.tokenID
        const unstakeOwnerBob = rUnstakeBob.events.find(l => l.event === "NFTUnregistered").args.owner

        expect(await nft.ownerOf(id1)).to.eq(alice.address)
        expect(await nft.ownerOf(id2)).to.eq(bob.address)
        expect(unstakeOwnerAlice).to.eq(alice.address);
        expect(unstakeOwnerBob).to.eq(bob.address);
        expect(unstakeIdAlice).to.eq(id1);
        expect(unstakeIdBob).to.eq(id2);

    });

    it("Should allow vault to mint reward tokens", async function () {
        const tx = await vault.adminMint(alice.address, scale(100))
        const r = await tx.wait()
        const account = r.events.find(l => l.event === "TokensMinted").args.account
        const amount = r.events.find(l => l.event === "TokensMinted").args.amount
        expect(account).to.eq(alice.address)
        expect(amount).to.eq(scale(100))
        expect(await rewardToken.balanceOf(alice.address)).to.eq(scale(100))
    });

    it("Only vault should be able to mint reward tokens", async function () {
        await expect(
            rewardToken.connect(owner).mint(owner.address, scale(100))
        ).to.be.revertedWith("Only minter can mint reward tokens");
    });
});