import { useAccount, useWalletClient } from "wagmi";
import { useState, useEffect } from "react";
import { Button } from "./Button";
import { Card } from "./Card";
import OutlastGameABI from "../../../contracts/out/OutlastGame.sol/OutlastGame.json";
import { type Address } from "viem";

interface Candidate {
  id: number;
  wallet_address: string;
}

interface VotingRound {
  round: number;
  candidates: Candidate[];
  status: 'active' | 'completed';
  startTime: string;
  endTime: string;
}

const CONTRACT_ADDRESS = "0x60c5b60bb3352bd09663eb8ee13ce90b1b8086f6" as Address;

export function VotingPage() {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState<VotingRound | null>(null);
  const [voteLoading, setVoteLoading] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/app/data/mockData.json");
        const data = await res.json();
        setCurrentRound(data.voting.currentRound);
      } catch (error: unknown) {
        setError("Failed to load voting data");
        console.error("Error loading voting data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleVote = async (participantId: number, voteType: number) => {
    if (!walletClient) {
      setVoteError("Wallet not connected");
      return;
    }

    setVoteLoading(true);
    setVoteError(null);
    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: OutlastGameABI.abi,
        functionName: "castVote",
        args: [participantId, voteType],
      });
      console.log("Transaction hash:", hash);
    } catch (error: unknown) {
      setVoteError("Voting failed");
      console.error("Error casting vote:", error);
    } finally {
      setVoteLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 text-center">
          <h2 className="text-2xl font-semibold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-4">Please connect your wallet to participate in voting</p>
          <Button onClick={() => {}}>Connect Wallet</Button>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 text-center">
          <h2 className="text-2xl font-semibold mb-4">Loading Voting Round...</h2>
          <p className="text-gray-600">Please wait while we fetch the current round data</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 text-center">
          <h2 className="text-2xl font-semibold mb-4">Error</h2>
          <p className="text-gray-600">{error}</p>
        </Card>
      </div>
    );
  }

  if (!currentRound) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 text-center">
          <h2 className="text-2xl font-semibold mb-4">No Active Round</h2>
          <p className="text-gray-600">There is no active voting round at the moment</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Round Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Round {currentRound.round}</h1>
        <p className="text-gray-600">
          {currentRound.status === 'active' ? 'Active Round' : 'Completed Round'}
        </p>
        <div className="flex justify-center gap-4 mt-2 text-sm text-gray-500">
          <span>Start: {currentRound.startTime}</span>
          <span>End: {currentRound.endTime}</span>
        </div>
      </div>

      {/* Candidates Voting */}
      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Vote for MVP or Elimination</h2>
        <div className="space-y-4">
          {currentRound.candidates.map((candidate) => (
            <div key={candidate.wallet_address} className="flex justify-between items-center">
              <span className="font-bold">{candidate.wallet_address}</span>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleVote(candidate.id, 0)}
                  disabled={voteLoading || currentRound.status !== 'active'}
                >
                  Vote MVP
                </Button>
                <Button
                  onClick={() => handleVote(candidate.id, 1)}
                  disabled={voteLoading || currentRound.status !== 'active'}
                  variant="secondary"
                >
                  Vote Elimination
                </Button>
              </div>
            </div>
          ))}
          {voteError && <p className="text-red-500">{voteError}</p>}
        </div>
      </Card>
    </div>
  );
}