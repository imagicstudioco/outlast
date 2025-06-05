'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './CollectionDisplay.module.css';
import * as frame from '@farcaster/frame-sdk';

export function CollectionDisplay() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [inviteLists, setInviteLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get wallet address
  useEffect(() => {
    async function getWalletAddress() {
      try {
        const accounts = await frame.sdk.wallet.ethProvider.request({
          method: 'eth_requestAccounts'
        });
        
        if (accounts && accounts[0]) {
          setWalletAddress(accounts[0]);
        }
      } catch (error) {
        console.error('Failed to get wallet address:', error);
      }
    }

    getWalletAddress();
  }, []);

  // Fetch invite list data when wallet address changes
  useEffect(() => {
    async function fetchInviteLists() {
      if (!walletAddress) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/invite-lists?wallet=${walletAddress}`);
        if (!response.ok) {
          throw new Error('Failed to fetch invite list data');
        }
        const data = await response.json();
        setInviteLists(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchInviteLists();
  }, [walletAddress]);

  return (
    <div className={styles.collectionDisplay}>
      <Image 
        src="/collection.gif" 
        alt="Collection GIF" 
        width={400} 
        height={400}
        className={styles.collectionImage}
        priority
      />
      

    </div>
  );
}