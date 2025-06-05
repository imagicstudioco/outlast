'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './MintForm.module.css';
import { createPublicClient, http, parseAbiItem, parseEventLogs, encodeFunctionData, parseEther } from 'viem';
import { base } from 'viem/chains';
import * as frame from '@farcaster/frame-sdk';

const CONTRACT_ADDRESS = '0x9F4F7b2AcFF63C12D1FFa98feB16f9Fdcc529113';
const MINT_PRICE = '0.001';

// ABI for the events we need
const contractABI = [
  parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
  parseAbiItem('function tokenURI(uint256 tokenId) view returns (string)'),
  parseAbiItem('function mint() payable')
];

export function MintForm() {
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState(null);
  const [isSDKReady, setIsSDKReady] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [mintedNFT, setMintedNFT] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Initialize Frame SDK
    const initializeFrame = async () => {
      try {
        console.log('Starting Frame SDK initialization...');
        setIsInitializing(true);
        
        // Check if we're in a Frame environment
        if (typeof window === 'undefined') {
          throw new Error('Window is not defined');
        }

        // Wait for Frame to be ready
        let attempts = 0;
        const maxAttempts = 10;
        
        while (!window.frameInitialized && attempts < maxAttempts) {
          console.log(`Waiting for Frame initialization... Attempt ${attempts + 1}/${maxAttempts}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }

        if (!window.frameInitialized) {
          throw new Error('Frame initialization timeout');
        }

        console.log('Frame environment detected, initializing SDK...');
        
        // Initialize the SDK
        if (!frame.sdk) {
          throw new Error('Frame SDK not found');
        }

        await frame.sdk.initialize();
        console.log('Frame SDK initialized successfully');
        setIsSDKReady(true);
        setError(null);
      } catch (initError) {
        console.error('Error during Frame SDK initialization:', initError);
        let errorMessage = 'Failed to initialize Frame SDK';
        
        if (initError.message.includes('timeout')) {
          errorMessage = 'Please open this page in Frame';
        } else if (initError.message.includes('not found')) {
          errorMessage = 'Frame SDK not found. Please make sure you are using the latest version of Frame';
        }
        
        setError(errorMessage);
        setIsSDKReady(false);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeFrame();

    // Cleanup
    return () => {
      setIsSDKReady(false);
      setIsInitializing(false);
    };
  }, []);

  const handleShareOnWarpcast = async () => {
    try {
      if (frame.sdk.actions && frame.sdk.actions.composeCast) {
        await frame.sdk.actions.composeCast({
          text: "I just minted an NFT so I can vote in the Outlast Game",
          embeds: ["https://farcaster.xyz/~/mini-apps/launch?domain=outlast-nft-mint.vercel.app"]
        });
      } else {
        console.error('composeCast not available');
        setError('Share feature not available');
      }
    } catch (err) {
      console.error('Error sharing on Warpcast:', err);
      setError('Failed to share on Warpcast');
    }
  };

  const handleDismissModal = () => {
    setShowSuccessModal(false);
    setMintedNFT(null);
    setError(null);
  };

  const handleMint = async () => {
    console.log('Mint button clicked');
    if (!isSDKReady) {
      console.log('SDK not ready');
      setError('Please open this page in Frame to mint');
      return;
    }

    setIsMinting(true);
    setError(null);

    try {
      console.log('Creating public client...');
      const client = createPublicClient({
        chain: base,
        transport: http(),
      });

      // Check if frame SDK and wallet are available
      console.log('Checking Frame SDK and wallet availability...');
      if (!frame.sdk) {
        throw new Error('Frame SDK not initialized');
      }

      if (!frame.sdk.wallet) {
        throw new Error('Frame wallet not available');
      }

      if (!frame.sdk.wallet.ethProvider) {
        throw new Error('Frame wallet provider not available');
      }

      // Request wallet connection
      console.log('Requesting wallet connection...');
      let accounts;
      try {
        accounts = await frame.sdk.wallet.ethProvider.request({
          method: 'eth_requestAccounts'
        });
      } catch (requestError) {
        console.error('Error requesting accounts:', requestError);
        throw new Error('Failed to connect wallet');
      }

      console.log('Wallet accounts:', accounts);

      if (!accounts || accounts.length === 0) {
        throw new Error('No wallet connected');
      }

      const walletAddress = accounts[0];

      // Check current network
      console.log('Checking network...');
      const chainId = await frame.sdk.wallet.ethProvider.request({ 
        method: 'eth_chainId' 
      });
      
      const currentChainId = parseInt(chainId, 16);
      console.log('Current chain ID:', currentChainId);
      
      // Switch to Base network if needed (Base mainnet: 8453)
      if (currentChainId !== 8453) {
        console.log('Switching to Base network...');
        try {
          await frame.sdk.wallet.ethProvider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x2105' }] // Base mainnet
          });
        } catch (switchError) {
          console.log('Network switch error:', switchError);
          // If the network doesn't exist, add it
          if (switchError.code === 4902) {
            console.log('Adding Base network...');
            await frame.sdk.wallet.ethProvider.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x2105',
                chainName: 'Base',
                nativeCurrency: {
                  name: 'Ethereum',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: ['https://mainnet.base.org'],
                blockExplorerUrls: ['https://basescan.org']
              }]
            });
          } else {
            throw switchError;
          }
        }
      }

      // Get gas estimate
      console.log('Estimating gas...');
      let gasEstimate;
      try {
        gasEstimate = await client.estimateGas({
          account: walletAddress,
          to: CONTRACT_ADDRESS,
          value: parseEther(MINT_PRICE),
          data: encodeFunctionData({
            abi: contractABI,
            functionName: 'mint',
            args: []
          })
        });
        console.log('Gas estimate:', gasEstimate.toString());
      } catch (gasError) {
        console.warn('Gas estimation failed, using default:', gasError);
        gasEstimate = BigInt(100000); // Default gas limit
      }

      // Prepare transaction
      console.log('Preparing transaction...');
      const txParams = {
        from: walletAddress,
        to: CONTRACT_ADDRESS,
        value: `0x${parseEther(MINT_PRICE).toString(16)}`,
        data: encodeFunctionData({
          abi: contractABI,
          functionName: 'mint',
          args: []
        }),
        gas: `0x${gasEstimate.toString(16)}`
      };

      console.log('Sending transaction...');
      const txHash = await frame.sdk.wallet.ethProvider.request({
        method: 'eth_sendTransaction',
        params: [txParams]
      });

      console.log('Transaction sent:', txHash);

      // Wait for transaction receipt
      console.log('Waiting for transaction receipt...');
      const receipt = await client.waitForTransactionReceipt({ 
        hash: txHash,
        timeout: 120_000 // 2 minute timeout
      });

      console.log('Transaction successful:', receipt);

      // Find the minted token ID from Transfer events
      let tokenId = null;
      
      if (receipt.logs && receipt.logs.length > 0) {
        for (const log of receipt.logs) {
          try {
            // Only process logs from our contract
            if (log.address && log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
              const parsedLogs = parseEventLogs({
                abi: contractABI,
                logs: [log],
              });
              
              for (const parsedLog of parsedLogs) {
                if (parsedLog.eventName === 'Transfer') {
                  const { from, to, tokenId: logTokenId } = parsedLog.args;
                  // Check if this is a mint (from zero address to our wallet)
                  if (from === '0x0000000000000000000000000000000000000000' && 
                      to && to.toLowerCase() === walletAddress.toLowerCase()) {
                    tokenId = logTokenId;
                    break;
                  }
                }
              }
              
              if (tokenId) break;
            }
          } catch (parseError) {
            console.warn('Error parsing log:', parseError);
          }
        }
      }

      // Show success modal
      setMintedNFT({
        tokenId: tokenId ? tokenId.toString() : 'Unknown',
        txHash: txHash
      });
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Error during mint:', err);
      setError(err.message || 'Failed to mint NFT');
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className={styles.container}>
      {isInitializing ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingText}>Initializing...</div>
        </div>
      ) : error ? (
        <div className={styles.errorContainer}>
          <div className={styles.errorText}>{error}</div>
        </div>
      ) : (
        <>
          <div className={styles.formContainer}>
            <div className={styles.imageContainer}>
              <Image
                src="/nft-preview.png"
                alt="NFT Preview"
                width={300}
                height={300}
                className={styles.nftImage}
              />
            </div>
            <div className={styles.mintInfo}>
              <h2>Mint Your NFT</h2>
              <p>Price: {MINT_PRICE} ETH</p>
              <button
                className={styles.mintButton}
                onClick={handleMint}
                disabled={isMinting || !isSDKReady}
              >
                {isMinting ? 'Minting...' : 'Mint NFT'}
              </button>
            </div>
          </div>
          {showSuccessModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modalContent}>
                <h3>Successfully Minted!</h3>
                {mintedNFT && (
                  <div className={styles.mintedNFTInfo}>
                    <p>Token ID: {mintedNFT.tokenId}</p>
                    <p>View on Explorer: <a href={`https://basescan.org/token/${CONTRACT_ADDRESS}?a=${mintedNFT.tokenId}`} target="_blank" rel="noopener noreferrer">View NFT</a></p>
                  </div>
                )}
                <button onClick={handleShareOnWarpcast} className={styles.shareButton}>
                  Share on Warpcast
                </button>
                <button onClick={handleDismissModal} className={styles.dismissButton}>
                  Close
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 