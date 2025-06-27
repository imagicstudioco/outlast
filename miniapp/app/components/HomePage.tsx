"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
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

export const HomePage = ({ setActiveTabAction }: HomeProps) => {
  const { isConnected } = useAccount();

  const [gameStatus, setGameStatus] = useState<GameStatus | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGameData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, leaderboardRes] = await Promise.all([
        fetch(`${API_BACKEND_URL}/api/game/status`),
        fetch(`${API_BACKEND_URL}/api/leaderboard`),
      ]);

      if (!statusRes.ok) throw new Error("Failed to fetch game status");
      if (!leaderboardRes.ok) throw new Error("Failed to fetch leaderboard");

      const statusData = await statusRes.json();
      const leaderboardData = await leaderboardRes.json();

      setGameStatus(statusData);
      setLeaderboard(leaderboardData);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      setError(errMsg);
      console.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGameData();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Welcome To Outlast</h1>
        <p className="text-gray-600">
          The ultimate survival game on the blockchain
        </p>
      </div>

      {/* Loader */}
      {loading && (
        <Card className="p-6 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="p-6 text-center">
          <p className="text-red-500 font-semibold mb-2">
            Error loading game data
          </p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button
            onClick={fetchGameData}
            className="bg-red-500 hover:bg-red-600"
          >
            Retry
          </Button>
        </Card>
      )}

      {/* Main Content */}
      {!loading && !error && (
        <>
          {/* Game Status */}
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Current Game Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatusItem label="Round" value={gameStatus?.currentRound} />
              <StatusItem label="Players" value={gameStatus?.totalPlayers} />
              <StatusItem
                label="Time Remaining"
                value={gameStatus?.timeRemaining || "00:00:00"}
              />
              <StatusItem
                label="Status"
                value={gameStatus?.isActive ? "Active" : "Ended"}
              />
            </div>
          </Card>

          {/* Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Voting */}
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Voting</h2>
              <p className="text-gray-600 mb-4">
                Cast your vote for the next round
              </p>
              <Button
                onClick={() => setActiveTabAction("vote")}
                className="w-full"
              >
                Vote Now
              </Button>
            </Card>

            {/* Leaderboard */}
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Leaderboard</h2>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {leaderboard.length > 0 ? (
                  leaderboard.map((player, index) => (
                    <div
                      key={player.address}
                      className="flex justify-between items-center p-2 bg-gray-50 rounded"
                    >
                      <span className="font-medium truncate">
                        #{index + 1} {player.address.slice(0, 6)}...
                        {player.address.slice(-4)}
                      </span>
                      <span className="font-bold">{player.score} pts</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600">
                    No players on leaderboard yet
                  </p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Wallet Connection */}
      {!isConnected && (
        <Card className="p-6 text-center">
          <h2 className="text-2xl font-semibold mb-4">
            Connect Your Wallet
          </h2>
          <p className="text-gray-600 mb-4">
            Connect your wallet to start playing
          </p>
          <Button onClick={() => {}} className="w-full md:w-auto">
            Connect Wallet
          </Button>
        </Card>
      )}
    </div>
  );
};

/* 🔥 Helper Component for Status Display */
const StatusItem = ({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined;
}) => (
  <div className="text-center">
    <p className="text-gray-600">{label}</p>
    <p className="text-xl font-bold">{value ?? "N/A"}</p>
  </div>
);
