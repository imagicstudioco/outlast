"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useContractWrite, usePrepareContractWrite } from "wagmi";
import { Button } from "./Button";
import { Card } from "./Card";
import { readContract } from "viem";
import OutlastGameAbi from "../../../contracts/out/OutlastGame.sol/OutlastGame.json";

interface VotingHistory {
  round: number;
  mvpVote: string;
  eliminationVote: string;
  timestamp: string;
}

interface ParticipationStats {
  totalVotes: number;
  correctPredictions: number;
  mvpVotes: number;
  eliminationVotes: number;
  participationRate: number;
  averageScore: number;
  highestScore: number;
  roundsPlayed: number;
}

interface UserProfile {
  address: string;
  name: string;
  joinDate: string;
  status: 'active' | 'eliminated';
  currentRank: number;
  totalScore: number;
}

const CONTRACT_ADDRESS = "0x60c5b60bb3352bd09663eb8ee13ce90b1b8086f6";

export function ProfilePage() {
  const { address, isConnected } = useAccount();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [votingHistory, setVotingHistory] = useState<VotingHistory[]>([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voteLoading, setVoteLoading] = useState(false);
  const [voteError, setVoteError] = useState(null);
  const [stats] = useState<ParticipationStats>({
    totalVotes: 0,
    correctPredictions: 0,
    mvpVotes: 0,
    eliminationVotes: 0,
    participationRate: 0,
    averageScore: 0,
    highestScore: 0,
    roundsPlayed: 0,
  });

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
      } catch (e) {
        setError("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Voting logic
  const { config, error: prepareError } = usePrepareContractWrite({
    address: CONTRACT_ADDRESS,
    abi: OutlastGameAbi.abi,
    functionName: "castVote",
    enabled: false, // enable on demand
  });
  const { writeAsync: castVote } = useContractWrite(config);

  const handleVote = async (participantId, voteType) => {
    setVoteLoading(true);
    setVoteError(null);
    try {
      await castVote({ args: [participantId, voteType] });
    } catch (e) {
      setVoteError("Voting failed");
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
          <Button onClick={() => {/* TODO: Implement wallet connection */}}>
            Connect Wallet
          </Button>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Profile Information</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Status</span>
              <span className={`font-bold ${
                profile?.status === 'active' ? 'text-green-500' : 'text-red-500'
              }`}>
                {profile?.status.charAt(0).toUpperCase() + profile?.status.slice(1)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Current Rank</span>
              <span className="font-bold">#{profile?.currentRank}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Score</span>
              <span className="font-bold">{profile?.totalScore}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Join Date</span>
              <span className="font-bold">{profile?.joinDate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Wallet Address</span>
              <span className="font-bold text-sm">{profile?.address}</span>
            </div>
          </div>
        </Card>

        {/* Participation Statistics */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Participation Statistics</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Votes</span>
              <span className="font-bold">{stats.totalVotes}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Correct Predictions</span>
              <span className="font-bold">{stats.correctPredictions}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">MVP Votes</span>
              <span className="font-bold">{stats.mvpVotes}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Elimination Votes</span>
              <span className="font-bold">{stats.eliminationVotes}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Participation Rate</span>
              <span className="font-bold">{stats.participationRate}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Average Score</span>
              <span className="font-bold">{stats.averageScore}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Highest Score</span>
              <span className="font-bold">{stats.highestScore}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Rounds Played</span>
              <span className="font-bold">{stats.roundsPlayed}</span>
            </div>
          </div>
        </Card>

        {/* Voting History */}
        <Card className="p-6 lg:col-span-3">
          <h2 className="text-2xl font-semibold mb-4">Voting History</h2>
          <div className="space-y-4">
            {votingHistory.length > 0 ? (
              votingHistory.map((vote) => (
                <div
                  key={vote.round}
                  className="p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">Round {vote.round}</h3>
                    <span className="text-sm text-gray-500">{vote.timestamp}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600">MVP Vote</p>
                      <p className="font-medium">{vote.mvpVote}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Elimination Vote</p>
                      <p className="font-medium">{vote.eliminationVote}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-600">No voting history available</p>
            )}
          </div>
        </Card>
      </div>

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
    </div>
  );
}