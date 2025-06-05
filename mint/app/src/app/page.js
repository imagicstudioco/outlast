'use client';

import { useState, useEffect } from 'react';
import styles from "./page.module.css";
import { CollectionDisplay } from "@/components/CollectionDisplay";
import { MintForm } from "@/components/MintForm";
import { createPublicClient, http, parseAbiItem } from 'viem';
import { base } from 'viem/chains';
import * as frame from '@farcaster/frame-sdk';

const CONTRACT_ADDRESS = '0x4a02d17aff1590b270bb631427d49cced8775033';

// ABI for the events we need
const contractABI = [
  parseAbiItem('function balanceOf(address owner) view returns (uint256)'),
];

export default function Page() {
  console.log('Page component rendering');
  const [walletAddress, setWalletAddress] = useState(null);
  const [hasNFT, setHasNFT] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('Page useEffect running');
    const connectWallet = async () => {
      console.log('Attempting to connect wallet...');
      try {
        // Request wallet connection
        console.log('Requesting wallet accounts...');
        const accounts = await frame.sdk.wallet.ethProvider.request({
          method: 'eth_requestAccounts'
        });

        console.log('Wallet accounts received:', accounts);

        if (!accounts || !accounts[0]) {
          throw new Error('No wallet connected');
        }

        const address = accounts[0];
        console.log('Setting wallet address:', address);
        setWalletAddress(address);

        // Check and switch network if needed
        console.log('Checking network...');
        const chainId = await frame.sdk.wallet.ethProvider.request({ method: 'eth_chainId' });
        console.log('Current chain ID:', parseInt(chainId, 16));
        
        if (parseInt(chainId, 16) !== 8453) {
          console.log('Switching to Base network...');
          await frame.sdk.wallet.ethProvider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x2105' }]
          });
        }

        // Check NFT balance
        console.log('Creating public client...');
        const client = createPublicClient({
          chain: base,
          transport: http(),
        });

        console.log('Checking NFT balance...');
        const balance = await client.readContract({
          address: CONTRACT_ADDRESS,
          abi: contractABI,
          functionName: 'balanceOf',
          args: [address],
        });

        console.log('NFT balance:', balance.toString());
        setHasNFT(balance > 0);
      } catch (err) {
        console.error('Error connecting wallet:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    connectWallet();
  }, []);

  if (isLoading) {
    console.log('Page is in loading state');
    return (
      <div className={styles.container}>
        <main className={styles.main}>
          <div className={styles.loading}>Connecting to wallet...</div>
        </main>
      </div>
    );
  }

  if (error) {
    console.log('Page has error:', error);
    return (
      <div className={styles.container}>
        <main className={styles.main}>
          <div className={styles.error}>Error: {error}</div>
        </main>
      </div>
    );
  }

  console.log('Rendering main page content');
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>Outlast NFT</h1>
        <p className={styles.subtitle}>Mint Outlast NFT</p>
        <CollectionDisplay />
        {hasNFT ? (
          <div className={styles.alreadyOwned}>
            <h2>You already own an Outlast NFT!</h2>
            <p>Thank you for being part of our community.</p>
          </div>
        ) : (
          <MintForm />
        )}
      </main>
    </div>
  );
}