const { db } = require('../config/firebase');

const seedFirestore = async () => {
  try {
    const seasonId = 'season_1';

    // ========== Global ==========

    const globalRef = db.collection('global').doc('currentSeason');
    await globalRef.set({ seasonId });

    console.log(`✅ Set current season to ${seasonId}`);

    // ========== Seasons Collection ==========

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

    const leaderboard = [
      { id: 'player1', name: 'Alice', score: 500 },
      { id: 'player2', name: 'Bob', score: 300 },
      { id: 'player3', name: 'Charlie', score: 200 }
    ];

    const leaderboardBatch = db.batch();
    leaderboard.forEach(player => {
      const playerRef = seasonRef.collection('leaderboard').doc(player.id);
      leaderboardBatch.set(playerRef, {
        name: player.name,
        score: player.score
      });
    });
    await leaderboardBatch.commit();

    console.log('✅ Leaderboard populated');

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

    const profiles = [
      {
        id: 'player1',
        name: 'Alice',
        walletAddress: '0xAliceWallet',
        email: 'alice@example.com'
      },
      {
        id: 'player2',
        name: 'Bob',
        walletAddress: '0xBobWallet',
        email: 'bob@example.com'
      },
      {
        id: 'player3',
        name: 'Charlie',
        walletAddress: '0xCharlieWallet',
        email: 'charlie@example.com'
      }
    ];

    const profileBatch = db.batch();
    profiles.forEach(profile => {
      const profileRef = db.collection('profiles').doc(profile.id);
      profileBatch.set(profileRef, profile);
    });
    await profileBatch.commit();

    console.log('✅ Profiles created');

    console.log('🎉 Firestore seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding Firestore:', error);
  }
};

seedFirestore();
