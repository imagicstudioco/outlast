const express = require('express');
const router = express.Router();
const { getFinalists } = require('../controllers/finalistsController');

router.get('/', getFinalists);

module.exports = router;
