const express = require('express');
const router = express.Router();
const {
  getGameStatus,
  updateGameStatus,
  getGameRules,
  updateGameRules,
  createSeason,
  getCurrentSeasonId
} = require('../services/firebase');

// ===============================
// Game Status Endpoints
// ===============================

// Get current game status
router.get('/status', async (req, res) => {
  try {
    const status = await getGameStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update game status
router.post('/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Missing status data' });
    }
    await updateGameStatus(status);
    res.json({ message: 'Game status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// Game Rules Endpoints
// ===============================

// Get game rules
router.get('/rules', async (req, res) => {
  try {
    const rules = await getGameRules();
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update game rules
router.post('/rules', async (req, res) => {
  try {
    const { rules } = req.body;
    if (!rules) {
      return res.status(400).json({ error: 'Missing rules data' });
    }
    await updateGameRules(rules);
    res.json({ message: 'Game rules updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// Season Management (Optional)
// ===============================

// Create a new season
router.post('/season', async (req, res) => {
  try {
    const { seasonId, seasonData } = req.body;
    if (!seasonId || !seasonData) {
      return res.status(400).json({ error: 'Missing seasonId or seasonData' });
    }
    await createSeason(seasonId, seasonData);
    res.json({ message: 'Season created successfully', seasonId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current active season
router.get('/season', async (req, res) => {
  try {
    const seasonId = await getCurrentSeasonId();
    res.json({ currentSeason: seasonId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
