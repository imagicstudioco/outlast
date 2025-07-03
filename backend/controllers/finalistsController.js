const Finalist = require('../models/Finalists');

exports.getFinalists = async (req, res) => {
  try {
    const finalists = await Finalist.find();
    res.json(finalists);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
