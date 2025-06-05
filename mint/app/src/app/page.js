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
  const [isFrameInitialized, setIsFrameInitialized] = useState(false);

  useEffect(() => {
    const checkFrameInitialization = () => {
      if (window.frameInitialized) {
        setIsFrameInitialized(true);
        setIsLoading(false);
      } else if (window.frameError) {
        setError(window.frameError);
        setIsLoading(false);
      }
    };

    // Initial check
    checkFrameInitialization();

    // Set up an interval to check periodically
    const interval = setInterval(checkFrameInitialization, 1000);

    // Cleanup
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkNFTBalance = async () => {
      if (!isFrameInitialized || !frame.sdk.wallet?.ethProvider) return;

      try {
        const accounts = await frame.sdk.wallet.ethProvider.request({
          method: 'eth_requestAccounts'
        });

        if (!accounts || accounts.length === 0) {
          setWalletAddress(null);
          setHasNFT(false);
          return;
        }

        const address = accounts[0];
        setWalletAddress(address);

        const client = createPublicClient({
          chain: base,
          transport: http(),
        });

        const balance = await client.readContract({
          address: CONTRACT_ADDRESS,
          abi: contractABI,
          functionName: 'balanceOf',
          args: [address],
        });

        setHasNFT(balance > 0);
      } catch (err) {
        console.error('Error checking NFT balance:', err);
        setError('Failed to check NFT balance');
      }
    };

    checkNFTBalance();
  }, [isFrameInitialized]);

  if (isLoading) {
    console.log('Page is in loading state');
    return (
      <div className={styles.container}>
        <main className={styles.main}>
          <div className={styles.loading}>Initializing...</div>
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