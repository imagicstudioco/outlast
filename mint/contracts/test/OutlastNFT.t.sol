// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/OutlastNFT.sol";

contract OutlastNFTTest is Test {
    OutlastNFT nft;
    address owner = address(0x1);
    address payoutWallet = address(0x2);
    address user1 = address(0x3);
    address user2 = address(0x4);
    
    uint256 constant MINT_PRICE = 0.001 ether;
    
    function setUp() public {
        vm.prank(owner);
        nft = new OutlastNFT(
            "Test NFT",
            "TEST",
            payoutWallet,
            "https://test.com/"
        );
    }
    
    function testInitialState() public {
        assertEq(nft.name(), "Test NFT");
        assertEq(nft.symbol(), "TEST");
        assertEq(nft.payoutWallet(), payoutWallet);
        assertEq(nft.totalSupply(), 0);
        assertEq(nft.nextTokenId(), 1);
        assertEq(nft.MINT_PRICE(), MINT_PRICE);
    }
    
    function testSuccessfulMint() public {
        vm.deal(user1, 1 ether);
        
        uint256 initialPayoutBalance = payoutWallet.balance;
        
        vm.prank(user1);
        nft.mint{value: MINT_PRICE}();
        
        // Check NFT was minted
        assertEq(nft.ownerOf(1), user1);
        assertEq(nft.totalSupply(), 1);
        assertEq(nft.nextTokenId(), 2);
        assertEq(nft.hasMinted(user1), true);
        assertEq(nft.hasWalletMinted(user1), true);
        
        // Check payment was sent to payout wallet
        assertEq(payoutWallet.balance, initialPayoutBalance + MINT_PRICE);
    }
    
    function testCannotMintTwice() public {
        vm.deal(user1, 1 ether);
        
        // First mint should succeed
        vm.prank(user1);
        nft.mint{value: MINT_PRICE}();
        
        // Second mint should fail
        vm.prank(user1);
        vm.expectRevert(OutlastNFT.AlreadyMinted.selector);
        nft.mint{value: MINT_PRICE}();
    }
    
    function testIncorrectPayment() public {
        vm.deal(user1, 1 ether);
        
        // Too little payment
        vm.prank(user1);
        vm.expectRevert(OutlastNFT.IncorrectPayment.selector);
        nft.mint{value: MINT_PRICE - 1}();
        
        // Too much payment
        vm.prank(user1);
        vm.expectRevert(OutlastNFT.IncorrectPayment.selector);
        nft.mint{value: MINT_PRICE + 1}();
    }
    
    function testMultipleUsersMint() public {
        vm.deal(user1, 1 ether);
        vm.deal(user2, 1 ether);
        
        // User1 mints
        vm.prank(user1);
        nft.mint{value: MINT_PRICE}();
        
        // User2 mints
        vm.prank(user2);
        nft.mint{value: MINT_PRICE}();
        
        assertEq(nft.ownerOf(1), user1);
        assertEq(nft.ownerOf(2), user2);
        assertEq(nft.totalSupply(), 2);
        assertEq(nft.hasMinted(user1), true);
        assertEq(nft.hasMinted(user2), true);
    }
    
    function testUpdatePayoutWallet() public {
        address newPayoutWallet = address(0x5);
        
        vm.prank(owner);
        nft.updatePayoutWallet(newPayoutWallet);
        
        assertEq(nft.payoutWallet(), newPayoutWallet);
    }
    
    function testUpdatePayoutWalletOnlyOwner() public {
        address newPayoutWallet = address(0x5);
        
        vm.prank(user1);
        vm.expectRevert();
        nft.updatePayoutWallet(newPayoutWallet);
    }
    
    function testSetBaseURI() public {
        string memory newBaseURI = "https://newapi.com/";
        
        vm.prank(owner);
        nft.setBaseURI(newBaseURI);
        
        // Mint a token to test URI
        vm.deal(user1, 1 ether);
        vm.prank(user1);
        nft.mint{value: MINT_PRICE}();
        
        assertEq(nft.tokenURI(1), "https://newapi.com/1");
    }
    
    function testSetBaseURIOnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        nft.setBaseURI("https://hack.com/");
    }
    
    function testEmergencyWithdraw() public {
        // Force some ETH into the contract (simulation of stuck funds)
        vm.deal(address(nft), 1 ether);
        
        uint256 initialOwnerBalance = owner.balance;
        
        vm.prank(owner);
        nft.emergencyWithdraw();
        
        assertEq(owner.balance, initialOwnerBalance + 1 ether);
        assertEq(address(nft).balance, 0);
    }
    
    function testEmergencyWithdrawOnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        nft.emergencyWithdraw();
    }
}