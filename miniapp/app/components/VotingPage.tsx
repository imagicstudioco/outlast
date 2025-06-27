import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { useState, useEffect } from "react";
import { Button } from "./Button";
import { Card } from "./Card";
import OutlastGameABI from "../../../contracts/out/OutlastGame.sol/OutlastGame.json";
import { type Address } from "viem";
import { API_BACKEND_URL } from "../config";

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

interface UserVotes {
  [candidateId: number]: {
    mvp: boolean;
    elimination: boolean;
  };
}

interface VoteProps {
  setActiveTabAction: (tab: string) => void;
}

const CONTRACT_ADDRESS = "0x60c5b60bb3352bd09663eb8ee13ce90b1b8086f6" as Address;

export const VotingPage: React.FC<VoteProps> = ({ setActiveTabAction }) => {
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState<VotingRound | null>(null);
  const [voteLoading, setVoteLoading] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [userVotes, setUserVotes] = useState<UserVotes>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch voting data from backend API
        const response = await fetch(`${API_BACKEND_URL}/api/voting`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch voting data");
        }
        
        const votingData = await response.json();
        setCurrentRound(votingData);
        
        // Initialize user votes tracking
        const initialVotes: UserVotes = {};
        if (votingData.candidates) {
          votingData.candidates.forEach((candidate: Candidate) => {
            initialVotes[candidate.id] = {
              mvp: false,
              elimination: false
            };
          });
        }
        setUserVotes(initialVotes);
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
    if (!walletClient || !address || !publicClient) {
      setVoteError("Wallet not connected");
      return;
    }

    // Check if user has already voted for this candidate
    const voteTypeName = voteType === 0 ? 'mvp' : 'elimination';
    if (userVotes[participantId]?.[voteTypeName]) {
      setVoteError("You have already voted for this candidate");
      return;
    }

    setVoteLoading(true);
    setVoteError(null);
    
    try {
      // Call the smart contract
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: OutlastGameABI.abi,
        functionName: "castVote",
        args: [participantId, voteType],
      });
      
      console.log("Transaction hash:", hash);
      
      // Wait for transaction confirmation using public client
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      if (receipt.status === 'success') {
        // Update local vote tracking
        setUserVotes(prev => ({
          ...prev,
          [participantId]: {
            ...prev[participantId],
            [voteTypeName]: true
          }
        }));
        
        // Submit vote to backend for tracking
        try {
          await fetch(`${API_BACKEND_URL}/api/voting/submit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              voterId: address,
              votedForId: participantId,
              voteType: voteType
            }),
          });
        } catch (backendError) {
          console.error("Failed to submit vote to backend:", backendError);
          // Don't show error to user as smart contract transaction was successful
        }
        
        setVoteError(null);
      } else {
        throw new Error("Transaction failed");
      }
    } catch (error: unknown) {
      setVoteError("Voting failed. Please try again.");
      console.error("Error casting vote:", error);
    } finally {
      setVoteLoading(false);
    }
  };

  const hasVotedForCandidate = (candidateId: number, voteType: number) => {
    const voteTypeName = voteType === 0 ? 'mvp' : 'elimination';
    return userVotes[candidateId]?.[voteTypeName] || false;
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
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
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
          {currentRound.candidates && currentRound.candidates.length > 0 ? (
            currentRound.candidates.map((candidate) => (
              <div key={candidate.wallet_address} className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <span className="font-bold">{candidate.wallet_address}</span>
                  <div className="text-sm text-gray-500 mt-1">
                    {hasVotedForCandidate(candidate.id, 0) && (
                      <span className="text-green-600 mr-3">✓ Voted MVP</span>
                    )}
                    {hasVotedForCandidate(candidate.id, 1) && (
                      <span className="text-red-600">✓ Voted Elimination</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleVote(candidate.id, 0)}
                    disabled={
                      voteLoading || 
                      currentRound.status !== 'active' || 
                      hasVotedForCandidate(candidate.id, 0)
                    }
                    className={hasVotedForCandidate(candidate.id, 0) ? "bg-green-100 text-green-800" : ""}
                  >
                    {hasVotedForCandidate(candidate.id, 0) ? "Voted MVP" : "Vote MVP"}
                  </Button>
                  <Button
                    onClick={() => handleVote(candidate.id, 1)}
                    disabled={
                      voteLoading || 
                      currentRound.status !== 'active' || 
                      hasVotedForCandidate(candidate.id, 1)
                    }
                    variant="secondary"
                    className={hasVotedForCandidate(candidate.id, 1) ? "bg-red-100 text-red-800" : ""}
                  >
                    {hasVotedForCandidate(candidate.id, 1) ? "Voted Elimination" : "Vote Elimination"}
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No candidates available for voting</p>
            </div>
          )}
          
          {voteError && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {voteError}
            </div>
          )}
          
          {voteLoading && (
            <div className="mt-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
              Processing your vote...
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}