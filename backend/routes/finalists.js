const express = require('express');
const router = express.Router();
const { getFinalistsList } = require('../services/firebase');

// Get finalists list
router.get('/', async (req, res) => {
  try {
    console.log('📋 GET /finalists-list - Fetching finalists...');
    const finalists = await getFinalistsList();
    console.log(`✅ Found ${finalists.length} finalists`);
    res.json(finalists);
  } catch (error) {
    console.error('❌ Error fetching finalists:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 