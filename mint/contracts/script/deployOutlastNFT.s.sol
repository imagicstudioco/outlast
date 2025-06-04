// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/OutlastNFT.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address payoutWallet = vm.envAddress("PAYOUT_WALLET");
        
        vm.startBroadcast(deployerPrivateKey);
        
        OutlastNFT nft = new OutlastNFT(
            "Outlast Governance Token",           // Collection name
            "OUTLAST",                           // Collection symbol
            payoutWallet,                        // Payout wallet address
            "https://api.yourproject.com/metadata/outlast.json" // Single metadata URI
        );
        
        vm.stopBroadcast();
        
        console.log("Outlast NFT deployed to:", address(nft));
        console.log("Payout wallet set to:", payoutWallet);
        console.log("Mint price: 0.001 ETH");
        console.log("All tokens will use metadata from: https://api.yourproject.com/metadata/outlast.json");
        console.log("Token holders can vote in governance applications");
    }
}