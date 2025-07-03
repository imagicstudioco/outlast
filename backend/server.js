const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

const votingRoutes = require('./routes/votingRoutes');
const finalistsRoutes = require('./routes/finalistsRoutes');

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


app.use('/api/voting', votingRoutes);
app.use('/finalists', finalistsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
