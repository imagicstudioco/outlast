const express = require('express');
const router = express.Router();
const { getRewardsData, updateRewardsData } = require('../services/firebase');

// Get rewards data
router.get('/', async (req, res) => {
  try {
    const rewardsData = await getRewardsData();
    res.json(rewardsData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update rewards data
router.post('/', async (req, res) => {
  try {
    const rewardsData = req.body;
    await updateRewardsData(rewardsData);
    res.json({ message: 'Rewards data updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 