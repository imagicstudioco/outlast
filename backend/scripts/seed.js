const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/Finalists');
const users = require('./finalists.json');

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB Connected');

    await User.deleteMany(); // Clean existing
    await User.insertMany(finalists); // Insert from data.json

    console.log('🎉 Data seeded successfully');
    process.exit();
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
