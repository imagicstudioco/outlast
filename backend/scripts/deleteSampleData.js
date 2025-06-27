const { db } = require('../config/firebase');

const deleteCollection = async (collectionPath, batchSize = 500) => {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });
};

const deleteQueryBatch = async (query, resolve) => {
  const snapshot = await query.get();

  if (snapshot.size === 0) {
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();

  process.nextTick(() => {
    deleteQueryBatch(query, resolve);
  });
};

const deleteSampleData = async () => {
  try {
    const seasonId = 'season_1'; // Change this if needed

    // ========== Delete season data ==========
    const seasonRef = db.collection('seasons').doc(seasonId);

    // Delete subcollections in the season
    const subcollections = ['gameStatus', 'gameRules', 'voting', 'leaderboard', 'rewards'];

    for (const sub of subcollections) {
      console.log(`🗑️ Deleting seasons/${seasonId}/${sub}...`);
      await deleteCollection(`seasons/${seasonId}/${sub}`);
    }

    // Delete the season document itself
    console.log(`🗑️ Deleting season document: seasons/${seasonId}`);
    await seasonRef.delete();

    // ========== Delete global currentSeason ==========
    console.log('🗑️ Deleting global/currentSeason...');
    await db.collection('global').doc('currentSeason').delete();

    // ========== Delete profiles ==========
    console.log('🗑️ Deleting all profiles...');
    await deleteCollection('profiles');

    console.log('🎉 Sample data deleted successfully!');
  } catch (error) {
    console.error('❌ Error deleting sample data:', error);
  }
};

deleteSampleData();
