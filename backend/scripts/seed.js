const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Finalist = require('../models/Finalists');
const Voting = require('../models/Voting');
const finalists = require('./finalists.json');

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB Connected');

    // Clean and seed finalists
    await Finalist.deleteMany();
    console.log('✅ Finalists cleared');
    await Finalist.insertMany(finalists);
    console.log('✅ Finalists seeded');

    // Clean votes
    await Voting.deleteMany();
    console.log('✅ Votes cleared');

    console.log('🎉 Seeding completed');
    process.exit();
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
