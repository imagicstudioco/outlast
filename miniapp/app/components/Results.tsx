"use client";

import { useEffect, useState } from "react";
import { Card } from "./Card";
import { Button } from "./Button";
import { API_BACKEND_URL } from "../config";

interface Finalist {
  _id: string;
  username: string;
}

interface VoteResults {
  results: Array<{
    id: string; // This should match _id of finalist
    votes: number;
  }>;
  totalVotes: number;
}

export const Results: React.FC = () => {
  const [finalists, setFinalists] = useState<Finalist[]>([]);
  const [voteResults, setVoteResults] = useState<VoteResults | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const [finalistsRes, votesRes] = await Promise.all([
        fetch(`${API_BACKEND_URL}/finalists`),
        fetch(`${API_BACKEND_URL}/api/voting/vote-results`)
      ]);

      if (!finalistsRes.ok || !votesRes.ok) throw new Error("Failed to fetch results");

      const finalistsData = await finalistsRes.json();
      const voteData = await votesRes.json();

      setFinalists(finalistsData);
      setVoteResults(voteData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      console.error("❌ Error fetching results:", msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const getFinalistsWithVotes = () => {
    if (!voteResults) return [];

    const voteMap = new Map(voteResults.results.map(r => [r.id, r.votes]));

    return finalists
      .map(finalist => ({
        ...finalist,
        votes: voteMap.get(finalist._id) || 0
      }))
      .sort((a, b) => b.votes - a.votes);
  };

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Voting Results</h1>
        <p className="text-gray-600">See how the voting is going</p>
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
          <p className="text-red-500 font-semibold mb-2">Error loading results</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button onClick={fetchResults} className="bg-red-500 hover:bg-red-600">
            Retry
          </Button>
        </Card>
      )}

      {/* Results */}
      {!loading && !error && voteResults && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Current Results</h2>
            <div className="text-sm text-gray-600">
              Total Votes: {voteResults.totalVotes}
            </div>
          </div>

          <div className="space-y-4">
            {getFinalistsWithVotes().map((finalist, index) => (
              <div
                key={finalist._id}
                className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center space-x-4">
                  <span className="text-lg font-medium text-gray-900">#{index + 1}</span>
                  <span className="text-lg font-semibold">{finalist.username}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-lg font-bold ${
                      finalist.votes > 0 ? "text-blue-600" : "text-gray-400"
                    }`}
                  >
                    {finalist.votes} votes
                  </span>
                  {voteResults.totalVotes > 0 && (
                    <span className="text-sm text-gray-500">
                      ({((finalist.votes / voteResults.totalVotes) * 100).toFixed(1)}%)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
