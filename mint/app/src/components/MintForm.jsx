'use client';

import { useState, useEffect } from 'react';
import styles from './MintForm.module.css';
import { createPublicClient, http, parseAbiItem, parseEventLogs, encodeFunctionData, parseEther } from 'viem';
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

export function MintForm() {
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState(null);
  const [isSDKReady, setIsSDKReady] = useState(false);

  useEffect(() => {
    console.log('Initializing Farcaster SDK...');
    const initializeSDK = async () => {
      try {
        await frame.sdk.init();
        console.log('SDK initialized successfully');
        setIsSDKReady(true);
      } catch (err) {
        console.error('Failed to initialize SDK:', err);
        setError('Failed to initialize Farcaster SDK');
      }
    };

    initializeSDK();
  }, []);

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
      alert('NFT minted successfully!');

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
    </div>
  );
} 