const express = require('express');
const router = express.Router();
const { getCurrentVoting, castVote, getVoteResults, checkVoteStatus } = require('../controllers/votingController');

router.get('/', getCurrentVoting);
router.post('/vote', castVote);
router.get('/vote-results', getVoteResults);
router.post('/status', checkVoteStatus); // New route for checking vote status

module.exports = router;