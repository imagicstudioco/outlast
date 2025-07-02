const admin = require('firebase-admin');
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Format private key - handle various formats
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

// Remove quotes if present
if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
  privateKey = privateKey.slice(1, -1);
}

// Replace escaped newlines
privateKey = privateKey.replace(/\\n/g, '\n');

// If the key doesn't start with -----BEGIN PRIVATE KEY-----, it might be base64 encoded
if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
  try {
    privateKey = Buffer.from(privateKey, 'base64').toString('utf8');
  } catch (error) {
    console.warn('Could not decode private key as base64, using as-is');
  }
}

console.log('Firebase Project ID:', process.env.FIREBASE_PROJECT_ID);
console.log('Firebase Client Email:', process.env.FIREBASE_CLIENT_EMAIL);
console.log('Private Key starts with:', privateKey.substring(0, 50) + '...');

// Initialize Firebase Admin with better error handling
let app;
try {
  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
  });
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error);
  
  // Try alternative initialization without databaseURL
  try {
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey
      })
    });
    console.log('✅ Firebase Admin initialized successfully (without databaseURL)');
  } catch (altError) {
    console.error('❌ Alternative initialization also failed:', altError);
    throw altError;
  }
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = {
  admin,
  db,
  auth,
  firebaseConfig: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    databaseURL: process.env.FIREBASE_DATABASE_URL
  }
}; 