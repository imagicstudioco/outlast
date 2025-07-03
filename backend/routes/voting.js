const express = require('express');
const router = express.Router();
const { getCurrentVoting, castVote, getVoteResults   } = require('../controllers/votingController');

router.get('/', getCurrentVoting);
router.post('/vote', castVote);
router.get('/vote-results', getVoteResults); 


module.exports = router;
