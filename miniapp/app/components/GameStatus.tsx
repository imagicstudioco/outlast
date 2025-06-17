"use client";

import React, { useState, useEffect } from "react";
import { Card } from "./Card";
import { Icon } from "./Icon";
import mockData from "../data/mockData.json";

interface GameSession {
  currentRound: number;
  totalRounds: number;
  startTime: string;
  endTime: string;
  timeRemaining: string;
  status: 'active' | 'completed' | 'upcoming';
  totalParticipants: number;
  activeParticipants: number;
  prizePool: number;
}

interface Round {
  number: number;
  startTime: string;
  endTime: string;
  mvp: {
    address: string;
    score: number;
  };
  eliminated: {
    address: string;
    reason: string;
  };
  totalVotes: number;
  status: 'completed' | 'active' | 'upcoming';
}

interface GameRule {
  title: string;
  description: string;
  category: 'general' | 'voting' | 'rewards' | 'elimination';
}

export function GameStatus() {
  const [gameSession, setGameSession] = useState<GameSession>({
    currentRound: 0,
    totalRounds: 0,
    startTime: "",
    endTime: "",
    timeRemaining: "00:00:00",
    status: 'upcoming',
    totalParticipants: 0,
    activeParticipants: 0,
    prizePool: 0
  });
  const [rounds, setRounds] = useState<Round[]>([]);
  const [rules] = useState<GameRule[]>([
    {
      title: "Game Overview",
      description: "Outlast is a daily elimination game where participants vote for MVP and elimination. The last player standing wins the prize pool.",
      category: "general"
    },
    {
      title: "Voting Rules",
      description: "Each day, players must vote for one MVP and one player to eliminate. Votes are weighted based on player performance.",
      category: "voting"
    },
    {
      title: "Elimination Process",
      description: "The player with the most elimination votes is removed from the game. In case of a tie, the player with the lowest score is eliminated.",
      category: "elimination"
    },
    {
      title: "Rewards",
      description: "Winners receive the prize pool, distributed as follows: 1st place (50%), 2nd place (30%), 3rd place (20%).",
      category: "rewards"
    }
  ]);

  useEffect(() => {
    // Transform mock data into the required format
    const currentSession = mockData.game.currentSession;
    const transformedGameSession: GameSession = {
      currentRound: currentSession.current_round,
      totalRounds: 7, // Assuming 7 rounds per session
      startTime: currentSession.start_time,
      endTime: currentSession.end_time,
      timeRemaining: calculateTimeRemaining(currentSession.end_time),
      status: currentSession.status as 'active' | 'completed' | 'upcoming',
      totalParticipants: currentSession.total_players,
      activeParticipants: currentSession.total_players - currentSession.eliminated_players,
      prizePool: parseFloat(currentSession.prize_pool)
    };

    // Transform voting rounds data
    const transformedRounds: Round[] = mockData.voting.rounds.map(round => ({
      number: round.round_number,
      startTime: round.start_time,
      endTime: round.end_time,
      mvp: {
        address: round.candidates[0].wallet_address,
        score: round.candidates[0].votes
      },
      eliminated: {
        address: round.candidates[round.candidates.length - 1].wallet_address,
        reason: "Most elimination votes"
      },
      totalVotes: round.total_votes,
      status: round.status as 'completed' | 'active' | 'upcoming'
    }));

    setGameSession(transformedGameSession);
    setRounds(transformedRounds);
  }, []);

  useEffect(() => {
    // Timer countdown logic
    const timer = setInterval(() => {
      setGameSession(prev => ({
        ...prev,
        timeRemaining: calculateTimeRemaining(prev.endTime)
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const calculateTimeRemaining = (endTime: string): string => {
    const end = new Date(endTime).getTime();
    const now = new Date().getTime();
    const timeLeft = end - now;

    if (timeLeft <= 0) return "00:00:00";

    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-500';
      case 'completed':
        return 'text-blue-500';
      case 'upcoming':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Game Status</h1>
        <p className="text-gray-600">Current game session information and rules</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Game Session */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Current Session</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Status</span>
              <span className={`font-bold ${getStatusColor(gameSession.status)}`}>
                {gameSession.status.charAt(0).toUpperCase() + gameSession.status.slice(1)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Current Round</span>
              <span className="font-bold">{gameSession.currentRound} / {gameSession.totalRounds}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Time Remaining</span>
              <div className="flex items-center space-x-2">
                <Icon name="star" className="w-5 h-5" />
                <span className="font-bold">{gameSession.timeRemaining}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Active Participants</span>
              <span className="font-bold">{gameSession.activeParticipants} / {gameSession.totalParticipants}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Prize Pool</span>
              <span className="font-bold">{gameSession.prizePool} ETH</span>
            </div>
          </div>
        </Card>

        {/* Game Rules */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Game Rules</h2>
          <div className="space-y-4">
            {rules.map((rule, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">{rule.title}</h3>
                <p className="text-gray-600">{rule.description}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Round History */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-2xl font-semibold mb-4">Round History</h2>
          <div className="space-y-4">
            {rounds.length > 0 ? (
              rounds.map((round) => (
                <div
                  key={round.number}
                  className="p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Round {round.number}</h3>
                    <span className={`text-sm ${getStatusColor(round.status)}`}>
                      {round.status.charAt(0).toUpperCase() + round.status.slice(1)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-600 mb-2">MVP</h4>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">{round.mvp.address}</span>
                        <span className="font-bold">{round.mvp.score} pts</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-600 mb-2">Eliminated</h4>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">{round.eliminated.address}</span>
                        <span className="text-sm text-gray-500">{round.eliminated.reason}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
                    <span>Total Votes: {round.totalVotes}</span>
                    <span>{new Date(round.endTime).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-600">No round history available</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}