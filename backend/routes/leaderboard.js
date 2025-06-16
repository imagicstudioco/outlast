const express = require('express');
const router = express.Router();
const { getLeaderboard, updatePlayerScore } = require('../services/firebase');

// Get leaderboard
router.get('/', async (req, res) => {
  try {
    const leaderboard = await getLeaderboard();
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update player score
router.post('/update-score', async (req, res) => {
  try {
    const { playerId, score } = req.body;
    if (!playerId || score === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    await updatePlayerScore(playerId, score);
    res.json({ message: 'Player score updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 