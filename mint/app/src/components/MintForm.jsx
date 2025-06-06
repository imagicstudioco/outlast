'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './MintForm.module.css';
import { createPublicClient, http, parseAbiItem, parseEventLogs, encodeFunctionData, parseEther, createWalletClient, custom } from 'viem';
import { base } from 'viem/chains';
import * as frame from '@farcaster/frame-sdk';
import { getDataSuffix, submitReferral } from '@divvi/referral-sdk';

const CONTRACT_ADDRESS = '0x9f4f7b2acff63c12d1ffa98feb16f9fdcc529113';
const MINT_PRICE = '0.001';

// Divvi configuration
const DIVVI_CONFIG = {
  consumer: '0xaF108Dd1aC530F1c4BdED13f43E336A9cec92B44',
  providers: ['0x0423189886d7966f0dd7e7d256898daeee625dca','0xc95876688026be9d6fa7a7c33328bd013effa2bb'],
};

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

  useEffect(() => {
    // Check if frame is initialized
    const checkFrameInitialization = () => {
      if (window.frameInitialized) {
        setIsSDKReady(true);
      } else if (window.frameError) {
        setError(window.frameError);
      }
    };

    // Initial check
    checkFrameInitialization();

    // Set up an interval to check periodically
    const interval = setInterval(checkFrameInitialization, 1000);

    // Cleanup
    return () => clearInterval(interval);
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
      setError('SDK not ready');
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

      // Check if wallet is available
      console.log('Checking wallet availability...');
      if (!frame.sdk.wallet || !frame.sdk.wallet.ethProvider) {
        console.error('Wallet not available');
        throw new Error('Wallet not available');
      }

      // Request wallet connection
      console.log('Requesting wallet connection...');
      const accounts = await frame.sdk.wallet.ethProvider.request({
        method: 'eth_requestAccounts'
      });

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

      // Prepare base transaction data
      const baseTxData = encodeFunctionData({
        abi: contractABI,
        functionName: 'mint',
        args: []
      });

      // DIVVI INTEGRATION: Get referral data suffix
      let finalTxData = baseTxData;
      let divviWalletClient = null;
      
      try {
        console.log('Setting up Divvi referral tracking...');
        
        // Create wallet client for Divvi (using the same provider)
        divviWalletClient = createWalletClient({
          chain: base,
          transport: custom(frame.sdk.wallet.ethProvider),
        });

        // Get referral data suffix
        const dataSuffix = getDataSuffix({
          consumer: DIVVI_CONFIG.consumer,
          providers: DIVVI_CONFIG.providers,
        });

        // Append referral data to transaction data
        finalTxData = baseTxData + dataSuffix;
        console.log('Divvi referral data added to transaction');
      } catch (divviError) {
        console.warn('Divvi referral setup failed, proceeding without referral tracking:', divviError);
        // Continue with original transaction data if Divvi fails
      }

      // Get gas estimate with final transaction data
      console.log('Estimating gas...');
      let gasEstimate;
      try {
        gasEstimate = await client.estimateGas({
          account: walletAddress,
          to: CONTRACT_ADDRESS,
          value: parseEther(MINT_PRICE),
          data: finalTxData
        });
        console.log('Gas estimate:', gasEstimate.toString());
      } catch (gasError) {
        console.warn('Gas estimation failed, using default:', gasError);
        gasEstimate = BigInt(100000); // Default gas limit
      }

      // Prepare transaction with Divvi data
      console.log('Preparing transaction...');
      const txParams = {
        from: walletAddress,
        to: CONTRACT_ADDRESS,
        value: `0x${parseEther(MINT_PRICE).toString(16)}`,
        data: finalTxData,
        gas: `0x${gasEstimate.toString(16)}`
      };

      console.log('Sending transaction...');
      const txHash = await frame.sdk.wallet.ethProvider.request({
        method: 'eth_sendTransaction',
        params: [txParams]
      });

      console.log('Transaction sent:', txHash);

      // DIVVI INTEGRATION: Submit referral after transaction is sent
      if (divviWalletClient) {
        try {
          console.log('Submitting referral to Divvi...');
          const chainId = await divviWalletClient.getChainId();
          await submitReferral({
            txHash,
            chainId,
          });
          console.log('Referral submitted to Divvi successfully');
        } catch (divviSubmissionError) {
          console.warn('Failed to submit referral to Divvi:', divviSubmissionError);
          // Don't fail the entire transaction if Divvi submission fails
        }
      }

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
            continue;
          }
        }
      }

      if (!tokenId) {
        // Fallback: try to get the latest token from the contract
        console.warn('Could not find token ID in logs, showing success anyway');
        setMintedNFT({
          tokenId: 'Unknown',
          imageUrl: null,
          name: 'NFT Minted Successfully',
        });
        setShowSuccessModal(true);
        return;
      }

      console.log('Found minted token ID:', tokenId.toString());

      // Try to fetch metadata
      try {
        const metadataUri = await client.readContract({
          address: CONTRACT_ADDRESS,
          abi: contractABI,
          functionName: 'tokenURI',
          args: [tokenId],
        });

        console.log('Metadata URI:', metadataUri);

        if (metadataUri) {
          const ipfsUrl = metadataUri.replace('ipfs://', 'https://ipfs.io/ipfs/');
          const metadataResponse = await fetch(ipfsUrl);
          
          if (metadataResponse.ok) {
            const metadata = await metadataResponse.json();
            
            setMintedNFT({
              tokenId: tokenId.toString(),
              imageUrl: metadata.image ? metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/') : null,
              name: metadata.name || `NFT #${tokenId}`,
            });
          } else {
            throw new Error('Failed to fetch metadata');
          }
        } else {
          throw new Error('No metadata URI returned');
        }
      } catch (metadataError) {
        console.warn('Could not fetch metadata:', metadataError);
        setMintedNFT({
          tokenId: tokenId.toString(),
          imageUrl: null,
          name: `NFT #${tokenId}`,
        });
      }

      setShowSuccessModal(true);

    } catch (err) {
      console.error('Error minting NFT:', err);
      
      let errorMessage = 'An error occurred while minting';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err.code === 4001) {
        errorMessage = 'Transaction was rejected by user';
      } else if (err.code === -32603) {
        errorMessage = 'Transaction failed - insufficient funds or contract error';
      }
      
      setError(errorMessage);
    } finally {
      setIsMinting(false);
    }
  };

  if (!isSDKReady) {
    return (
      <div className={styles.mintForm}>
        <div>Initializing...</div>
      </div>
    );
  }

  return (
    <div className={styles.mintForm}>
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
              {mintedNFT.tokenId !== 'Unknown' && (
                <p>Token ID: {mintedNFT.tokenId}</p>
              )}
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