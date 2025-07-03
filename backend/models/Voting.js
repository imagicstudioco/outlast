const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
  voter: { type: String, required: true },      // voter's wallet address
  votedFor: { type: String, required: true },   // finalist's wallet address or ID
  timestamp: { type: Date, default: Date.now }
});

const VotingSchema = new mongoose.Schema({
  seasonId: { type: String, required: true },
  votes: [VoteSchema]
});

module.exports = mongoose.model('Voting', VotingSchema);
