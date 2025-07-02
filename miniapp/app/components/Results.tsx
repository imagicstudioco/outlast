"use client";

import { useEffect, useState } from "react";
import { Card } from "./Card";
import { Button } from "./Button";
import { API_BACKEND_URL } from "../config";

interface VoteResults {
  results: Array<{
    username: string;
    id: string;
    votes: number;
  }>;
  totalVotes: number;
}

export const Results = () => {

  const [voteResults, setVoteResults] = useState<VoteResults | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVoteResults = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('📊 Fetching vote results...');
      const response = await fetch(`${API_BACKEND_URL}/api/voting/vote-results`);
      
      if (!response.ok) throw new Error("Failed to fetch vote results");

      const data = await response.json();
      console.log('✅ Vote results received:', data);
      setVoteResults(data);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      setError(errMsg);
      console.error('❌ Error fetching vote results:', errMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVoteResults();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Voting Results</h1>
        <p className="text-gray-600">
          See how the voting is going
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
            Error loading results
          </p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button
            onClick={fetchVoteResults}
            className="bg-red-500 hover:bg-red-600"
          >
            Retry
          </Button>
        </Card>
      )}

      {/* Results Content */}
      {!loading && !error && voteResults && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Current Results</h2>
            <div className="text-sm text-gray-600">
              Total Votes: {voteResults.totalVotes}
            </div>
          </div>
          
          {voteResults.results.length > 0 ? (
            <div className="space-y-4">
              {voteResults.results.map((result, index) => (
                <div
                  key={result.id}
                  className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-lg font-medium text-gray-900">
                      #{index + 1}
                    </span>
                    <span className="text-lg font-semibold">
                      {result.username}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-blue-600">
                      {result.votes} votes
                    </span>
                    {voteResults.totalVotes > 0 && (
                      <span className="text-sm text-gray-500">
                        ({((result.votes / voteResults.totalVotes) * 100).toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 text-lg mb-4">
                No votes have been cast yet
              </p>
              <p className="text-sm text-gray-500">
                Be the first to vote for your favorite finalist!
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};