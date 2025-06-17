"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useContractWrite } from "wagmi";
import { Button } from "./Button";
import { Card } from "./Card";
import OutlastGameAbi from "../../../contracts/out/OutlastGame.sol/OutlastGame.json";
import { type Address } from "viem";

const CONTRACT_ADDRESS = "0x60c5b60bb3352bd09663eb8ee13ce90b1b8086f6" as Address;

interface Candidate {
  id: number;
  wallet_address: string;
}

interface UserProfile {
  username: string;
  address: string;
  name: string;
  joinDate: string;
  status: 'active' | 'eliminated';
  currentRank: number;
  totalScore: number;
}

interface VotingHistory {
  round: number;
  mvpVote: string;
  eliminationVote: string;
  timestamp: string;
}

export function ProfilePage() {
  const { isConnected } = useAccount();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [votingHistory, setVotingHistory] = useState<VotingHistory[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voteLoading, setVoteLoading] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/app/data/mockData.json");
        const data = await res.json();
        setProfile(data.profile.user);
        setVotingHistory(data.profile.votingHistory);
        setCandidates(data.voting.currentRound.candidates);
      } catch (error) {
        setError("Failed to load profile data");
        console.error("Error loading profile data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Voting logic
  const { writeContract, isPending } = useContractWrite();

  const handleVote = async (participantId: number, voteType: number) => {
    setVoteLoading(true);
    setVoteError(null);
    try {
      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: OutlastGameAbi.abi,
        functionName: "castVote",
        args: [participantId, voteType],
      });
    } catch (error) {
      setVoteError("Voting failed");
      console.error("Error casting vote:", error);
    } finally {
      setVoteLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 text-center">
          <h2 className="text-2xl font-semibold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-4">Please connect your wallet to view your profile</p>
          <Button onClick={() => {}}>Connect Wallet</Button>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 text-center">
          <h2 className="text-2xl font-semibold mb-4">Loading Profile...</h2>
          <p className="text-gray-600">Please wait while we fetch your data</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 text-center">
          <h2 className="text-2xl font-semibold mb-4">Error</h2>
          <p className="text-gray-600">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Profile Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Profile</h1>
        <p className="text-gray-600">Welcome back, {profile?.name}</p>
      </div>

      {/* Profile Status */}
      <Card className="p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Status</h2>
            <p className={`text-lg ${profile?.status === 'active' ? 'text-green-500' : 'text-red-500'}`}>
              {profile?.status === 'active' ? 'Active Player' : 'Eliminated'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-600">Current Rank</p>
            <p className="text-2xl font-bold">#{profile?.currentRank}</p>
          </div>
        </div>
      </Card>

      {/* Stats Overview */}
      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Stats Overview</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">Total Score</p>
            <p className="text-2xl font-bold">{profile?.totalScore}</p>
          </div>
          <div>
            <p className="text-gray-600">Join Date</p>
            <p className="text-lg">{profile?.joinDate}</p>
          </div>
          <div>
            <p className="text-gray-600">Wallet Address</p>
            <p className="text-sm font-mono">{profile?.address}</p>
          </div>
        </div>
      </Card>

      {/* Candidates Voting */}
      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Vote for MVP or Elimination</h2>
        <div className="space-y-4">
          {candidates.map((candidate) => (
            <div key={candidate.wallet_address} className="flex justify-between items-center">
              <span className="font-bold">{candidate.wallet_address}</span>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleVote(candidate.id, 0)}
                  disabled={voteLoading}
                >
                  Vote MVP
                </Button>
                <Button
                  onClick={() => handleVote(candidate.id, 1)}
                  disabled={voteLoading}
                  variant="secondary"
                >
                  Vote Elimination
                </Button>
              </div>
            </div>
          ))}
          {voteError && <p className="text-red-500">{voteError}</p>}
        </div>
      </Card>

      {/* Voting History */}
      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Voting History</h2>
        <div className="space-y-4">
          {votingHistory.map((vote, index) => (
            <div key={index} className="border-b pb-4 last:border-b-0">
              <p className="text-gray-600">Round {vote.round}</p>
              <div className="flex justify-between mt-2">
                <div>
                  <p className="text-sm text-gray-500">MVP Vote</p>
                  <p>{vote.mvpVote}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Elimination Vote</p>
                  <p>{vote.eliminationVote}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Time</p>
                  <p>{vote.timestamp}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}