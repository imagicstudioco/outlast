const express = require('express');
const router = express.Router();

// Mock finalists data based on your JSON file
const mockFinalists = [
  {
    id: "1",
    username: "@stokecity"
  },
  {
    id: "2", 
    username: "@baronmeyang"
  },
  {
    id: "3",
    username: "@glowry"
  },
  {
    id: "4",
    username: "@supersia"
  },
  {
    id: "5",
    username: "@lianta"
  },
  {
    id: "6",
    username: "@rafikithefirst"
  }
];

// Get finalists list - using mock data to bypass Firebase issues
router.get('/', async (req, res) => {
  try {
    console.log('📋 GET /finalists - Returning mock finalists data');
    console.log(`✅ Returning ${mockFinalists.length} finalists`);
    
    // Simulate a small delay to mimic database query
    await new Promise(resolve => setTimeout(resolve, 100));
    
    res.json(mockFinalists);
  } catch (error) {
    console.error('❌ Error in finalists route:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 