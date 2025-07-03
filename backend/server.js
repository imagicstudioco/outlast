const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

const votingRoutes = require('./routes/voting');
const finalistsRoutes = require('./routes/finalists');

dotenv.config();
connectDB();

const app = express();
app.use(express.json());


// Configure CORS with specific options
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://outlast-miniapp.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  credentials: false,
  maxAge: 86400
}));


// Root route
app.get('/', (req, res) => {
  console.log('📡 GET / - Root endpoint called');
  res.send('<h1>Outlast Voting Backend API Server Is Running</h1>');
});


app.use('/api/voting', votingRoutes);
app.use('/finalists', finalistsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
