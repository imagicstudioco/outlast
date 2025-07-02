"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "./Button";
import { Card } from "./Card";
import { API_BACKEND_URL } from "../config";

interface Finalist {
  username: string;
  fid: string;
}

interface HomePageProps {
  setActiveTabAction: (tab: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ setActiveTabAction }) => {
  const { isConnected } = useAccount();
  const [finalists, setFinalists] = useState<Finalist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFinalists = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BACKEND_URL}/finalists-list`);
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

  const handleVote = (username: string) => {
    console.log(`Voting for ${username}`);
    setActiveTabAction("results"); // switch tab to 'results' on vote
  };

  useEffect(() => {
    fetchFinalists();
  }, []);

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
                  key={finalist.fid}
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
                    onClick={() => handleVote(finalist.username)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2"
                  >
                    Vote
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
