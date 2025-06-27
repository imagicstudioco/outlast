"use client";

import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { Button } from "./Button";
import { Card } from "./Card";
import { Icon } from "./Icon";

interface Reward {
  id: string;
  type: 'daily' | 'weekly' | 'special';
  amount: number;
  status: 'pending' | 'claimed' | 'expired';
  timestamp: string;
  round: number;
}

interface DailyDraw {
  nextDraw: string;
  timeRemaining: string;
  prizePool: number;
  participants: number;
  lastWinner: {
    address: string;
    amount: number;
    timestamp: string;
  } | null;
}

interface RewardEligibility {
  isEligible: boolean;
  requiredVotes: number;
  currentVotes: number;
  lastClaimDate: string | null;
  nextClaimDate: string | null;
}

interface UserProfile {
  address: string;
  name: string;
  joinDate: string;
  status: 'active' | 'eliminated';
  currentRank: number;
  totalScore: number;
}

export function RewardPage() {
  const { address, isConnected } = useAccount();
  const [profile] = useState<UserProfile | null>(null);
  const [rewards] = useState<Reward[]>([]);
  const [dailyDraw] = useState<DailyDraw>({
    nextDraw: "",
    timeRemaining: "00:00:00",
    prizePool: 0,
    participants: 0,
    lastWinner: null
  });
  const [eligibility] = useState<RewardEligibility>({
    isEligible: false,
    requiredVotes: 0,
    currentVotes: 0,
    lastClaimDate: null,
    nextClaimDate: null
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

  useEffect(() => {
    // TODO: Fetch rewards data
    const fetchRewardsData = async () => {
      try {
        // Add your API calls here
      } catch (error) {
        console.error("Error fetching rewards data:", error);
      }
    };

    if (isConnected && address) {
      fetchRewardsData();
    }
  }, [isConnected, address]);

  useEffect(() => {
    // Timer countdown logic
    const timer = setInterval(() => {
      // TODO: Implement actual timer logic
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 text-center">
          <h2 className="text-2xl font-semibold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-4">Please connect your wallet to view rewards</p>
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
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Rewards</h1>
        <p className="text-gray-600">Claim your rewards and check daily draws</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Draw Information */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Daily Draw</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Next Draw</span>
              <span className="font-bold">{dailyDraw.nextDraw}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Time Remaining</span>
              <div className="flex items-center space-x-2">
                <Icon name="star" className="w-5 h-5" />
                <span className="font-bold">{dailyDraw.timeRemaining}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Prize Pool</span>
              <span className="font-bold">{dailyDraw.prizePool} ETH</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Participants</span>
              <span className="font-bold">{dailyDraw.participants}</span>
            </div>
            {dailyDraw.lastWinner && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">Last Winner</h3>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">{dailyDraw.lastWinner.address}</p>
                  <p className="font-bold">{dailyDraw.lastWinner.amount} ETH</p>
                  <p className="text-sm text-gray-500">{dailyDraw.lastWinner.timestamp}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Reward Eligibility */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Your Eligibility</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Status</span>
              <span className={`font-bold ${
                eligibility.isEligible ? 'text-green-500' : 'text-yellow-500'
              }`}>
                {eligibility.isEligible ? 'Eligible' : 'Not Eligible'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Votes Required</span>
              <span className="font-bold">{eligibility.requiredVotes}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Your Votes</span>
              <span className="font-bold">{eligibility.currentVotes}</span>
            </div>
            {eligibility.lastClaimDate && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Last Claim</span>
                <span className="font-bold">{eligibility.lastClaimDate}</span>
              </div>
            )}
            {eligibility.nextClaimDate && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Next Claim</span>
                <span className="font-bold">{eligibility.nextClaimDate}</span>
              </div>
            )}
            <Button
              className="w-full mt-4"
              disabled={!eligibility.isEligible}
            >
              Claim Rewards
            </Button>
          </div>
        </Card>

        {/* Reward History */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-2xl font-semibold mb-4">Reward History</h2>
          <div className="space-y-4">
            {rewards.length > 0 ? (
              rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold capitalize">{reward.type} Reward</h3>
                      <p className="text-sm text-gray-500">Round {reward.round}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{reward.amount} ETH</p>
                      <p className={`text-sm ${
                        reward.status === 'claimed' ? 'text-green-500' :
                        reward.status === 'expired' ? 'text-red-500' :
                        'text-yellow-500'
                      }`}>
                        {reward.status.charAt(0).toUpperCase() + reward.status.slice(1)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{reward.timestamp}</p>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-600">No reward history available</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}