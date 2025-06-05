'use client';

import { useState } from 'react';
import styles from './MintForm.module.css';

// Default mint price in ETH
const DEFAULT_MINT_PRICE = 0.001;

export function MintForm() {
  const [isMinting, setIsMinting] = useState(false);

  const handleMint = () => {
    setIsMinting(true);
    // Add your mint logic here
  };

  return (
    <div className={styles.mintForm}>
      <button 
        className={styles.mintButton} 
        onClick={handleMint}
        disabled={isMinting}
      >
        {isMinting ? 'Minting...' : `Mint - ${Number(DEFAULT_MINT_PRICE).toFixed(4).replace(/\.?0+$/, '')} ETH`}
      </button>
    </div>
  );
}
