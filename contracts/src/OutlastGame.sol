// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract OutlastGame is Ownable {
    enum Status { Active, Eliminated, Winner }
    enum VoteType { MVP, Eliminate }

    struct Participant {
        address wallet;
        Status status;
        uint256 mvpCount;
        uint256 consistencyStreak;
        uint256 lastVotedRound;
        uint256 immunityUntilRound;
    }

    struct Vote {
        address voter;
        uint256 participantId;
        VoteType voteType;
        uint256 round;
    }

    IERC721 public eligibilityNFT;
    uint256 public currentRound;
    uint256 public votingWindow = 12 hours;
    uint256 public roundStartTime;
    bool public gameActive;

    mapping(uint256 => Participant) public participants;
    mapping(address => uint256) public participantIds; // wallet => participantId
    uint256 public participantCount;

    // round => participantId => vote count
    mapping(uint256 => mapping(uint256 => uint256)) public mvpVotes;
    mapping(uint256 => mapping(uint256 => uint256)) public eliminateVotes;
    // round => voter => bool
    mapping(uint256 => mapping(address => bool)) public hasVotedMVP;
    mapping(uint256 => mapping(address => bool)) public hasVotedEliminate;

    // Events
    event ParticipantJoined(address indexed wallet, uint256 participantId);
    event VoteCast(address indexed voter, uint256 indexed participantId, VoteType voteType, uint256 round);
    event RoundEnded(uint256 round, uint256 eliminatedId, uint256 mvpId);
    event RewardDistributed(address indexed to, uint256 amount);
    event GameStarted(uint256 startTime);
    event GameEnded(uint256 endTime);

    modifier onlyEligible() {
        require(eligibilityNFT.balanceOf(msg.sender) > 0, "Not eligible (no NFT)");
        _;
    }

    modifier onlyActiveGame() {
        require(gameActive, "Game not active");
        _;
    }

    constructor(address _nft) Ownable(msg.sender) {
        eligibilityNFT = IERC721(_nft);
    }

    function joinGame() external onlyEligible onlyActiveGame {
        require(participantIds[msg.sender] == 0, "Already joined");
        participantCount++;
        participants[participantCount] = Participant({
            wallet: msg.sender,
            status: Status.Active,
            mvpCount: 0,
            consistencyStreak: 0,
            lastVotedRound: 0,
            immunityUntilRound: 0
        });
        participantIds[msg.sender] = participantCount;
        emit ParticipantJoined(msg.sender, participantCount);
    }

    function startGame() external onlyOwner {
        require(!gameActive, "Already started");
        gameActive = true;
        currentRound = 1;
        roundStartTime = block.timestamp;
        emit GameStarted(block.timestamp);
    }

    function endGame() external onlyOwner onlyActiveGame {
        gameActive = false;
        emit GameEnded(block.timestamp);
    }

    function castVote(uint256 participantId, VoteType voteType) external onlyEligible onlyActiveGame {
        require(block.timestamp < roundStartTime + votingWindow, "Voting window closed");
        require(participants[participantId].status == Status.Active, "Target not active");
        uint256 myId = participantIds[msg.sender];
        require(myId != 0, "Not a participant");
        require(participants[myId].status == Status.Active, "You are not active");
        if (voteType == VoteType.MVP) {
            require(!hasVotedMVP[currentRound][msg.sender], "Already voted MVP");
            mvpVotes[currentRound][participantId]++;
            hasVotedMVP[currentRound][msg.sender] = true;
        } else {
            require(!hasVotedEliminate[currentRound][msg.sender], "Already voted Eliminate");
            eliminateVotes[currentRound][participantId]++;
            hasVotedEliminate[currentRound][msg.sender] = true;
        }
        participants[myId].lastVotedRound = currentRound;
        emit VoteCast(msg.sender, participantId, voteType, currentRound);
    }

    function endRoundAndEliminate() external onlyOwner onlyActiveGame {
        require(block.timestamp >= roundStartTime + votingWindow, "Voting window not ended");
        // Find MVP (most MVP votes)
        uint256 mvpId = 0;
        uint256 maxMvpVotes = 0;
        for (uint256 i = 1; i <= participantCount; i++) {
            if (participants[i].status == Status.Active && mvpVotes[currentRound][i] > maxMvpVotes) {
                maxMvpVotes = mvpVotes[currentRound][i];
                mvpId = i;
            }
        }
        // Find Elimination (most eliminate votes, not MVP)
        uint256 eliminatedId = 0;
        uint256 maxElimVotes = 0;
        for (uint256 i = 1; i <= participantCount; i++) {
            if (
                participants[i].status == Status.Active &&
                i != mvpId &&
                eliminateVotes[currentRound][i] > maxElimVotes
            ) {
                maxElimVotes = eliminateVotes[currentRound][i];
                eliminatedId = i;
            }
        }
        // Tie-breaker (random selection among tied)
        if (eliminatedId == 0 && maxElimVotes > 0) {
            uint256[] memory tied;
            uint256 count = 0;
            for (uint256 i = 1; i <= participantCount; i++) {
                if (
                    participants[i].status == Status.Active &&
                    i != mvpId &&
                    eliminateVotes[currentRound][i] == maxElimVotes
                ) {
                    count++;
                }
            }
            tied = new uint256[](count);
            count = 0;
            for (uint256 i = 1; i <= participantCount; i++) {
                if (
                    participants[i].status == Status.Active &&
                    i != mvpId &&
                    eliminateVotes[currentRound][i] == maxElimVotes
                ) {
                    tied[count++] = i;
                }
            }
            if (count > 0) {
                // Pseudo-random (not secure, but deterministic for demo)
                eliminatedId = tied[uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao))) % count];
            }
        }
        // Apply elimination and MVP immunity
        if (mvpId != 0) {
            participants[mvpId].mvpCount++;
            participants[mvpId].immunityUntilRound = currentRound + 1;
        }
        if (eliminatedId != 0) {
            participants[eliminatedId].status = Status.Eliminated;
        }
        emit RoundEnded(currentRound, eliminatedId, mvpId);
        // Prepare next round
        currentRound++;
        roundStartTime = block.timestamp;
    }

    function distributeReward(address to, uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient balance");
        (bool sent, ) = to.call{value: amount}("");
        require(sent, "Failed to send reward");
        emit RewardDistributed(to, amount);
    }

    // Allow contract to receive ETH
    receive() external payable {}
} 