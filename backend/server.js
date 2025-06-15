const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const { ethers } = require('ethers');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
const winston = require('winston');
require('dotenv').config();

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 3000;

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

// NFT verification middleware
const verifyNFTOwnership = async (req, res, next) => {
  try {
    const { wallet_address } = req.user;
    const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
    const contract = new ethers.Contract(
      process.env.NFT_CONTRACT_ADDRESS,
      ['function balanceOf(address) view returns (uint256)'],
      provider
    );

    const balance = await contract.balanceOf(wallet_address);
    
    if (balance.toString() === '0') {
      return res.status(403).json({ error: 'NFT ownership required' });
    }

    // Update user's NFT verification status
    await db.collection('users').doc(req.user.fid.toString()).update({
      nft_verified: true,
      last_nft_check: admin.firestore.FieldValue.serverTimestamp()
    });

    next();
  } catch (error) {
    logger.error('NFT verification failed:', error);
    return res.status(500).json({ error: 'NFT verification failed' });
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

// Authentication Routes
app.post('/api/auth/farcaster', [
  body('fid').isNumeric(),
  body('username').isString().isLength({ min: 1, max: 50 }),
  body('wallet_address').isEthereumAddress(),
  body('signature').isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fid, username, wallet_address, signature, profile_image } = req.body;

    // Verify signature (simplified - implement proper signature verification)
    const message = `Authenticate with Outlast Voting App: ${fid}`;
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    if (recoveredAddress.toLowerCase() !== wallet_address.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Create or update user
    const userRef = db.collection('users').doc(fid.toString());
    const userDoc = await userRef.get();

    const userData = {
      fid,
      wallet_address,
      username,
      profile_image: profile_image || '',
      nft_verified: false,
      last_active: admin.firestore.FieldValue.serverTimestamp(),
      ...(userDoc.exists ? {} : { created_at: admin.firestore.FieldValue.serverTimestamp() })
    };

    await userRef.set(userData, { merge: true });

    // Generate JWT
    const token = jwt.sign({ fid }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: userData });
  } catch (error) {
    logger.error('Farcaster auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.post('/api/auth/verify', authenticateToken, async (req, res) => {
  res.json({ valid: true, user: req.user });
});

app.post('/api/auth/refresh', authenticateToken, async (req, res) => {
  try {
    const newToken = jwt.sign({ fid: req.user.fid }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token: newToken });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Voting Routes
app.get('/api/voting/participants', authenticateToken, async (req, res) => {
  try {
    const gameSession = await getCurrentGameSession();
    if (!gameSession) {
      return res.status(404).json({ error: 'No active game session' });
    }

    const participantsRef = db.collection('participants');
    const snapshot = await participantsRef
      .where('game_session_id', '==', gameSession.id)
      .where('status', '==', 'active')
      .get();

    const participants = [];
    for (const doc of snapshot.docs) {
      const participantData = doc.data();
      const userDoc = await db.collection('users').doc(participantData.user_id).get();
      
      participants.push({
        id: doc.id,
        ...participantData,
        user: userDoc.exists ? userDoc.data() : null
      });
    }

    res.json({ participants, gameSession });
  } catch (error) {
    logger.error('Get participants error:', error);
    res.status(500).json({ error: 'Failed to fetch participants' });
  }
});

app.post('/api/voting/cast', [
  authenticateToken,
  verifyNFTOwnership,
  votingLimiter,
  body('participant_id').isUUID(),
  body('vote_type').isIn(['mvp', 'eliminate'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { participant_id, vote_type } = req.body;
    const gameSession = await getCurrentGameSession();
    
    if (!gameSession) {
      return res.status(404).json({ error: 'No active game session' });
    }

    const currentRound = await getCurrentVotingRound(gameSession.id);
    if (!currentRound) {
      return res.status(400).json({ error: 'No active voting round' });
    }

    // Check if user already voted for this type in current round
    const existingVoteRef = db.collection('votes');
    const existingVote = await existingVoteRef
      .where('voter_fid', '==', req.user.fid)
      .where('vote_type', '==', vote_type)
      .where('voting_round', '==', currentRound.round_number)
      .limit(1)
      .get();

    if (!existingVote.empty) {
      return res.status(400).json({ error: 'Already voted for this category' });
    }

    // Verify participant exists and is active
    const participantDoc = await db.collection('participants').doc(participant_id).get();
    if (!participantDoc.exists || participantDoc.data().status !== 'active') {
      return res.status(400).json({ error: 'Invalid participant' });
    }

    // Create vote
    const voteData = {
      id: uuidv4(),
      voter_fid: req.user.fid,
      participant_id,
      vote_type,
      voting_round: currentRound.round_number,
      game_session_id: gameSession.id,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      signature: `${req.user.fid}-${participant_id}-${vote_type}-${Date.now()}`
    };

    await db.collection('votes').add(voteData);

    res.json({ success: true, vote: voteData });
  } catch (error) {
    logger.error('Cast vote error:', error);
    res.status(500).json({ error: 'Failed to cast vote' });
  }
});

app.get('/api/voting/status', authenticateToken, async (req, res) => {
  try {
    const gameSession = await getCurrentGameSession();
    if (!gameSession) {
      return res.status(404).json({ error: 'No active game session' });
    }

    const currentRound = await getCurrentVotingRound(gameSession.id);
    if (!currentRound) {
      return res.json({ hasActiveRound: false });
    }

    // Check user's voting status
    const votesRef = db.collection('votes');
    const userVotes = await votesRef
      .where('voter_fid', '==', req.user.fid)
      .where('voting_round', '==', currentRound.round_number)
      .get();

    const votedTypes = userVotes.docs.map(doc => doc.data().vote_type);

    res.json({
      hasActiveRound: true,
      currentRound,
      votingStatus: {
        voted_mvp: votedTypes.includes('mvp'),
        voted_eliminate: votedTypes.includes('eliminate'),
        can_vote: votedTypes.length < 2
      }
    });
  } catch (error) {
    logger.error('Get voting status error:', error);
    res.status(500).json({ error: 'Failed to get voting status' });
  }
});

app.get('/api/voting/results', authenticateToken, async (req, res) => {
  try {
    const gameSession = await getCurrentGameSession();
    if (!gameSession) {
      return res.status(404).json({ error: 'No active game session' });
    }

    const { round } = req.query;
    const targetRound = round ? parseInt(round) : gameSession.current_round - 1;

    if (targetRound < 1) {
      return res.json({ results: null, message: 'No completed rounds yet' });
    }

    // Get round results
    const roundRef = db.collection('votingRounds');
    const roundSnapshot = await roundRef
      .where('game_session_id', '==', gameSession.id)
      .where('round_number', '==', targetRound)
      .limit(1)
      .get();

    if (roundSnapshot.empty) {
      return res.status(404).json({ error: 'Round not found' });
    }

    const roundData = roundSnapshot.docs[0].data();

    // Get vote counts
    const votesRef = db.collection('votes');
    const votesSnapshot = await votesRef
      .where('voting_round', '==', targetRound)
      .where('game_session_id', '==', gameSession.id)
      .get();

    const mvpVotes = {};
    const eliminateVotes = {};

    votesSnapshot.docs.forEach(doc => {
      const vote = doc.data();
      if (vote.vote_type === 'mvp') {
        mvpVotes[vote.participant_id] = (mvpVotes[vote.participant_id] || 0) + 1;
      } else if (vote.vote_type === 'eliminate') {
        eliminateVotes[vote.participant_id] = (eliminateVotes[vote.participant_id] || 0) + 1;
      }
    });

    res.json({
      round: targetRound,
      mvp_votes: mvpVotes,
      eliminate_votes: eliminateVotes,
      eliminated_participant: roundData.eliminated_participant_id,
      mvp_participant: roundData.mvp_participant_id,
      total_voters: votesSnapshot.size / 2 // Assuming each voter votes twice
    });
  } catch (error) {
    logger.error('Get voting results error:', error);
    res.status(500).json({ error: 'Failed to get voting results' });
  }
});

// Leaderboard Routes
app.get('/api/leaderboard/current', async (req, res) => {
  try {
    const gameSession = await getCurrentGameSession();
    if (!gameSession) {
      return res.status(404).json({ error: 'No active game session' });
    }

    const participantsRef = db.collection('participants');
    const snapshot = await participantsRef
      .where('game_session_id', '==', gameSession.id)
      .where('status', '==', 'active')
      .orderBy('mvp_count', 'desc')
      .orderBy('consistency_streak', 'desc')
      .get();

    const leaderboard = [];
    for (const doc of snapshot.docs) {
      const participantData = doc.data();
      const userDoc = await db.collection('users').doc(participantData.user_id).get();
      
      leaderboard.push({
        id: doc.id,
        ...participantData,
        user: userDoc.exists ? userDoc.data() : null,
        survival_days: gameSession.current_round - 1
      });
    }

    res.json({ leaderboard, gameSession });
  } catch (error) {
    logger.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

app.get('/api/leaderboard/participant/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const participantDoc = await db.collection('participants').doc(id).get();
    
    if (!participantDoc.exists) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    const participantData = participantDoc.data();
    const userDoc = await db.collection('users').doc(participantData.user_id).get();

    // Get participant's voting history
    const votesRef = db.collection('votes');
    const receivedVotes = await votesRef
      .where('participant_id', '==', id)
      .orderBy('created_at', 'desc')
      .get();

    const voteHistory = receivedVotes.docs.map(doc => doc.data());

    res.json({
      participant: {
        id,
        ...participantData,
        user: userDoc.exists ? userDoc.data() : null
      },
      vote_history: voteHistory
    });
  } catch (error) {
    logger.error('Get participant details error:', error);
    res.status(500).json({ error: 'Failed to get participant details' });
  }
});

// Game Management Routes
app.get('/api/game/current', async (req, res) => {
  try {
    const gameSession = await getCurrentGameSession();
    if (!gameSession) {
      return res.status(404).json({ error: 'No active game session' });
    }

    const currentRound = await getCurrentVotingRound(gameSession.id);
    
    res.json({
      gameSession,
      currentRound,
      hasActiveVoting: !!currentRound
    });
  } catch (error) {
    logger.error('Get current game error:', error);
    res.status(500).json({ error: 'Failed to get current game' });
  }
});

// Rewards Routes
app.get('/api/rewards/eligible', authenticateToken, verifyNFTOwnership, async (req, res) => {
  try {
    const gameSession = await getCurrentGameSession();
    if (!gameSession) {
      return res.status(404).json({ error: 'No active game session' });
    }

    // Check if user voted in the last round
    const votesRef = db.collection('votes');
    const userVotes = await votesRef
      .where('voter_fid', '==', req.user.fid)
      .where('voting_round', '==', gameSession.current_round - 1)
      .get();

    const isEligible = userVotes.size >= 2; // Voted for both MVP and eliminate

    res.json({
      eligible: isEligible,
      reason: isEligible ? 'Participated in voting' : 'Did not participate in last round',
      reward_amount: process.env.DAILY_REWARD_AMOUNT || '0.001'
    });
  } catch (error) {
    logger.error('Check reward eligibility error:', error);
    res.status(500).json({ error: 'Failed to check reward eligibility' });
  }
});

// Automated game management
cron.schedule('0 0,12 * * *', async () => {
  logger.info('Running automated game management...');
  
  try {
    const gameSession = await getCurrentGameSession();
    if (!gameSession) return;

    const now = new Date();
    const currentRound = await getCurrentVotingRound(gameSession.id);
    
    if (currentRound && now > currentRound.end_time.toDate()) {
      // Process elimination
      await processElimination(gameSession.id, currentRound);
      
      // Start next round
      await startNewVotingRound(gameSession.id, currentRound.round_number + 1);
    }
  } catch (error) {
    logger.error('Automated game management error:', error);
  }
});

// Helper functions for game management
const processElimination = async (gameSessionId, round) => {
  try {
    // Get all eliminate votes for this round
    const votesRef = db.collection('votes');
    const eliminateVotes = await votesRef
      .where('voting_round', '==', round.round_number)
      .where('vote_type', '==', 'eliminate')
      .get();

    const voteCounts = {};
    eliminateVotes.docs.forEach(doc => {
      const vote = doc.data();
      voteCounts[vote.participant_id] = (voteCounts[vote.participant_id] || 0) + 1;
    });

    // Find participant with most eliminate votes
    let maxVotes = 0;
    let eliminatedParticipantId = null;
    
    Object.entries(voteCounts).forEach(([participantId, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        eliminatedParticipantId = participantId;
      }
    });

    if (eliminatedParticipantId) {
      // Eliminate participant
      await db.collection('participants').doc(eliminatedParticipantId).update({
        status: 'eliminated',
        elimination_date: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update round with elimination result
      await db.collection('votingRounds').doc(round.id).update({
        eliminated_participant_id: eliminatedParticipantId
      });

      logger.info(`Participant ${eliminatedParticipantId} eliminated in round ${round.round_number}`);
    }
  } catch (error) {
    logger.error('Process elimination error:', error);
  }
};

const startNewVotingRound = async (gameSessionId, roundNumber) => {
  try {
    const startTime = admin.firestore.Timestamp.now();
    const endTime = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 hours from now
    );

    const newRound = {
      id: uuidv4(),
      game_session_id: gameSessionId,
      round_number: roundNumber,
      start_time: startTime,
      end_time: endTime,
      eliminated_participant_id: null,
      mvp_participant_id: null
    };

    await db.collection('votingRounds').add(newRound);
    
    // Update game session current round
    await db.collection('gameSessions').doc(gameSessionId).update({
      current_round: roundNumber
    });

    logger.info(`Started new voting round ${roundNumber}`);
  } catch (error) {
    logger.error('Start new voting round error:', error);
  }
};

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