//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IFractionVault {
    event RewardTokenMinted(address account, uint256 amount);
    event DepositStakingFractionsToken(address account, uint256 amount);
    event WithdrawStakingFractionsToken(address account, uint256 amount);
    
    
    function deposit(uint256 amount) external;

    function withdraw(uint256 tokenID) external;

    function redeemReward(address account, uint256 _amount) external;

    function updateReward(address account) external;
}
