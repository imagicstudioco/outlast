const express = require('express');
const router = express.Router();

// In-memory storage for votes (in production, this would be a database)
let votes = [];
let voteResults = {};

// Mock finalists data (same as in finalists.js)
const mockFinalists = [
  { id: "1", username: "@stokecity" },
  { id: "2", username: "@baronmeyang" },
  { id: "3", username: "@glowry" },
  { id: "4", username: "@supersia" },
  { id: "5", username: "@lianta" },
  { id: "6", username: "@rafikithefirst" }
];

// Get current voting data
router.get('/', async (req, res) => {
  try {
    res.json({ votes, totalVotes: votes.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit a vote
router.post('/submit', async (req, res) => {
  try {
    const { voterId, votedForId } = req.body;
    if (!voterId || !votedForId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if user already voted
    const existingVote = votes.find(vote => vote.voterId === voterId);
    if (existingVote) {
      return res.status(400).json({ error: 'User has already voted' });
    }
    
    // Add vote
    const newVote = {
      voterId,
      votedForId,
      timestamp: new Date().toISOString()
    };
    votes.push(newVote);
    
    // Update vote results
    updateVoteResults();
    
    res.json({ message: 'Vote submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit vote for finalist
router.post('/submit-vote', async (req, res) => {
  try {
    const { voterId, votedForId, username } = req.body;
    
    if (!voterId || !votedForId || !username) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user already voted
    const existingVote = votes.find(vote => vote.voterId === voterId);
    if (existingVote) {
      return res.status(400).json({ error: 'User has already voted' });
    }
    
    // Add vote
    const newVote = {
      voterId,
      votedForId,
      username,
      timestamp: new Date().toISOString()
    };
    votes.push(newVote);
    
    // Update vote results
    updateVoteResults();
    
    console.log(`✅ Vote recorded for ${username} by ${voterId}`);
    
    res.json({ 
      message: 'Vote submitted successfully',
      votedFor: username
    });
  } catch (error) {
    console.error('❌ Error submitting vote:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get vote results
router.get('/vote-results', async (req, res) => {
  try {
    console.log('📊 GET /vote-results - Returning vote results');
    
    // Calculate results from votes
    const results = calculateVoteResults();
    
    res.json({
      results,
      totalVotes: votes.length
    });
  } catch (error) {
    console.error('❌ Error fetching vote results:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check if a user has voted
router.post('/check-vote-status', async (req, res) => {
  try {
    const { voterId } = req.body;
    
    if (!voterId) {
      return res.status(400).json({ error: 'Missing voterId' });
    }

    // Check if user has already voted
    const existingVote = votes.find(vote => vote.voterId === voterId);
    const hasVoted = !!existingVote;
    
    console.log(`🔍 Checking vote status for ${voterId}: ${hasVoted ? 'Has voted' : 'Has not voted'}`);
    
    res.json({ 
      hasVoted,
      votedFor: existingVote ? existingVote.username : null
    });
  } catch (error) {
    console.error('❌ Error checking vote status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reset votes (for testing)
router.post('/reset-votes', async (req, res) => {
  try {
    votes = [];
    voteResults = {};
    console.log('�� Votes reset');
    res.json({ message: 'Votes reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to update vote results
const updateVoteResults = () => {
  voteResults = calculateVoteResults();
};

// Helper function to calculate vote results
const calculateVoteResults = () => {
  const voteCounts = {};
  
  // Count votes for each finalist
  votes.forEach(vote => {
    voteCounts[vote.votedForId] = (voteCounts[vote.votedForId] || 0) + 1;
  });
  
  // Create results array with usernames
  const results = Object.entries(voteCounts).map(([id, count]) => {
    const finalist = mockFinalists.find(f => f.id === id);
    return {
      username: finalist ? finalist.username : 'Unknown',
      id: id,
      votes: count
    };
  }).sort((a, b) => b.votes - a.votes);
  
  return results;
};

module.exports = router;