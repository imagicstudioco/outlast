const { db } = require('../config/firebase');
const fs = require('fs');
const path = require('path');

// Load JSON data from the same folder
const dataPath = path.join(__dirname, 'finalists.json');
const users = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const seedFirestore = async () => {
  try {
    const seasonId = 'season_1';

    // ========== Global ==========
    await db.collection('global').doc('currentSeason').set({ seasonId });
    console.log(`✅ Set current season to ${seasonId}`);

    // ========== Seasons ==========
    const seasonRef = db.collection('seasons').doc(seasonId);
    await seasonRef.set({
      name: 'Season 1',
      description: 'First official season',
      status: 'active',
      createdAt: new Date()
    });
    console.log(`✅ Created season ${seasonId}`);

    // ========== Game Status ==========
    await seasonRef.collection('gameStatus').doc('current').set({
      isGameActive: false,
      round: 1,
      message: 'Game has not started yet'
    });
    console.log('✅ Game status added');

    // ========== Game Rules ==========
    await seasonRef.collection('gameRules').doc('current').set({
      maxPlayers: 10,
      roundTime: 60, // seconds
      pointsPerWin: 100,
      pointsPerVote: 10
    });
    console.log('✅ Game rules added');

    // ========== Voting ==========
    await seasonRef.collection('voting').doc('current').set({
      votes: []
    });
    console.log('✅ Voting initialized');

    // ========== Leaderboard ==========
    const leaderboardBatch = db.batch();
    users.forEach(user => {
      const playerRef = seasonRef.collection('leaderboard').doc(String(user.id));
      leaderboardBatch.set(playerRef, {
        username: user.username,
        fid: user.fid,
        score: 0 // Initial score
      });
    });
    await leaderboardBatch.commit();
    console.log('✅ Leaderboard populated');

    // ========== Finalists ==========
    const finalistsBatch = db.batch();
    users.forEach(user => {
      const finalistRef = seasonRef.collection('finalists').doc(String(user.id));
      finalistsBatch.set(finalistRef, {
        username: user.username,
        fid: user.fid
      });
    });
    await finalistsBatch.commit();
    console.log('✅ Finalists added');

    // ========== Rewards ==========
    await seasonRef.collection('rewards').doc('current').set({
      rewards: [
        { rank: 1, prize: 'Gold Trophy' },
        { rank: 2, prize: 'Silver Trophy' },
        { rank: 3, prize: 'Bronze Trophy' }
      ]
    });
    console.log('✅ Rewards added');

    // ========== Profiles ==========
    const profileBatch = db.batch();
    users.forEach(user => {
      const profileRef = db.collection('profiles').doc(String(user.id));
      profileBatch.set(profileRef, {
        username: user.username,
        fid: user.fid,
        walletAddress: '', // Optional, fill later
        email: ''          // Optional, fill later
      });
    });
    await profileBatch.commit();
    console.log('✅ Profiles created');

    console.log('🎉 Firestore seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding Firestore:', error);
  }
};

seedFirestore();
