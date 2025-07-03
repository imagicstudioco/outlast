const express = require('express');
const router = express.Router();
const { getCurrentVoting, castVote } = require('../controllers/votingController');

router.get('/', getCurrentVoting);
router.post('/vote', castVote);

module.exports = router;
