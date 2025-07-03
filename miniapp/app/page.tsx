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
  const [hasVoted, setHasVoted] = useState(false);

  const { addFrame } = useAddFrame();
  const frameConnector = useMemo(() => farcasterFrame(), []);

  // Check if the connected wallet has voted
  const checkVoteStatus = useCallback(async (walletAddress: string) => {
    if (!walletAddress) return;
    
    setCheckingVoteStatus(true);
    try {
      console.log("Checking vote status for:", walletAddress);
      
      const response = await fetch(`${API_BACKEND_URL}/api/voting/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voter: walletAddress
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const voted = Boolean(data.hasVoted);
        console.log("Vote status response:", { data, voted });
        
        setHasVoted(voted);
        
        // Don't set activeTab here, let the useEffect handle it
        if (!voted) {
          console.log("User hasn't voted, showing landing page");
          setActiveTabAction("landing");
        }
        // If voted, the useEffect will handle the redirect
      } else {
        console.log("Vote status check failed, assuming not voted");
        setHasVoted(false);
        setActiveTabAction("landing");
      }
    } catch (error) {
      console.error('Error checking vote status:', error);
      setHasVoted(false);
      setActiveTabAction("landing");
    } finally {
      setCheckingVoteStatus(false);
    }
  }, []);

  // Handle successful vote from HomePage
  const handleVoteSuccess = useCallback(() => {
    console.log("Vote successful, updating state");
    setHasVoted(true);
    setActiveTabAction("results");
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
      console.log("Wallet connected, checking vote status");
      checkVoteStatus(address);
    } else {
      console.log("Wallet not connected, showing landing page");
      setHasVoted(false);
      setActiveTabAction("landing");
      setCheckingVoteStatus(false); // Make sure we're not stuck in loading
    }
  }, [isConnected, address, checkVoteStatus]);

  // Add a separate useEffect to handle the redirect after state updates
  useEffect(() => {
    console.log("State changed:", { hasVoted, activeTab, checkingVoteStatus });
    if (hasVoted && !checkingVoteStatus) {
      console.log("Triggering redirect to results");
      setActiveTabAction("results");
    }
  }, [hasVoted, checkingVoteStatus]);

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

  // Move console.log outside of JSX
  console.log("Rendering with activeTab:", activeTab, "hasVoted:", hasVoted);

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
          {/* Debug info - remove this after testing */}
          <div className="bg-gray-100 p-2 mb-4 text-xs">
            <strong>Debug:</strong> activeTab: {activeTab}, hasVoted: {hasVoted.toString()}, 
            checkingVoteStatus: {checkingVoteStatus.toString()}, 
            isConnected: {isConnected.toString()}, 
            address: {address?.slice(0, 6)}...{address?.slice(-4)}
          </div>
          
          {activeTab === "landing" && (
            <HomePage 
              setActiveTabAction={setActiveTabAction} 
              hasVoted={hasVoted}
              onVoteSuccess={handleVoteSuccess}
            />
          )}
          {activeTab === "results" && <Results />}
        </main>

        <footer className="mt-2 pt-4 flex justify-center">
          Outlast
        </footer>
      </div>
    </div>
  );
}