"use client";

import React, { useState, useEffect } from "react";
import { Button } from "./Button";
import { Card } from "./Card";
import { API_BACKEND_URL } from "../config";

// Type for backend response
interface RawParticipant {
  address?: string;
  wallet_address?: string;
  name?: string;
  rank?: number;
  score?: number;
  total_votes?: number;
  wins?: number;
  losses?: number;
  mvpCount?: number;
  history?: {
    round: number;
    score: number;
    rank: number;
  }[];
}

// Final participant type used in app
interface Participant {
  id: string;
  address: string;
  name: string;
  rank: number;
  score: number;
  wins: number;
  losses: number;
  mvpCount: number;
  history: {
    round: number;
    score: number;
    rank: number;
  }[];
}

interface Statistics {
  totalParticipants: number;
  averageScore: number;
  highestScore: number;
  totalRounds: number;
  activeParticipants: number;
}

export function LeaderboardPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    totalParticipants: 0,
    averageScore: 0,
    highestScore: 0,
    totalRounds: 0,
    activeParticipants: 0,
  });
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BACKEND_URL}/api/leaderboard`);
        if (!response.ok) throw new Error("Failed to fetch leaderboard data");

        const leaderboardData = (await response.json()) as RawParticipant[];

        const transformedParticipants: Participant[] = leaderboardData.map((player, index) => ({
          id: `participant_${index + 1}`,
          address: String(player.address || player.wallet_address || `Player ${index + 1}`),
          name: String(player.name || `Player ${index + 1}`),
          rank: Number(player.rank || index + 1),
          score: Number(player.score || player.total_votes || 0),
          wins: Number(player.wins || 0),
          losses: Number(player.losses || 0),
          mvpCount: Number(player.mvpCount || 0),
          history: player.history || [
            {
              round: 1,
              score: Number(player.score || player.total_votes || 0),
              rank: Number(player.rank || index + 1)
            }
          ]
        }));

        const totalParticipants = transformedParticipants.length;
        const activeParticipants = transformedParticipants.filter(p => p.score > 0).length;
        const scores = transformedParticipants.map(p => p.score).filter(score => score > 0);
        const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
        const totalRounds = Math.max(...transformedParticipants.flatMap(p => p.history.map(h => h.round)), 1);

        setParticipants(transformedParticipants);
        setStatistics({
          totalParticipants,
          averageScore: Math.round(averageScore),
          highestScore,
          totalRounds,
          activeParticipants
        });
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
          console.error("Error fetching leaderboard data:", err);
        } else {
          setError("Unknown error occurred");
          console.error("Unexpected error:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboardData();
  }, [timeFilter]);

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-500';
      case 2: return 'text-gray-400';
      case 3: return 'text-amber-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in p-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Leaderboard</h1>
          <div className="flex justify-center space-x-4">
            <Button variant="secondary" disabled>All Time</Button>
            <Button variant="secondary" disabled>This Week</Button>
            <Button variant="secondary" disabled>This Month</Button>
          </div>
        </div>
        <Card className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in p-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Leaderboard</h1>
        </div>
        <Card className="p-6 text-center">
          <div className="text-red-500 mb-4">
            <p className="font-semibold">Error loading leaderboard</p>
            <p className="text-sm">{error}</p>
          </div>
          <Button 
            onClick={() => window.location.reload()}
            className="bg-red-500 hover:bg-red-600"
          >
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Leaderboard</h1>
        <div className="flex justify-center space-x-4">
          <Button onClick={() => setTimeFilter('all')} variant={timeFilter === 'all' ? 'primary' : 'secondary'}>All Time</Button>
          <Button onClick={() => setTimeFilter('week')} variant={timeFilter === 'week' ? 'primary' : 'secondary'}>This Week</Button>
          <Button onClick={() => setTimeFilter('month')} variant={timeFilter === 'month' ? 'primary' : 'secondary'}>This Month</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Live Rankings</h2>
            <div className="space-y-4">
              {participants.length > 0 ? participants.map(participant => (
                <div
                  key={participant.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedParticipant?.id === participant.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => setSelectedParticipant(participant)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className={`text-2xl font-bold ${getRankColor(participant.rank)}`}>
                        #{participant.rank}
                      </span>
                      <div>
                        <p className="font-medium">{participant.name}</p>
                        <p className="text-sm text-gray-500">{participant.address}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">{participant.score} pts</p>
                      <p className="text-sm text-gray-500">
                        {participant.wins}W / {participant.losses}L
                      </p>
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-center text-gray-600 py-6">No participants found</p>
              )}
            </div>
          </Card>
        </div>

        <div>
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Statistics</h2>
            <div className="space-y-4">
              <Stat label="Total Participants" value={statistics.totalParticipants} />
              <Stat label="Active Participants" value={statistics.activeParticipants} />
              <Stat label="Average Score" value={statistics.averageScore} />
              <Stat label="Highest Score" value={statistics.highestScore} />
              <Stat label="Total Rounds" value={statistics.totalRounds} />
            </div>
          </Card>
        </div>
      </div>

      {selectedParticipant && (
        <Card className="p-6 mt-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-semibold">{selectedParticipant.name}</h2>
              <p className="text-gray-500">{selectedParticipant.address}</p>
            </div>
            <Button variant="secondary" onClick={() => setSelectedParticipant(null)}>Close</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatBlock title="Current Stats" stats={[
              { label: "Rank", value: `#${selectedParticipant.rank}` },
              { label: "Score", value: selectedParticipant.score },
              { label: "Wins", value: selectedParticipant.wins },
              { label: "Losses", value: selectedParticipant.losses },
              { label: "MVP Count", value: selectedParticipant.mvpCount },
            ]} />
            <div>
              <h3 className="text-xl font-semibold mb-4">Historical Rankings</h3>
              <div className="space-y-2">
                {selectedParticipant.history.map((record) => (
                  <div key={record.round} className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">Round {record.round}</span>
                    <div className="text-right">
                      <p className="font-bold">#{record.rank}</p>
                      <p className="text-sm text-gray-500">{record.score} pts</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-600">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function StatBlock({ title, stats }: { title: string; stats: { label: string; value: string | number }[] }) {
  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <div className="space-y-2">
        {stats.map((s, idx) => (
          <div key={idx} className="flex justify-between">
            <span className="text-gray-600">{s.label}</span>
            <span className="font-bold">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
