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

// GET vote results
exports.getVoteResults = async (req, res) => {
  try {
    const voting = await Voting.findOne({ seasonId: 'season_1' });

    if (!voting) {
      return res.json({ results: [], totalVotes: 0 });
    }

    const voteCounts = {};

    for (const vote of voting.votes) {
      if (!voteCounts[vote.votedFor]) {
        voteCounts[vote.votedFor] = 0;
      }
      voteCounts[vote.votedFor]++;
    }

    const results = Object.entries(voteCounts).map(([id, votes]) => ({
      id,
      username: id, // or replace with actual mapping if needed
      votes
    }));

    const totalVotes = voting.votes.length;

    res.json({ results, totalVotes });
  } catch (err) {
    console.error("❌ Error getting vote results:", err);
    res.status(500).json({ error: 'Server error' });
  }
};
