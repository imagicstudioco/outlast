const express = require('express');
const router = express.Router();
const { getVotingData, submitVote } = require('../services/firebase');

// Get current voting data
router.get('/', async (req, res) => {
  try {
    const votingData = await getVotingData();
    res.json(votingData);
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
    await submitVote(voterId, votedForId);
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

    await submitVote(voterId, votedForId);
    
    res.json({ 
      message: 'Vote submitted successfully',
      votedFor: username
    });
  } catch (error) {
    console.error('Error submitting vote:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 