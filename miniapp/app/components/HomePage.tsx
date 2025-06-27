"use client";

import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { Button } from "./Button";
import { Card } from "./Card";
import { API_BACKEND_URL } from "../config";

interface LeaderboardPlayer {
  address: string;
  score: number;
}

interface GameStatus {
  currentRound: number;
  totalPlayers: number;
  timeRemaining: string;
  isActive: boolean;
}

interface HomeProps {
  setActiveTabAction: (tab: string) => void;
}


export const HomePage: React.FC<HomeProps> = ({ setActiveTabAction }) => {
  const { isConnected } = useAccount();
  const router = useRouter();
  const [gameStatus, setGameStatus] = useState<GameStatus | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGameData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch game status and leaderboard data from backend API
        const [statusRes, leaderboardRes] = await Promise.all([
          fetch(`${API_BACKEND_URL}/api/game/status`),
          fetch(`${API_BACKEND_URL}/api/leaderboard`),
        ]);
        
        if (!statusRes.ok || !leaderboardRes.ok) {
          throw new Error("Failed to fetch data from server");
        }
        
        const statusData = await statusRes.json();
        const leaderboardData = await leaderboardRes.json();

        setGameStatus(statusData);
        setLeaderboard(leaderboardData);
      } catch (err: any) {
        setError(err.message || "Unknown error occurred");
        console.error("Error fetching game data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGameData();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Welcome To Outlast</h1>
        <p className="text-gray-600">The ultimate survival game on the blockchain</p>
      </div>

      {loading ? (
        <Card className="p-6 text-center">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </Card>
      ) : error ? (
        <Card className="p-6 text-center">
          <div className="text-red-500 mb-4">
            <p className="font-semibold">Error loading game data</p>
            <p className="text-sm">{error}</p>
          </div>
          <Button 
            onClick={() => window.location.reload()}
            className="bg-red-500 hover:bg-red-600"
          >
            Retry
          </Button>
        </Card>
      ) : (
        <>
          {/* Game Status Section */}
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Current Game Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-gray-600">Round</p>
                <p className="text-xl font-bold">{gameStatus?.currentRound || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-600">Players</p>
                <p className="text-xl font-bold">{gameStatus?.totalPlayers || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-600">Time Remaining</p>
                <p className="text-xl font-bold">{gameStatus?.timeRemaining || "00:00:00"}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-600">Status</p>
                <p className="text-xl font-bold">{gameStatus?.isActive ? "Active" : "Ended"}</p>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Voting</h2>
              <p className="text-gray-600 mb-4">Cast your vote for the next round</p>
              <Button 
                onClick={() => setActiveTabAction('vote')}
                className="w-full"
              >
                Vote Now
              </Button>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Leaderboard</h2>
              <div className="space-y-2">
                {leaderboard.length > 0 ? (
                  leaderboard.map((player, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="font-medium">#{index + 1} {player.address}</span>
                      <span className="font-bold">{player.score} points</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600">No players on leaderboard yet</p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Connect Wallet Section */}
      {!isConnected && (
        <Card className="p-6 text-center">
          <h2 className="text-2xl font-semibold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-4">Connect your wallet to start playing</p>
          <Button 
            onClick={() => {/* TODO: Implement wallet connection */}}
            className="w-full md:w-auto"
          >
            Connect Wallet
          </Button>
        </Card>
      )}
    </div>
  );
}