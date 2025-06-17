"use client";

import React, { useState, useEffect } from "react";
import { Button } from "./Button";
import { Card } from "./Card";
import mockData from "../data/mockData.json";

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

  useEffect(() => {
    // Transform mock data into the required format
    const currentRankings = mockData.leaderboard.currentSession.rankings;
    const allTimeRankings = mockData.leaderboard.allTime.rankings;

    // Transform rankings into participants
    const transformedParticipants: Participant[] = currentRankings.map((rank, index) => {
      const allTimeRank = allTimeRankings.find(r => r.wallet_address === rank.wallet_address);
      return {
        id: `participant_${index + 1}`,
        address: rank.wallet_address,
        name: `Player ${index + 1}`, // You might want to add names to your mock data
        rank: rank.rank,
        score: parseInt(rank.total_votes),
        wins: allTimeRank ? allTimeRank.sessions_won : 0,
        losses: 0, // You might want to add this to your mock data
        mvpCount: 0, // You might want to add this to your mock data
        history: [
          {
            round: 1,
            score: parseInt(rank.total_votes),
            rank: rank.rank
          }
        ]
      };
    });

    // Calculate statistics
    const totalParticipants = mockData.game.currentSession.total_players;
    const activeParticipants = mockData.game.currentSession.total_players - mockData.game.currentSession.eliminated_players;
    const scores = transformedParticipants.map(p => p.score);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const highestScore = Math.max(...scores);
    const totalRounds = mockData.game.currentSession.current_round;

    setParticipants(transformedParticipants);
    setStatistics({
      totalParticipants,
      averageScore: Math.round(averageScore),
      highestScore,
      totalRounds,
      activeParticipants
    });
  }, [timeFilter]);

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'text-yellow-500';
      case 2:
        return 'text-gray-400';
      case 3:
        return 'text-amber-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Leaderboard</h1>
        <div className="flex justify-center space-x-4">
          <Button
            onClick={() => setTimeFilter('all')}
            variant={timeFilter === 'all' ? 'primary' : 'secondary'}
          >
            All Time
          </Button>
          <Button
            onClick={() => setTimeFilter('week')}
            variant={timeFilter === 'week' ? 'primary' : 'secondary'}
          >
            This Week
          </Button>
          <Button
            onClick={() => setTimeFilter('month')}
            variant={timeFilter === 'month' ? 'primary' : 'secondary'}
          >
            This Month
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Rankings */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Live Rankings</h2>
            <div className="space-y-4">
              {participants.map((participant) => (
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
              ))}
            </div>
          </Card>
        </div>

        {/* Statistics Panel */}
        <div>
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Statistics</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Participants</span>
                <span className="font-bold">{statistics.totalParticipants}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active Participants</span>
                <span className="font-bold">{statistics.activeParticipants}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Average Score</span>
                <span className="font-bold">{statistics.averageScore}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Highest Score</span>
                <span className="font-bold">{statistics.highestScore}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Rounds</span>
                <span className="font-bold">{statistics.totalRounds}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Selected Participant Details */}
      {selectedParticipant && (
        <Card className="p-6 mt-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-semibold">{selectedParticipant.name}</h2>
              <p className="text-gray-500">{selectedParticipant.address}</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => setSelectedParticipant(null)}
            >
              Close
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Stats */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Current Stats</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Rank</span>
                  <span className="font-bold">#{selectedParticipant.rank}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Score</span>
                  <span className="font-bold">{selectedParticipant.score}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Wins</span>
                  <span className="font-bold">{selectedParticipant.wins}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Losses</span>
                  <span className="font-bold">{selectedParticipant.losses}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">MVP Count</span>
                  <span className="font-bold">{selectedParticipant.mvpCount}</span>
                </div>
              </div>
            </div>

            {/* Historical Rankings */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Historical Rankings</h3>
              <div className="space-y-2">
                {selectedParticipant.history.map((record) => (
                  <div
                    key={record.round}
                    className="flex justify-between items-center p-2 bg-gray-50 rounded"
                  >
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