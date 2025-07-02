const { db, admin } = require('../config/firebase');

// =========================
// Season Operations
// =========================

// Create a new season and archive the previous one
const createSeason = async (seasonId, seasonData) => {
  try {
    const seasonRef = db.collection('seasons').doc(seasonId);
    await seasonRef.set({
      ...seasonData,
      status: 'active',
      createdAt: new Date()
    });

    const globalRef = db.collection('global').doc('currentSeason');
    const currentDoc = await globalRef.get();

    if (currentDoc.exists) {
      const previousSeasonId = currentDoc.data().seasonId;
      if (previousSeasonId) {
        const prevSeasonRef = db.collection('seasons').doc(previousSeasonId);
        await prevSeasonRef.update({ status: 'archived' });
      }
    }

    await globalRef.set({ seasonId }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error creating new season:', error);
    throw error;
  }
};

// Get the current active season ID
const getCurrentSeasonId = async () => {
  const globalRef = db.collection('global').doc('currentSeason');
  const doc = await globalRef.get();
  return doc.exists ? doc.data().seasonId : null;
};

// =========================
// Game Status Operations
// =========================

const getGameStatus = async () => {
  const seasonId = await getCurrentSeasonId();
  const ref = db.collection('seasons').doc(seasonId).collection('gameStatus').doc('current');
  const doc = await ref.get();
  return doc.exists ? doc.data() : null;
};

const updateGameStatus = async (status) => {
  const seasonId = await getCurrentSeasonId();
  const ref = db.collection('seasons').doc(seasonId).collection('gameStatus').doc('current');
  await ref.set(status, { merge: true });
  return true;
};

// =========================
// Voting Operations
// =========================

const getVotingData = async () => {
  const seasonId = await getCurrentSeasonId();
  const ref = db.collection('seasons').doc(seasonId).collection('voting').doc('current');
  const doc = await ref.get();
  return doc.exists ? doc.data() : null;
};

const submitVote = async (voterId, votedForId) => {
  try {
    const seasonId = await getCurrentSeasonId();
    const ref = db.collection('seasons').doc(seasonId).collection('voting').doc('current');
    await ref.update({
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

// =========================
// Leaderboard Operations
// =========================

const getLeaderboard = async () => {
  const seasonId = await getCurrentSeasonId();
  const ref = db.collection('seasons').doc(seasonId).collection('leaderboard');
  const snapshot = await ref.orderBy('score', 'desc').limit(100).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const updatePlayerScore = async (playerId, score) => {
  const seasonId = await getCurrentSeasonId();
  const ref = db.collection('seasons').doc(seasonId).collection('leaderboard').doc(playerId);
  await ref.set({ score }, { merge: true });
  return true;
};

// =========================
// Profile Operations (Global)
// =========================

const getPlayerProfile = async (playerId) => {
  const ref = db.collection('profiles').doc(playerId);
  const doc = await ref.get();
  return doc.exists ? doc.data() : null;
};

const updatePlayerProfile = async (playerId, profileData) => {
  const ref = db.collection('profiles').doc(playerId);
  await ref.set(profileData, { merge: true });
  return true;
};

// =========================
// Rewards Operations
// =========================

const getRewardsData = async () => {
  const seasonId = await getCurrentSeasonId();
  const ref = db.collection('seasons').doc(seasonId).collection('rewards').doc('current');
  const doc = await ref.get();
  return doc.exists ? doc.data() : null;
};

const updateRewardsData = async (rewardsData) => {
  const seasonId = await getCurrentSeasonId();
  const ref = db.collection('seasons').doc(seasonId).collection('rewards').doc('current');
  await ref.set(rewardsData, { merge: true });
  return true;
};

// =========================
// Game Rules Operations
// =========================

const getGameRules = async () => {
  const seasonId = await getCurrentSeasonId();
  const ref = db.collection('seasons').doc(seasonId).collection('gameRules').doc('current');
  const doc = await ref.get();
  return doc.exists ? doc.data() : null;
};

const updateGameRules = async (rules) => {
  const seasonId = await getCurrentSeasonId();
  const ref = db.collection('seasons').doc(seasonId).collection('gameRules').doc('current');
  await ref.set(rules, { merge: true });
  return true;
};

// =========================
// Finalists Operations
// =========================

const getFinalistsList = async () => {
  try {
    // Get current season ID
    const seasonId = await getCurrentSeasonId();
    if (!seasonId) {
      console.log('No active season found');
      return [];
    }
    
    // Fetch from season-based finalists collection
    const ref = db.collection('seasons').doc(seasonId).collection('finalists');
    const snapshot = await ref.get();
    
    if (snapshot.empty) {
      console.log('No finalists found in current season');
      return [];
    }
    
    const finalists = snapshot.docs.map(doc => ({
      id: doc.id,
      username: doc.data().username,
      fid: doc.data().fid // This contains the image URL based on the JSON structure
    }));
    
    console.log(`Found ${finalists.length} finalists:`, finalists);
    return finalists;
  } catch (error) {
    console.error('Error fetching finalists list:', error);
    throw error;
  }
};

const getVoteResults = async () => {
  try {
    const seasonId = await getCurrentSeasonId();
    if (!seasonId) {
      return { results: [], totalVotes: 0 };
    }
    
    const votingRef = db.collection('seasons').doc(seasonId).collection('voting').doc('current');
    const votingDoc = await votingRef.get();
    
    if (!votingDoc.exists) {
      return { results: [], totalVotes: 0 };
    }
    
    const votingData = votingDoc.data();
    const votes = votingData.votes || [];
    
    // Count votes for each finalist
    const voteCounts = {};
    votes.forEach(vote => {
      voteCounts[vote.votedForId] = (voteCounts[vote.votedForId] || 0) + 1;
    });
    
    // Get finalists to map IDs to usernames
    const finalistsRef = db.collection('seasons').doc(seasonId).collection('finalists');
    const finalistsSnapshot = await finalistsRef.get();
    const finalistsMap = {};
    
    finalistsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      finalistsMap[doc.id] = data.username; // Use document ID as key
    });
    
    // Create results array
    const results = Object.entries(voteCounts).map(([id, count]) => ({
      username: finalistsMap[id] || 'Unknown',
      id: id,
      votes: count
    })).sort((a, b) => b.votes - a.votes);
    
    return {
      results,
      totalVotes: votes.length
    };
  } catch (error) {
    console.error('Error fetching vote results:', error);
    throw error;
  }
};

// =========================
// Exports
// =========================

module.exports = {
  // Season
  createSeason,
  getCurrentSeasonId,

  // Game Status
  getGameStatus,
  updateGameStatus,

  // Voting
  getVotingData,
  submitVote,

  // Leaderboard
  getLeaderboard,
  updatePlayerScore,

  // Profiles
  getPlayerProfile,
  updatePlayerProfile,

  // Rewards
  getRewardsData,
  updateRewardsData,

  // Game Rules
  getGameRules,
  updateGameRules,

  // Finalists
  getFinalistsList,

  // Vote Results
  getVoteResults
};
