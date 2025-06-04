// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SimpleMintNFT is ERC721, Ownable, ReentrancyGuard {
    uint256 public constant MINT_PRICE = 0.001 ether;
    uint256 private _currentTokenId = 1;
    
    // Track which wallets have minted
    mapping(address => bool) public hasMinted;
    
    // Wallet to receive mint payments
    address public payoutWallet;
    
    // Single metadata URI for all tokens
    string private _tokenURI;
    
    // Events
    event Minted(address indexed to, uint256 indexed tokenId);
    event PayoutWalletUpdated(address indexed oldWallet, address indexed newWallet);
    event TokenURIUpdated(string newTokenURI);
    
    // Custom errors
    error AlreadyMinted();
    error IncorrectPayment();
    error TransferFailed();
    error InvalidAddress();
    
    constructor(
        string memory name,
        string memory symbol,
        address _payoutWallet,
        string memory _singleTokenURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        if (_payoutWallet == address(0)) revert InvalidAddress();
        
        payoutWallet = _payoutWallet;
        _tokenURI = _singleTokenURI;
    }
    
    /**
     * @notice Mint one NFT per wallet for 0.001 ETH
     */
    function mint() external payable nonReentrant {
        if (hasMinted[msg.sender]) revert AlreadyMinted();
        if (msg.value != MINT_PRICE) revert IncorrectPayment();
        
        // Mark wallet as having minted
        hasMinted[msg.sender] = true;
        
        // Mint NFT
        uint256 tokenId = _currentTokenId;
        _currentTokenId++;
        
        _safeMint(msg.sender, tokenId);
        
        // Transfer payment to payout wallet
        (bool success, ) = payoutWallet.call{value: msg.value}("");
        if (!success) revert TransferFailed();
        
        emit Minted(msg.sender, tokenId);
    }
    
    /**
     * @notice Get the total number of tokens minted
     */
    function totalSupply() external view returns (uint256) {
        return _currentTokenId - 1;
    }
    
    /**
     * @notice Check if a wallet has already minted
     */
    function hasWalletMinted(address wallet) external view returns (bool) {
        return hasMinted[wallet];
    }
    
    /**
     * @notice Get the next token ID that will be minted
     */
    function nextTokenId() external view returns (uint256) {
        return _currentTokenId;
    }
    
    /**
     * @notice All tokens return the same metadata URI
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        if (!_exists(tokenId)) revert ERC721NonexistentToken(tokenId);
        return _tokenURI;
    }
    
    // ============ OWNER FUNCTIONS ============
    
    /**
     * @notice Update the payout wallet (only owner)
     */
    function updatePayoutWallet(address _newPayoutWallet) external onlyOwner {
        if (_newPayoutWallet == address(0)) revert InvalidAddress();
        
        address oldWallet = payoutWallet;
        payoutWallet = _newPayoutWallet;
        
        emit PayoutWalletUpdated(oldWallet, _newPayoutWallet);
    }
    
    /**
     * @notice Update the token URI for all tokens (only owner)
     */
    function setTokenURI(string calldata _newTokenURI) external onlyOwner {
        _tokenURI = _newTokenURI;
        emit TokenURIUpdated(_newTokenURI);
    }
    
    /**
     * @notice Emergency withdraw function (only owner)
     * @dev Only use if funds get stuck in contract
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool success, ) = owner().call{value: balance}("");
            if (!success) revert TransferFailed();
        }
    }
    
    // ============ GOVERNANCE FUNCTIONS ============
    
    /**
     * @notice Check if an address holds at least one governance token
     * @param voter The address to check
     * @return bool True if the address holds at least one token
     */
    function canVote(address voter) external view returns (bool) {
        return balanceOf(voter) > 0;
    }
    
    /**
     * @notice Get the voting power of an address (number of tokens held)
     * @param voter The address to check
     * @return uint256 Number of tokens held (voting power)
     */
    function getVotingPower(address voter) external view returns (uint256) {
        return balanceOf(voter);
    }
    
    /**
     * @notice Get all token holders (for governance purposes)
     * @dev This is gas-intensive for large collections, use carefully
     * @return address[] Array of all token holders
     */
    function getAllHolders() external view returns (address[] memory) {
        uint256 totalTokens = totalSupply();
        address[] memory holders = new address[](totalTokens);
        
        for (uint256 i = 1; i <= totalTokens; i++) {
            holders[i - 1] = ownerOf(i);
        }
        
        return holders;
    }
}