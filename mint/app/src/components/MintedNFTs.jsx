'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './MintedNFTs.module.css';
import { createPublicClient, http, parseAbiItem, parseEventLogs, encodeFunctionData } from 'viem';
import { base } from 'viem/chains';
import * as frame from '@farcaster/frame-sdk';

const CONTRACT_ADDRESS = '0x4a02d17aff1590b270bb631427d49cced8775033';
const MINT_PRICE = '0.001';

// ABI for the events we need
const contractABI = [
  parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
  parseAbiItem('function tokenURI(uint256 tokenId) view returns (string)'),
  parseAbiItem('function mint() payable')
];

export function MintedNFTs() {
  const [isMinting, setIsMinting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [mintedNFT, setMintedNFT] = useState(null);
  const [error, setError] = useState(null);

  const handleMint = async () => {
    setIsMinting(true);
    setError(null);

    try {
      const client = createPublicClient({
        chain: base,
        transport: http(),
      });

      // Request wallet connection
      const accounts = await frame.sdk.wallet.ethProvider.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || !accounts[0]) {
        throw new Error('No wallet connected');
      }

      const walletAddress = accounts[0];

      // Check and switch network if needed
      const chainId = await frame.sdk.wallet.ethProvider.request({ method: 'eth_chainId' });
      if (parseInt(chainId, 16) !== 8453) {
        await frame.sdk.wallet.ethProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }]
        });
      }

      // Encode the function data for the mint call
      const data = encodeFunctionData({
        abi: contractABI,
        functionName: 'mint',
        args: []
      });

      // Prepare transaction parameters
      const transactionParams = {
        from: walletAddress,
        to: CONTRACT_ADDRESS,
        value: `0x${BigInt(parseFloat(MINT_PRICE) * 1e18).toString(16)}`,
        data: data,
        gas: '0x5208', // 21000 in hex, adjust as needed
      };

      // Send transaction
      const hash = await frame.sdk.wallet.ethProvider.request({
        method: 'eth_sendTransaction',
        params: [transactionParams],
      });

      // Wait for transaction receipt
      const receipt = await client.waitForTransactionReceipt({ 
        hash: hash,
        timeout: 60_000 // 60 second timeout
      });

      // Parse Transfer events from the receipt
      let tokenId = null;
      
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
          try {
            const parsedLogs = parseEventLogs({
              abi: contractABI,
              logs: [log],
            });
            
            if (parsedLogs.length > 0) {
              const transferEvent = parsedLogs[0];
              // Check if this is a mint (transfer from zero address)
              if (transferEvent.eventName === 'Transfer' && 
                  transferEvent.args.from === '0x0000000000000000000000000000000000000000' &&
                  transferEvent.args.to.toLowerCase() === walletAddress.toLowerCase()) {
                tokenId = transferEvent.args.tokenId;
                break;
              }
            }
          } catch (parseError) {
            // Skip logs that don't match our ABI
            continue;
          }
        }
      }

      if (tokenId) {
        try {
          // Get token metadata
          const metadataUri = await client.readContract({
            address: CONTRACT_ADDRESS,
            abi: contractABI,
            functionName: 'tokenURI',
            args: [tokenId],
          });

          // Fetch metadata from IPFS
          const ipfsUrl = metadataUri.replace('ipfs://', 'https://ipfs.io/ipfs/');
          const metadataResponse = await fetch(ipfsUrl);
          
          if (!metadataResponse.ok) {
            throw new Error('Failed to fetch metadata');
          }
          
          const metadata = await metadataResponse.json();

          setMintedNFT({
            tokenId: tokenId.toString(),
            imageUrl: metadata.image ? metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/') : null,
            name: metadata.name || `NFT #${tokenId}`,
          });

          setShowSuccessModal(true);
        } catch (metadataError) {
          console.warn('Could not fetch metadata:', metadataError);
          // Still show success modal even if metadata fails
          setMintedNFT({
            tokenId: tokenId.toString(),
            imageUrl: null,
            name: `NFT #${tokenId}`,
          });
          setShowSuccessModal(true);
        }
      } else {
        throw new Error('Could not find minted token ID in transaction receipt');
      }

    } catch (err) {
      console.error('Error minting NFT:', err);
      setError(err.message || 'An error occurred while minting');
    } finally {
      setIsMinting(false);
    }
  };

  const handleShareOnWarpcast = async () => {
    try {
      await frame.sdk.actions.composeCast({
        text: "I just minted an NFT so I can vote in the Outlast Game",
        embeds: ["https://farcaster.xyz/~/mini-apps/launch?domain=outlast-nft-mint.vercel.app"]
      });
    } catch (err) {
      console.error('Error sharing on Warpcast:', err);
    }
  };

  const handleDismissModal = () => {
    setShowSuccessModal(false);
    setMintedNFT(null);
  };

  return (
    <div className={styles.container}>
      <button 
        className={styles.mintButton} 
        onClick={handleMint}
        disabled={isMinting}
      >
        {isMinting ? 'Minting...' : `Mint - ${MINT_PRICE} ETH`}
      </button>

      {error && (
        <div className={styles.error}>
          Error: {error}
        </div>
      )}

      {showSuccessModal && mintedNFT && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>Mint Successful!</h2>
            <div className={styles.nftPreview}>
              {mintedNFT.imageUrl ? (
                <Image
                  src={mintedNFT.imageUrl}
                  alt={mintedNFT.name}
                  width={300}
                  height={300}
                  className={styles.nftImage}
                  unoptimized={true}
                />
              ) : (
                <div className={styles.placeholderImage}>
                  No Image Available
                </div>
              )}
              <h3>{mintedNFT.name}</h3>
              <p>Token ID: {mintedNFT.tokenId}</p>
            </div>
            <div className={styles.modalButtons}>
              <button 
                className={styles.shareButton}
                onClick={handleShareOnWarpcast}
              >
                Share on Farcaster
              </button>
              <button 
                className={styles.dismissButton}
                onClick={handleDismissModal}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}