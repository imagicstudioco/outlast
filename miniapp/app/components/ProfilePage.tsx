"use client";

import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { Button } from "./Button";
import { Card } from "./Card";

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

export function ProfilePage() {
  const { address, isConnected } = useAccount();
  const [profile] = useState<UserProfile | null>(null);
  const [votingHistory] = useState<VotingHistory[]>([]);
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
    // TODO: Fetch user profile data
    const fetchProfileData = async () => {
      try {
        // Add your API calls here
      } catch (error) {
        console.error("Error fetching profile data:", error);
      }
    };

    if (isConnected && address) {
      fetchProfileData();
    }
  }, [isConnected, address]);

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

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 text-center">
          <h2 className="text-2xl font-semibold mb-4">Loading Profile...</h2>
          <p className="text-gray-600">Please wait while we fetch your data</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Profile Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Profile</h1>
        <p className="text-gray-600">Welcome back, {profile.name}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Profile Information</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Status</span>
              <span className={`font-bold ${
                profile.status === 'active' ? 'text-green-500' : 'text-red-500'
              }`}>
                {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Current Rank</span>
              <span className="font-bold">#{profile.currentRank}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Score</span>
              <span className="font-bold">{profile.totalScore}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Join Date</span>
              <span className="font-bold">{profile.joinDate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Wallet Address</span>
              <span className="font-bold text-sm">{profile.address}</span>
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
    </div>
  );
}