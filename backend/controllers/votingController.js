const Voting = require('../models/Voting');

// GET voting data
exports.getCurrentVoting = async (req, res) => {
  try {
    const voting = await Voting.findOne({ seasonId: 'season_1' });
    res.json(voting || { votes: [] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// POST a new vote (this is the function you asked about)
exports.castVote = async (req, res) => {
  try {
    const { voter, votedFor } = req.body;

    if (!voter || !votedFor) {
      return res.status(400).json({ error: 'Both voter and votedFor are required' });
    }

    const existingVote = await Voting.findOne({
      seasonId: 'season_1',
      'votes.voter': voter
    });

    if (existingVote) {
      return res.status(400).json({ error: 'This wallet has already voted in this season.' });
    }

    let voting = await Voting.findOne({ seasonId: 'season_1' });

    if (!voting) {
      voting = new Voting({ seasonId: 'season_1', votes: [] });
    }

    voting.votes.push({ voter, votedFor });
    await voting.save();

    res.json({ message: '✅ Vote recorded successfully', vote: { voter, votedFor } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
