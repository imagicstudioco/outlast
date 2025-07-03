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
import { useAccount, useConnect, usePublicClient } from "wagmi";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { API_BACKEND_URL } from "./config";

// ✅ ERC721 ABI for Viem-compatible usage
const erc721ABI = [
  {
    constant: true,
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
    stateMutability: "view",
  },
];

const NFT_CONTRACT_ADDRESS = "0x9f4f7b2acff63c12d1ffa98feb16f9fdcc529113";

export default function App() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const { isConnected, address } = useAccount();
  const { connect } = useConnect();
  const publicClient = usePublicClient();

  const [frameAdded, setFrameAdded] = useState(false);
  const [activeTab, setActiveTabAction] = useState("landing");
  const [checkingStatus, setCheckingStatus] = useState(false);

  const { addFrame } = useAddFrame();
  const frameConnector = useMemo(() => farcasterFrame(), []);

  const handleVoteSuccess = useCallback(() => {
    setActiveTabAction("results");
  }, []);

  useEffect(() => {
    if (!isFrameReady) setFrameReady();
  }, [isFrameReady, setFrameReady]);

  useEffect(() => {
    const autoConnect = async () => {
      if (!isConnected) {
        try {
          await connect({ connector: frameConnector });
        } catch (error) {
          console.error("Auto-connect failed:", error);
        }
      }
    };
    autoConnect();
  }, [isConnected, connect, frameConnector]);

  const checkStatus = useCallback(
    async (walletAddress: string) => {
      if (!walletAddress || !publicClient) return;

      setCheckingStatus(true);

      try {
        // ✅ Correct usage with wagmi@2 + viem@2
        const balance = await publicClient.readContract({
          abi: erc721ABI,
          address: NFT_CONTRACT_ADDRESS,
          functionName: "balanceOf",
          args: [walletAddress],
        });

        const hasNFT = typeof balance === "bigint" && balance > 0n;

        // ✅ Check vote status
        const res = await fetch(`${API_BACKEND_URL}/api/voting/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voter: walletAddress }),
        });

        const data = await res.json();
        const hasVoted = Boolean(data.hasVoted);

        if (!hasNFT || hasVoted) {
          setActiveTabAction("results");
        } else {
          setActiveTabAction("landing");
        }
      } catch (err) {
        console.error("Error checking status:", err);
        setActiveTabAction("results");
      } finally {
        setCheckingStatus(false);
      }
    },
    [publicClient]
  );

  useEffect(() => {
    if (isConnected && address) {
      checkStatus(address);
    } else {
      setActiveTabAction("landing");
      setCheckingStatus(false);
    }
  }, [isConnected, address, checkStatus]);

  const handleAddFrame = useCallback(async () => {
    try {
      const added = await addFrame({
        id: "airtimeplus",
        title: "AirtimePlus",
        description: "Buy airtime with USDC",
        image: process.env.NEXT_PUBLIC_ICON_URL || "",
      });
      setFrameAdded(Boolean(added));
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
      await connect({ connector: frameConnector });
    } catch (error) {
      console.error("Connection failed:", error);
    }
  }, [connect, frameConnector]);

  if (checkingStatus) {
    return (
      <div className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)] mini-app-theme from-[var(--app-background)] to-[var(--app-gray)]">
        <div className="w-full max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Checking access requirements...</p>
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
                <Button variant="ghost" size="sm" onClick={handleConnect}>
                  Connect Wallet
                </Button>
              )}
            </div>
          </div>
          <div>{saveFrameButton}</div>
        </header>

        <main className="flex-1">
          {activeTab === "landing" && (
            <HomePage
              setActiveTabAction={setActiveTabAction}
              hasVoted={false}
              onVoteSuccess={handleVoteSuccess}
            />
          )}
          {activeTab === "results" && <Results />}
        </main>

        <footer className="mt-2 pt-4 flex justify-center">Outlast</footer>
      </div>
    </div>
  );
}
