"use client";

import {
  useMiniKit,
  useAddFrame,
} from "@coinbase/onchainkit/minikit";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "./components/Button";
import { Icon } from "./components/Icon";
import { HomePage } from "./components/HomePage";
import { Results } from "./components/Results";
import { useAccount, useConnect } from "wagmi";
import { farcasterFrame } from '@farcaster/frame-wagmi-connector';
import { API_BACKEND_URL } from "./config";

export default function App() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const [frameAdded, setFrameAdded] = useState(false);
  const { isConnected, address } = useAccount();
  const { connect } = useConnect();
  const [activeTab, setActiveTabAction] = useState("landing");
  const [checkingVoteStatus, setCheckingVoteStatus] = useState(false);

  const { addFrame } = useAddFrame();
  const frameConnector = useMemo(() => farcasterFrame(), []);

  // Check if the connected wallet has voted
  const checkVoteStatus = useCallback(async (walletAddress: string) => {
    if (!walletAddress) return;
    
    setCheckingVoteStatus(true);
    try {
      const response = await fetch(`${API_BACKEND_URL}/api/voting/check-vote-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voterId: walletAddress
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Auto-navigate based on vote status
        if (data.hasVoted) {
          setActiveTabAction("results");
        } else {
          setActiveTabAction("landing");
        }
      } else {
        // If endpoint doesn't exist, assume not voted
        setActiveTabAction("landing");
      }
    } catch (error) {
      console.error('Error checking vote status:', error);
      // On error, assume not voted
      setActiveTabAction("landing");
    } finally {
      setCheckingVoteStatus(false);
    }
  }, []);

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  useEffect(() => {
    const autoConnect = async () => {
      try {
        if (!isConnected) {
          console.log("Attempting to auto-connect wallet...");
          await connect({ connector: frameConnector });
        }
      } catch (error) {
        console.error("Auto-connect failed:", error);
      }
    };
    autoConnect();
  }, [isConnected, connect, frameConnector]);

  // Check vote status when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      checkVoteStatus(address);
    } else {
      setActiveTabAction("landing");
    }
  }, [isConnected, address, checkVoteStatus]);

  const handleAddFrame = useCallback(async () => {
    try {
      console.log("Adding frame...");
      const frameAdded = await addFrame({
        id: 'airtimeplus',
        title: 'AirtimePlus',
        description: 'Buy airtime with USDC',
        image: process.env.NEXT_PUBLIC_ICON_URL || '',
      });
      console.log("Frame added:", frameAdded);
      setFrameAdded(Boolean(frameAdded));
    } catch (error) {
      console.error("Failed to add frame:", error);
    }
  }, [addFrame]);

  const saveFrameButton = useMemo(() => {
    if (context && !context.client.added) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddFrame}
          className="text-[var(--app-accent)] p-4"
          icon={<Icon name="plus" size="sm" />}
        >
          Save Frame
        </Button>
      );
    }

    if (frameAdded) {
      return (
        <div className="flex items-center space-x-1 text-sm font-medium text-[#0052FF] animate-fade-out">
          <Icon name="check" size="sm" className="text-[#0052FF]" />
          <span>Saved</span>
        </div>
      );
    }

    return null;
  }, [context, frameAdded, handleAddFrame]);

  const handleConnect = useCallback(async () => {
    try {
      console.log("Connecting wallet...");
      await connect({ connector: frameConnector });
    } catch (error) {
      console.error("Connection failed:", error);
    }
  }, [connect, frameConnector]);

  // Show loading while checking vote status
  if (checkingVoteStatus) {
    return (
      <div className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)] mini-app-theme from-[var(--app-background)] to-[var(--app-gray)]">
        <div className="w-full max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Checking your vote status...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)] mini-app-theme from-[var(--app-background)] to-[var(--app-gray)]">
      <div className="w-full max-w-md mx-auto px-4 py-3">
        <header className="flex justify-between items-center mb-3 h-11">
          <div>
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <div className="flex items-center space-x-2">
                  <div className="text-sm font-medium">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => connect({ connector: frameConnector })}
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleConnect}
                >
                  Connect Wallet
                </Button>
              )}
            </div>
          </div>
          <div>{saveFrameButton}</div>
        </header>

        <main className="flex-1">
          {activeTab === "landing" && (
            <HomePage setActiveTabAction={setActiveTabAction} />
          )}
          {activeTab === "results" && <Results setActiveTabAction={setActiveTabAction} />}
        </main>

        <footer className="mt-2 pt-4 flex justify-center">
          Outlast
        </footer>
      </div>
    </div>
  );
}
