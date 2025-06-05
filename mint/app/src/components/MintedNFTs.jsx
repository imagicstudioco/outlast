'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './MintedNFTs.module.css';
import { createPublicClient, http, parseAbiItem, parseEventLogs } from 'viem';
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

      // Prepare mint transaction
      const { request } = await client.simulateContract({
        address: CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: 'mint',
        value: BigInt(parseFloat(MINT_PRICE) * 1e18),
        account: walletAddress,
      });

      // Send transaction
      const hash = await frame.sdk.wallet.ethProvider.request({
        method: 'eth_sendTransaction',
        params: [request],
      });

      // Wait for transaction
      const receipt = await client.waitForTransactionReceipt({ hash });

      // Get minted token ID from Transfer event
      const transferEvent = receipt.logs
        .filter(log => log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase())
        .map(log => {
          const parsedLog = parseEventLogs({
            abi: contractABI,
            logs: [log],
          })[0];
          return parsedLog.args;
        })
        .find(args => args.from === '0x0000000000000000000000000000000000000000');

      if (transferEvent) {
        const tokenId = transferEvent.tokenId;
        const metadataUri = await client.readContract({
          address: CONTRACT_ADDRESS,
          abi: contractABI,
          functionName: 'tokenURI',
          args: [tokenId],
        });

        // Fetch metadata
        const metadataResponse = await fetch(metadataUri.replace('ipfs://', 'https://ipfs.io/ipfs/'));
        const metadata = await metadataResponse.json();

        setMintedNFT({
          tokenId: tokenId.toString(),
          imageUrl: metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/'),
          name: metadata.name || `NFT #${tokenId}`,
        });

        setShowSuccessModal(true);
      }
    } catch (err) {
      console.error('Error minting NFT:', err);
      setError(err.message);
    } finally {
      setIsMinting(false);
    }
  };

  const handleShareOnWarpcast = () => {
    const targetText = `Just minted Outlast NFT #${mintedNFT.tokenId}!`;
    const targetURL = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const finalUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(targetText)}&embeds[]=${encodeURIComponent(targetURL)}`;
    
    try {
      frame.sdk.actions.openUrl(finalUrl);
    } catch (error) {
      console.error('Failed to open URL:', error);
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
              <Image
                src={mintedNFT.imageUrl}
                alt={mintedNFT.name}
                width={300}
                height={300}
                className={styles.nftImage}
                unoptimized={true}
              />
              <h3>{mintedNFT.name}</h3>
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