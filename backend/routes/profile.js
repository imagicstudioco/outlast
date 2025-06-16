const express = require('express');
const router = express.Router();
const { getPlayerProfile, updatePlayerProfile } = require('../services/firebase');

// Get player profile
router.get('/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const profile = await getPlayerProfile(playerId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update player profile
router.put('/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const profileData = req.body;
    await updatePlayerProfile(playerId, profileData);
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 