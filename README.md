# Smart Contract Programming Test OGG

This programming test will require you to add and extend several smart contracts to accomodate additional functionality.
Also try to think about the security implications of the implementation and whether there are any potential attacks. 
## Overview
There are 3 contracts given in this repository. The `SimpleNFT` is an NFT contract that slightly extends the ERC721 standard. For the purpose of this exercise, this will represent an NFT that can be staked in the `Vault` contract. This `Vault` contract allows users to stake (transfer ownership to the `Vault`) their NFTs for which they receive reward tokens. The reward token users receive is a simple ERC20 token implemented in `RewardToken`. All the corresponding interfaces can be found in the **interfaces** directory.


This exercise consists of two stages outlined below. You can make whatever modifications you deem necessary to any of the contracts. However, the `SimpleNFT` contract and the `RewardToken` contract should still implement the ERC721 and the ERC20 standard, respectively. For testing, we use **hardhat** and you should write tests for all the functionality you add. You don't have to write deployment scripts etc.

## 1 - Reward token distribution
For staking their NFTs, users should receive rewards paid out in `RewardToken`. For this purpose, you should implement logic for accrueing a users balance over time and a way for them to claim their balance. The reward balance should be claimable on a per-user basis, i.e., not a per-NFT basis. Rewards should accumulate according to the following formula:
$$
R_u = (randomValue / 100) * (\Delta t_{staked})
$$
, where $R_u$ is the users claimable balance in reward tokens and $\Delta t_{staked}$ is the time that went by since staking the NFT. $randomValue$ should be a number between 1-50. Reward token accrual should stop when the NFT is unstaked, but the accrued balance should remain claimable. 

## 2 - Converting NFTs to ERC20 tokens
As a second step, you should implement an ERC20 token, into which users can convert their NFTs by staking them. This conversion should be optional, i.e., staking NFTs without conversion should still be possible. The logic should be as follows: A user stakes an NFT in the `Vault` and is given the option to receive an amount of ERC20 tokens proportional to the `value` (see `Vault` contract) of the NFT. The `value` is computed as $value = randomValue / 100$. $randomValue$ should be the same value as before, i.e., each NFT has a single value associated with it. The `Vault` should then mint a number of ERC20 tokens, equal to the `value` of the staked NFT. Users should also be allowed to redeem NFTs by specifying the `tokenID` of any staked NFT and burning a number of tokens equal to the `value` of that NFT.

There are, however, several caveats to the ERC20 token received in return for staking an NFT. Firstly, the ERC20 tokens should only be available for transfer and general use to the user 5 days after staking and converting an NFT. This requires you to implement some logic to delay the minting / transfer of tokens to the user by that amount of time. Bear in mind that a user may stake several NFTs at different points in time.

Users should not receive any reward tokens for staked NFTs for which they have chosen to receive ERC20 tokens. However, users should be able to stake these ERC20 tokens and should then receive reward tokens according to the formula:
$$
R_u = tokensStaked  * (\Delta t_{staked})
$$

## Resources
You may find the following resources helpful:
- https://hardhat.org/getting-started/
- https://github.com/OpenZeppelin/openzeppelin-contracts/tree/master/contracts/token