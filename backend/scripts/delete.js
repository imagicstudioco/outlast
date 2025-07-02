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

const deleteAllData = async () => {
  try {
    console.log('🚀 Starting complete data deletion...\n');

    // ========== Delete all seasons and their subcollections ==========
    console.log('📋 Fetching all seasons...');
    const seasonsSnapshot = await db.collection('seasons').get();
    
    if (seasonsSnapshot.empty) {
      console.log('ℹ️ No seasons found to delete');
    } else {
      console.log(`🗑️ Found ${seasonsSnapshot.size} seasons to delete`);
      
      for (const seasonDoc of seasonsSnapshot.docs) {
        const seasonId = seasonDoc.id;
        console.log(`\n🗑️ Deleting season: ${seasonId}`);
        
        // Delete all subcollections in the season
        const subcollections = [
          'gameStatus', 
          'gameRules', 
          'voting', 
          'leaderboard', 
          'rewards',
          'finalists'
        ];

        for (const sub of subcollections) {
          console.log(`  📁 Deleting subcollection: ${sub}`);
          await deleteCollection(`seasons/${seasonId}/${sub}`);
        }

        // Delete the season document itself
        await seasonDoc.ref.delete();
        console.log(`  ✅ Season ${seasonId} deleted`);
      }
    }

    // ========== Delete all profiles ==========
    console.log('\n👥 Deleting all profiles...');
    await deleteCollection('profiles');
    console.log('  ✅ All profiles deleted');

    // ========== Delete global data ==========
    console.log('\n🌐 Deleting global data...');
    const globalSnapshot = await db.collection('global').get();
    
    if (globalSnapshot.empty) {
      console.log('  ℹ️ No global data found to delete');
    } else {
      console.log(`  🗑️ Found ${globalSnapshot.size} global documents to delete`);
      
      for (const globalDoc of globalSnapshot.docs) {
        await globalDoc.ref.delete();
        console.log(`  ✅ Deleted: ${globalDoc.id}`);
      }
    }

    // ========== Delete any other collections that might exist ==========
    console.log('\n🔍 Checking for any other collections...');
    const collections = await db.listCollections();
    
    for (const collection of collections) {
      const collectionName = collection.id;
      console.log(`🗑️ Deleting collection: ${collectionName}`);
      await deleteCollection(collectionName);
      console.log(`  ✅ Collection ${collectionName} deleted`);
    }

    console.log('\n🎉 All data has been successfully deleted from the backend!');
    console.log('📝 The database is now completely empty and ready for fresh data.');
    
  } catch (error) {
    console.error('❌ Error during data deletion:', error);
    process.exit(1);
  }
};

// Add confirmation prompt
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('⚠️  WARNING: This script will delete ALL data from the backend!');
console.log('📋 This includes:');
console.log('   - All seasons and their subcollections');
console.log('   - All user profiles');
console.log('   - All global configuration data');
console.log('   - Any other collections in the database');
console.log('\n🚨 This action cannot be undone!\n');

rl.question('Are you sure you want to proceed? Type "DELETE ALL" to confirm: ', (answer) => {
  if (answer === 'DELETE ALL') {
    console.log('\n🔄 Proceeding with deletion...\n');
    rl.close();
    deleteAllData();
  } else {
    console.log('❌ Deletion cancelled. No data was deleted.');
    rl.close();
    process.exit(0);
  }
}); 