const { db } = require('../config/firebase');

// Game Status Operations
const getGameStatus = async () => {
  try {
    const gameStatusRef = db.collection('gameStatus').doc('current');
    const doc = await gameStatusRef.get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    console.error('Error getting game status:', error);
    throw error;
  }
};

const updateGameStatus = async (status) => {
  try {
    const gameStatusRef = db.collection('gameStatus').doc('current');
    await gameStatusRef.set(status, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating game status:', error);
    throw error;
  }
};

// Voting Operations
const getVotingData = async () => {
  try {
    const votingRef = db.collection('voting').doc('current');
    const doc = await votingRef.get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    console.error('Error getting voting data:', error);
    throw error;
  }
};

const submitVote = async (voterId, votedForId) => {
  try {
    const votingRef = db.collection('voting').doc('current');
    await votingRef.update({
      votes: admin.firestore.FieldValue.arrayUnion({
        voterId,
        votedForId,
        timestamp: new Date()
      })
    });
    return true;
  } catch (error) {
    console.error('Error submitting vote:', error);
    throw error;
  }
};

// Leaderboard Operations
const getLeaderboard = async () => {
  try {
    const leaderboardRef = db.collection('leaderboard');
    const snapshot = await leaderboardRef.orderBy('score', 'desc').limit(100).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    throw error;
  }
};

const updatePlayerScore = async (playerId, score) => {
  try {
    const playerRef = db.collection('leaderboard').doc(playerId);
    await playerRef.set({ score }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating player score:', error);
    throw error;
  }
};

// Profile Operations
const getPlayerProfile = async (playerId) => {
  try {
    const profileRef = db.collection('profiles').doc(playerId);
    const doc = await profileRef.get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    console.error('Error getting player profile:', error);
    throw error;
  }
};

const updatePlayerProfile = async (playerId, profileData) => {
  try {
    const profileRef = db.collection('profiles').doc(playerId);
    await profileRef.set(profileData, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating player profile:', error);
    throw error;
  }
};

// Rewards Operations
const getRewardsData = async () => {
  try {
    const rewardsRef = db.collection('rewards').doc('current');
    const doc = await rewardsRef.get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    console.error('Error getting rewards data:', error);
    throw error;
  }
};

const updateRewardsData = async (rewardsData) => {
  try {
    const rewardsRef = db.collection('rewards').doc('current');
    await rewardsRef.set(rewardsData, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating rewards data:', error);
    throw error;
  }
};

// Game Rules Operations
const getGameRules = async () => {
  try {
    const rulesRef = db.collection('gameRules').doc('current');
    const doc = await rulesRef.get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    console.error('Error getting game rules:', error);
    throw error;
  }
};

const updateGameRules = async (rules) => {
  try {
    const rulesRef = db.collection('gameRules').doc('current');
    await rulesRef.set(rules, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating game rules:', error);
    throw error;
  }
};

module.exports = {
  getGameStatus,
  updateGameStatus,
  getVotingData,
  submitVote,
  getLeaderboard,
  updatePlayerScore,
  getPlayerProfile,
  updatePlayerProfile,
  getRewardsData,
  updateRewardsData,
  getGameRules,
  updateGameRules
}; 