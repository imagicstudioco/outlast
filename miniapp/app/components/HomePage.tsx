"use client";

import { useEffect, useState } from "react";
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
  hasVoted: boolean;
  onVoteSuccess: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ 
  setActiveTabAction, 
  hasVoted, 
  onVoteSuccess 
}) => {
  const { isConnected, address } = useAccount();
  const [finalists, setFinalists] = useState<Finalist[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  const fetchFinalists = async () => {
    try {
      const response = await fetch(`${API_BACKEND_URL}/finalists`);
      const data = await response.json();
      setFinalists(data);
    } catch {
      console.error("Failed to load finalists");
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (finalistId: string) => {
    if (!isConnected || !address) {
      alert("Please connect your wallet to vote.");
      return;
    }

    if (hasVoted) {
      alert("You've already voted.");
      return;
    }

    setVoting(true);
    try {
      console.log("Submitting vote for finalist:", finalistId);
      
      const res = await fetch(`${API_BACKEND_URL}/api/voting/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voter: address, votedFor: finalistId }),
      });

      const result = await res.json();
      console.log("Vote response:", result);

      if (!res.ok) {
        throw new Error(result.error || "Vote failed");
      }

      alert("✅ Vote submitted!");
      onVoteSuccess(); // This will update the parent state and redirect
    } catch (error) {
      console.error("❌ Vote failed", error);
      alert("❌ Vote failed.");
    } finally {
      setVoting(false);
    }
  };

  useEffect(() => {
    fetchFinalists();
  }, []);

  // If user has already voted, they shouldn't see this page
  // The parent component handles the redirect, but this is a safety check
  useEffect(() => {
    if (hasVoted) {
      console.log("User has voted, redirecting to results");
      setActiveTabAction("results");
    }
  }, [hasVoted, setActiveTabAction]);

  if (loading) {
    return (
      <Card className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading finalists...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Finalists</h1>
        <p className="text-gray-600">Vote for your favorite finalist</p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          {finalists.map((finalist, index) => (
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
                onClick={() => handleVote(finalist._id)}
                disabled={voting || hasVoted}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 disabled:opacity-50"
              >
                {hasVoted ? "Already Voted" : voting ? "Voting..." : "Vote"}
              </Button>
            </div>
          ))}
        </div>
      </Card>

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