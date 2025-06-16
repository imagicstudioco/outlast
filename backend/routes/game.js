const express = require('express');
const router = express.Router();
const { getGameStatus, updateGameStatus, getGameRules, updateGameRules } = require('../services/firebase');

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
    await updateGameStatus(status);
    res.json({ message: 'Game status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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
    await updateGameRules(rules);
    res.json({ message: 'Game rules updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 