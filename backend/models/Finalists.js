const mongoose = require('mongoose');

const FinalistSchema = new mongoose.Schema({
  id: Number,
  username: String,
});

module.exports = mongoose.model('Finalist', FinalistSchema);
