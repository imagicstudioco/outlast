"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useSigner } from "wagmi";
import { Button } from "./Button";
import { Card } from "./Card";
import { Icon } from "./Icon";
import { ethers } from "ethers";
import OutlastGameABI from "../../../contracts/out/OutlastGame.sol/OutlastGame.json";

interface Participant {
  id: string;
  address: string;
  name: string;
  votes: number;
}

export function VotingPage() {
  const { address, isConnected } = useAccount();
  const { data: signer } = useSigner();
  const [timeRemaining, setTimeRemaining] = useState("00:00:00");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedMVP, setSelectedMVP] = useState<string | null>(null);
  const [selectedElimination, setSelectedElimination] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVotingData = async () => {
      try {
        const res = await fetch("/app/data/mockData.json");
        const data = await res.json();
        const candidates = data.voting.currentRound.candidates;
        setParticipants(
          candidates.map((c: any) => ({
            id: c.id,
            address: c.wallet_address,
            name: c.wallet_address,
            votes: c.votes,
          }))
        );
        const endTime = new Date(data.voting.currentRound.end_time).getTime();
        const updateTimer = () => {
          const now = Date.now();
          const diff = Math.max(0, endTime - now);
          const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
          const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
          const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
          setTimeRemaining(`${h}:${m}:${s}`);
        };
        updateTimer();
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
      } catch (err) {
        setError("Failed to load voting data");
      }
    };
    fetchVotingData();
  }, []);

  const handleVote = (type: 'mvp' | 'elimination', participantId: string) => {
    if (type === 'mvp') {
      setSelectedMVP(participantId);
    } else {
      setSelectedElimination(participantId);
    }
  };

  const handleSubmitVotes = async () => {
    if (!selectedMVP || !selectedElimination || !signer) return;
    setLoading(true);
    setError(null);
    try {
      const contract = new ethers.Contract(
        "0x60c5b60bb3352bd09663eb8ee13ce90b1b8086f6",
        OutlastGameABI.abi,
        signer
      );
      const mvp = participants.find((p) => p.id === selectedMVP);
      const elim = participants.find((p) => p.id === selectedElimination);
      if (!mvp || !elim) throw new Error("Invalid participant selection");
      const tx1 = await contract.castVote(mvp.id, 0);
      await tx1.wait();
      const tx2 = await contract.castVote(elim.id, 1);
      await tx2.wait();
      setShowConfirmation(true);
      setHasVoted(true);
    } catch (err: any) {
      setError(err.message || "Error submitting votes");
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 text-center">
          <h2 className="text-2xl font-semibold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-4">Please connect your wallet to participate in voting</p>
          <Button onClick={() => {/* TODO: Implement wallet connection */}}>
            Connect Wallet
          </Button>
        </Card>
      </div>
    );
  }

  if (hasVoted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 text-center">
          <h2 className="text-2xl font-semibold mb-4">Votes Submitted!</h2>
          <p className="text-gray-600 mb-4">Thank you for participating in today&apos;s voting</p>
          <Button onClick={() => setHasVoted(false)}>
            View Results
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Daily Voting</h1>
        <div className="flex items-center justify-center space-x-2 text-xl">
          <Icon name="star" className="w-6 h-6" />
          <span>Time Remaining: {timeRemaining}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* MVP Voting Section */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Vote for MVP</h2>
          <div className="space-y-4">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedMVP === participant.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => handleVote('mvp', participant.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{participant.name}</p>
                    <p className="text-sm text-gray-500">{participant.address}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{participant.votes} votes</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Elimination Voting Section */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Vote for Elimination</h2>
          <div className="space-y-4">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedElimination === participant.id
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-red-300'
                }`}
                onClick={() => handleVote('elimination', participant.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{participant.name}</p>
                    <p className="text-sm text-gray-500">{participant.address}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{participant.votes} votes</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Vote Confirmation */}
      {showConfirmation && (
        <Card className="p-6 mt-6">
          <h3 className="text-xl font-semibold mb-4">Confirm Your Votes</h3>
          <div className="space-y-2">
            <p>MVP: {participants.find(p => p.id === selectedMVP)?.name}</p>
            <p>Elimination: {participants.find(p => p.id === selectedElimination)?.name}</p>
          </div>
          <div className="flex space-x-4 mt-4">
            <Button onClick={() => setShowConfirmation(false)} variant="secondary">
              Edit Votes
            </Button>
            <Button onClick={handleSubmitVotes}>
              Confirm Votes
            </Button>
          </div>
        </Card>
      )}

      {/* Submit Button */}
      {!showConfirmation && (
        <div className="flex justify-center mt-6">
          <Button
            onClick={() => setShowConfirmation(true)}
            disabled={!selectedMVP || !selectedElimination}
            className="w-full md:w-auto"
          >
            Review Votes
          </Button>
        </div>
      )}

      {/* Loading and Error UI */}
      {loading && (
        <div className="flex justify-center mt-6">
          <p className="text-gray-600">Submitting votes...</p>
        </div>
      )}
      {error && (
        <div className="flex justify-center mt-6 text-red-500">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}