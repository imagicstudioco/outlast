// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract OutlastNFT is ERC721, Ownable, ReentrancyGuard {
    uint256 public constant MINT_PRICE = 0.001 ether;
    uint256 private _currentTokenId = 1;
    
    // Wallet to receive mint payments
    address public payoutWallet;
    
    // Single metadata URI for all tokens
    string private _tokenURI;
    
    // Events
    event Minted(address indexed to, uint256 indexed tokenId);
    event PayoutWalletUpdated(address indexed oldWallet, address indexed newWallet);
    event TokenURIUpdated(string newTokenURI);
    
    // Custom errors
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
     * @notice Mint one NFT for 0.001 ETH
     */
    function mint() external payable nonReentrant {
        if (msg.value != MINT_PRICE) revert IncorrectPayment();
        
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
     * @notice Get the next token ID that will be minted
     */
    function nextTokenId() external view returns (uint256) {
        return _currentTokenId;
    }

    /**
     * @notice Check if a token exists
     */
    function _exists(uint256 tokenId) internal view virtual returns (bool) {
        return _ownerOf(tokenId) != address(0);
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
}