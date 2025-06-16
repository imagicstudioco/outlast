"use client";

import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { Button } from "./Button";
import { Card } from "./Card";

export function HomePage() {
  const { isConnected } = useAccount();
  const [gameStatus] = useState({
    currentRound: 1,
    totalPlayers: 0,
    timeRemaining: "00:00:00",
    isActive: true
  });

  const [leaderboard] = useState([]);

  useEffect(() => {
    // TODO: Fetch game status and leaderboard data from your backend
    const fetchGameData = async () => {
      try {
        // Add your API calls here
      } catch (error) {
        console.error("Error fetching game data:", error);
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

      {/* Game Status Section */}
      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Current Game Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-gray-600">Round</p>
            <p className="text-xl font-bold">{gameStatus.currentRound}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-600">Players</p>
            <p className="text-xl font-bold">{gameStatus.totalPlayers}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-600">Time Remaining</p>
            <p className="text-xl font-bold">{gameStatus.timeRemaining}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-600">Status</p>
            <p className="text-xl font-bold">{gameStatus.isActive ? "Active" : "Ended"}</p>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Voting</h2>
          <p className="text-gray-600 mb-4">Cast your vote for the next round</p>
          <Button 
            onClick={() => {/* TODO: Implement voting navigation */}}
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
              <p className="text-gray-600">No data available</p>
            )}
          </div>
        </Card>
      </div>

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