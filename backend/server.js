const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
const winston = require('winston');
const { admin, db, auth } = require('./config/firebase');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Trust proxy configuration for rate limiting
app.set('trust proxy', 1);

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

const votingLimiter = rateLimit({
  windowMs: 12 * 60 * 60 * 1000, // 12 hours
  max: 2, // 2 votes per 12 hours (MVP + eliminate)
  keyGenerator: (req) => req.user?.wallet_address || req.ip,
  message: 'Voting limit exceeded'
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(limiter);

// JWT middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userDoc = await db.collection('users').doc(decoded.fid.toString()).get();
    
    if (!userDoc.exists) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = { fid: decoded.fid, ...userDoc.data() };
    next();
  } catch (error) {
    logger.error('JWT verification failed:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};


// Utility functions
const getCurrentGameSession = async () => {
  const gameSessionsRef = db.collection('gameSessions');
  const snapshot = await gameSessionsRef.where('status', '==', 'active').limit(1).get();
  
  if (snapshot.empty) {
    return null;
  }
  
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
};

const getCurrentVotingRound = async (gameSessionId) => {
  const roundsRef = db.collection('votingRounds');
  const now = admin.firestore.Timestamp.now();
  
  const snapshot = await roundsRef
    .where('game_session_id', '==', gameSessionId)
    .where('start_time', '<=', now)
    .where('end_time', '>', now)
    .limit(1)
    .get();
    
  if (snapshot.empty) {
    return null;
  }
  
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
};

// Import routes
const gameRoutes = require('./routes/game');
const votingRoutes = require('./routes/voting');
const leaderboardRoutes = require('./routes/leaderboard');
const profileRoutes = require('./routes/profile');
const rewardsRoutes = require('./routes/rewards');
const finalistsRoutes = require('./routes/finalists');

// Root route
app.get('/', (req, res) => {
  console.log('📡 GET / - Root endpoint called');
  res.send('<h1>Outlast Backend API Server Is Running</h1>');
});


// Apply routes
app.use('/api/game', gameRoutes);
app.use('/api/voting', votingRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/finalists-list', finalistsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Outlast Voting API server running on port ${PORT}`);
});

module.exports = app;