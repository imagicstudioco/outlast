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

export const metadata = {
  title: 'Outlast NFTs',
  description: 'Mint one of the Outlast NFTs on Base',
  other: {
    'fc:frame': JSON.stringify({
      version: "next",
      imageUrl: `${process.env.NEXT_PUBLIC_APP_URL}/collection-banner.png`,
      button: {
        title: "Mint Yours Now!",
        action: {
          type: "launch_frame",
          name: "Outlast NFTs",
          url: `${process.env.NEXT_PUBLIC_APP_URL}`,
          splashImageUrl: `${process.env.NEXT_PUBLIC_APP_URL}/collection.gif`,
          splashBackgroundColor: "#010BFF"
        }
      }
    })
  }
};

export default function Page() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [hasNFT, setHasNFT] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const connectWallet = async () => {
      try {
        // Request wallet connection
        const accounts = await frame.sdk.wallet.ethProvider.request({
          method: 'eth_requestAccounts'
        });

        if (!accounts || !accounts[0]) {
          throw new Error('No wallet connected');
        }

        const address = accounts[0];
        setWalletAddress(address);

        // Check and switch network if needed
        const chainId = await frame.sdk.wallet.ethProvider.request({ method: 'eth_chainId' });
        if (parseInt(chainId, 16) !== 8453) {
          await frame.sdk.wallet.ethProvider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x2105' }]
          });
        }

        // Check NFT balance
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
        console.error('Error connecting wallet:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    connectWallet();
  }, []);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <main className={styles.main}>
          <div className={styles.loading}>Connecting to wallet...</div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <main className={styles.main}>
          <div className={styles.error}>Error: {error}</div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>Outlast NFTs</h1>
        <p className={styles.subtitle}>Mint Outlast NFTs</p>
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