// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/OutlastGame.sol";

contract DeployOutlastGame is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Replace with the actual eligibility NFT contract address
        address eligibilityNFTAddress = vm.envAddress("ELIGIBILITY_NFT_ADDRESS");
        OutlastGame game = new OutlastGame(eligibilityNFTAddress);

        vm.stopBroadcast();
        console.log("OutlastGame deployed at:", address(game));
    }
} 