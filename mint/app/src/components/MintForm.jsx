'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './MintForm.module.css';
import * as frame from '@farcaster/frame-sdk';
import { MintedNFTs } from './MintedNFTs';

// Default mint price in ETH (fallback)
const DEFAULT_MINT_PRICE = 0.001;
const DEFAULT_MAX_QUANTITY = 25;
const ACCOUNT_REQUEST_TIMEOUT_MS = 15000; // 15 seconds for initial account request
const MINT_ACCOUNT_REQUEST_TIMEOUT_MS = 30000; // 30 seconds for mint interaction

// Status message types
const STATUS_TYPES = {
  NONE: 'none',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
};

export function MintForm() {
  const [isMinting, setIsMinting] = useState(false);
  const [status, setStatus] = useState({ type: STATUS_TYPES.NONE, message: '' });
  const [txHash, setTxHash] = useState(null);
  const [mintPrice, setMintPrice] = useState(DEFAULT_MINT_PRICE);
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);
  const [maxQuantity, setMaxQuantity] = useState(DEFAULT_MAX_QUANTITY);
  const [hasFreeMint, setHasFreeMint] = useState(false);
  const [mintType, setMintType] = useState('free'); // 'free' or 'paid'
  const mintedNFTsRef = useRef(null); // Ref for scrolling

  useEffect(() => {
    console.log('[MintForm] Component mounted / initialized');
    setIsLoadingPrice(false);
  }, []);

  // Scroll to MintedNFTs when txHash is set and update status
  useEffect(() => {
    console.log('[MintForm] txHash changed:', txHash);
    if (txHash) {
      console.log('[MintForm] Setting congrats message.');
      setStatus({
        type: STATUS_TYPES.SUCCESS,
        message: 'Congrats! Scroll down to see your new NFT(s)!'
      });

      if (mintedNFTsRef.current) {
        console.log('[MintForm] Scrolling to MintedNFTs section.');
        const timer = setTimeout(() => {
          mintedNFTsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [txHash]);

  const handleOpenUrl = (urlAsString) => {
    console.log('[MintForm] handleOpenUrl called with:', urlAsString);
    try {
      frame.sdk.actions.openUrl(urlAsString);
    } catch (error) {
      try {
        frame.sdk.actions.openUrl({ url: urlAsString });
      } catch (secondError) {
        console.error('Failed to open URL:', secondError);
      }
    }
  };

  const handleOpenMintWebsite = () => {
    console.log('[MintForm] handleOpenMintWebsite called.');
    handleOpenUrl('https://www.scatter.art/collection/farcasterinterns');
  };

  const handleShareOnWarpcast = () => {
    console.log('[MintForm] handleShareOnWarpcast called.');
    const targetText = 'Checkout Outlast NFTs by @xexcy, a free mint for Farcaster Pro subscribers!';
    const targetURL = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const finalUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(targetText)}&embeds[]=${encodeURIComponent(targetURL)}`;
    handleOpenUrl(finalUrl);
  };

  const handleMint = async () => {
    console.log(`[MintForm] handleMint started. Mint Type: ${mintType}`);
    setIsMinting(true);
    setStatus({ type: STATUS_TYPES.LOADING, message: 'Connecting to wallet for minting...' });
    
    try {
      console.log('[MintForm] Requesting accounts for minting...');
      const accountsPromise = frame.sdk.wallet.ethProvider.request({
        method: 'eth_requestAccounts'
      });
      const mintTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Wallet interaction for mint timed out (30s). Please try again.')), MINT_ACCOUNT_REQUEST_TIMEOUT_MS)
      );
      const accounts = await Promise.race([accountsPromise, mintTimeoutPromise]);
      console.log('[MintForm] Accounts for minting:', accounts);

      if (!accounts || !accounts[0]) {
        console.error('[MintForm] No wallet connected for minting after request.');
        throw new Error('No wallet connected. Please ensure your wallet is connected and try again.');
      }
      const walletAddress = accounts[0];
      console.log('[MintForm] Wallet address for minting:', walletAddress);
      
      setStatus({
        type: STATUS_TYPES.LOADING,
        message: 'Checking network...'
      });
      console.log('[MintForm] Requesting chainId...');
      const chainIdHex = await frame.sdk.wallet.ethProvider.request({ method: 'eth_chainId' });
      const chainIdDecimal = parseInt(chainIdHex, 16);
      console.log(`[MintForm] Current chainId: ${chainIdDecimal} (Hex: ${chainIdHex})`);
      
      if (chainIdDecimal !== 8453) {
        console.log('[MintForm] Incorrect network. Requesting switch to Base (8453)...');
        setStatus({
          type: STATUS_TYPES.LOADING,
          message: 'Switching to Base network...'
        });
        
        await frame.sdk.wallet.ethProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }] // Base mainnet chainId
        });
        console.log('[MintForm] Network switch requested.');
      }
      
      // Contract details
      const contractAddress = '0x4c8574512C09f0dCa20A37aB24447a2e1C10f223';
      console.log('[MintForm] Contract address:', contractAddress);
      
      if (mintType === 'free') {
        console.log('[MintForm] Processing free mint.');
        const body = {
          collectionAddress: contractAddress,
          chainId: 8453,
          minterAddress: walletAddress,
          affiliateAddress: '0x0'
        };
        console.log('[MintForm] Calling /api/generate-mint-tx with body:', body);
        setStatus({
          type: STATUS_TYPES.LOADING,
          message: 'Generating mint transaction...'
        });
        const res = await fetch('/api/generate-mint-tx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        console.log('[MintForm] /api/generate-mint-tx response status:', res.status);
        if (!res.ok) {
          const err = await res.json();
          console.error('[MintForm] /api/generate-mint-tx failed:', err);
          throw new Error(err.error || 'Failed to generate mint transaction');
        }
        const mintTx = await res.json();
        console.log('[MintForm] Received mintTransaction from API:', mintTx);
        
        try {
          const txParams = {
            from: walletAddress,
            to: mintTx.to,
            data: mintTx.data
          };
          console.log('[MintForm] Sending free mint transaction with params:', txParams);
          const currentTxHash = await frame.sdk.wallet.ethProvider.request({
            method: 'eth_sendTransaction',
            params: [txParams]
          });
          console.log('[MintForm] Free mint transaction sent. TxHash:', currentTxHash);
          setTxHash(currentTxHash);
        } catch (mintError) {
          console.error('[MintForm] Free mint transaction error:', mintError);
          setStatus({
            type: STATUS_TYPES.ERROR,
            message: `Transaction failed: ${mintError.message}`
          });
        }
      } else {
        console.log('[MintForm] Processing paid mint.');
        const mintFunctionSignature = '0x4a21a2df'; // mint function signature
        const ethToWei = (eth) => {
          return '0x' + (BigInt(Math.floor(eth * 1e18))).toString(16);
        };
        const valueInWei = ethToWei(DEFAULT_MINT_PRICE);
        const data =
          mintFunctionSignature +
          '0000000000000000000000000000000000000000000000000000000000000080' +
          '0000000000000000000000000000000000000000000000000000000000000001' +
          '0000000000000000000000000000000000000000000000000000000000000000' +
          '00000000000000000000000000000000000000000000000000000000000000e0' +
          '0000000000000000000000000000000000000000000000000000000000000000' +
          '0000000000000000000000000000000000000000000000000000000000000040' +
          '0000000000000000000000000000000000000000000000000000000000000000' +
          '0000000000000000000000000000000000000000000000000000000000000001' +
          '0000000000000000000000000000000000000000000000000000000000000000';
        console.log(`[MintForm] Paid mint details: PriceETH=${DEFAULT_MINT_PRICE}, ValueWei=${valueInWei}`);
        setStatus({
          type: STATUS_TYPES.LOADING,
          message: 'Confirm transaction in your wallet...'
        });
        try {
          console.log('[MintForm] Sending paid mint transaction with params:', { from: walletAddress, to: contractAddress, data: data, value: valueInWei });
          const currentTxHash = await frame.sdk.wallet.ethProvider.request({
            method: 'eth_sendTransaction',
            params: [{
              from: walletAddress,
              to: contractAddress,
              data: data,
              value: valueInWei
            }]
          });
          console.log('[MintForm] Paid mint transaction sent. TxHash:', currentTxHash);
          setTxHash(currentTxHash);
        } catch (mintError) {
          console.error('[MintForm] Paid mint transaction error:', mintError);
          setStatus({
            type: STATUS_TYPES.ERROR,
            message: `Transaction failed: ${mintError.message}`
          });
        }
      }
    } catch (error) {
      console.error('[MintForm] General error in handleMint:', error);
      setStatus({ type: STATUS_TYPES.ERROR, message: error.message || 'Failed to mint. Please try again.'});
    } finally {
      console.log('[MintForm] handleMint finished. isMinting: false.');
      setIsMinting(false);
    }
  };

  return (
    <>
      <div className={styles.mintForm}>
        <div className={styles.mintTypeSelector}>
         
        
        <button 
          className={styles.mintButton} 
          onClick={handleMint}
          disabled={isMinting || isLoadingPrice}
        >
          {isMinting ? 'Minting...' : 
           isLoadingPrice ? 'Loading...' :
           mintType === 'free' ? `Mint - Free` :
           `Mint - ${Number(DEFAULT_MINT_PRICE).toFixed(4).replace(/\.?0+$/, '')} ETH`}
        </button>
        
        {status.type !== STATUS_TYPES.NONE && (
          <div className={`${styles.statusMessage} ${styles[status.type]}`}>
            {status.message}
          </div>
        )}
        
        <hr className={styles.divider} />
        
      
      </div>

      <div ref={mintedNFTsRef}>
        {txHash && <MintedNFTs txHash={txHash} />}
      </div>
    </>
  );
}
