"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { Button } from "./Button";
import { Card } from "./Card";
import { API_BACKEND_URL } from "../config";

interface Finalist {
  _id: string;
  username: string;
}

interface HomePageProps {
  setActiveTabAction: (tab: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ setActiveTabAction }) => {
  const { isConnected, address } = useAccount();
  const [finalists, setFinalists] = useState<Finalist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voting, setVoting] = useState<boolean>(false);
  const [hasVoted, setHasVoted] = useState<boolean | undefined>(undefined);
  const [checkingVoteStatus, setCheckingVoteStatus] = useState(false);

  // Fetch finalists
  const fetchFinalists = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BACKEND_URL}/finalists`);
      if (!response.ok) throw new Error("Failed to fetch finalists list");

      const data = await response.json();
      setFinalists(data);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      setError(errMsg);
      console.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Check vote status
  const checkVoteStatus = useCallback(async (walletAddress: string) => {
    if (!walletAddress) return;

    setCheckingVoteStatus(true);
    try {
      const response = await fetch(`${API_BACKEND_URL}/api/voting/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voter: walletAddress }),
      });

      const data = await response.json();
      const voted = Boolean(data.hasVoted);
      setHasVoted(voted);

      if (voted) {
        setActiveTabAction("results");
      }
    } catch (error) {
      console.error("Error checking vote status:", error);
      setHasVoted(false);
    } finally {
      setCheckingVoteStatus(false);
    }
  }, [setActiveTabAction]);

  // Submit vote
  const handleVote = async (username: string, id: string) => {
    if (!isConnected || !address) {
      alert("Please connect your wallet first");
      return;
    }

    if (hasVoted) {
      alert("You’ve already voted. Redirecting to results...");
      setActiveTabAction("results");
      return;
    }

    setVoting(true);
    try {
      const response = await fetch(`${API_BACKEND_URL}/api/voting/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voter: address,
          votedFor: id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Vote failed");
      }

      console.log(`✅ Voted for: ${username}`);
      setHasVoted(true);
      setActiveTabAction("results");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      alert(`Vote failed: ${errMsg}`);
      console.error(errMsg);
    } finally {
      setVoting(false);
    }
  };

  // On wallet connect or change
  useEffect(() => {
    if (isConnected && address) {
      checkVoteStatus(address);
    } else {
      setHasVoted(undefined);
    }
  }, [isConnected, address]);

  // Fetch finalists on load
  useEffect(() => {
    fetchFinalists();
  }, []);

  // UI while checking vote status
  if (checkingVoteStatus) {
    return (
      <div className="space-y-6 animate-fade-in p-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Finalists</h1>
          <p className="text-gray-600">Vote for your favorite finalist</p>
        </div>
        <Card className="p-6 text-center">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Checking your vote status...</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // If already voted
  if (hasVoted) {
    return (
      <div className="space-y-6 animate-fade-in p-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Finalists</h1>
          <p className="text-gray-600">Vote for your favorite finalist</p>
        </div>
        <Card className="p-6 text-center">
          <h2 className="text-2xl font-semibold mb-4">You Have Already Voted</h2>
          <p className="text-gray-600 mb-4">
            You have already cast your vote. Redirecting to results...
          </p>
          <Button
            onClick={() => setActiveTabAction("results")}
            className="bg-blue-500 hover:bg-blue-600"
          >
            View Results
          </Button>
        </Card>
      </div>
    );
  }

  // Main voting UI
  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Finalists</h1>
        <p className="text-gray-600">Vote for your favorite finalist</p>
      </div>

      {loading && (
        <Card className="p-6 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </Card>
      )}

      {error && (
        <Card className="p-6 text-center">
          <p className="text-red-500 font-semibold mb-2">Error loading finalists</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button
            onClick={fetchFinalists}
            className="bg-red-500 hover:bg-red-600"
          >
            Retry
          </Button>
        </Card>
      )}

      {!loading && !error && (
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-6">Finalists List</h2>
          <div className="space-y-4">
            {finalists.length > 0 ? (
              finalists.map((finalist, index) => (
                <div
                  key={finalist._id}
                  className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-lg font-medium text-gray-900">
                      {index + 1}.
                    </span>
                    <span className="text-lg font-semibold">
                      {finalist.username}
                    </span>
                  </div>
                  <Button
                    onClick={() => handleVote(finalist.username, finalist._id)}
                    disabled={voting || Boolean(hasVoted)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 disabled:opacity-50"
                  >
                    {voting ? "Voting..." : hasVoted ? "Already Voted" : "Vote"}
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 text-lg">
                  No finalists available at the moment
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {!isConnected && (
        <Card className="p-6 text-center">
          <h2 className="text-2xl font-semibold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-4">
            Connect your wallet to vote for finalists
          </p>
          <Button onClick={() => {}} className="w-full md:w-auto">
            Connect Wallet
          </Button>
        </Card>
      )}
    </div>
  );
};
