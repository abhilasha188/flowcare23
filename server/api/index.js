const express = require('express');
const mongoose = require('mongoose');
const api = require('../app');
const { ensureAuthConfiguration } = require('../utils/auth');

let connectionPromise;

mongoose.connection.on('disconnected', () => {
  connectionPromise = undefined;
});

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) return;
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    }).catch((error) => {
      connectionPromise = undefined;
      throw error;
    });
  }
  await connectionPromise;
}

const app = express();

app.use(async (_req, res, next) => {
  try {
    ensureAuthConfiguration();
    await connectToDatabase();
    return next();
  } catch (error) {
    console.error('Vercel API initialization failed:', {
      name: error.name,
      code: error.code,
    });
    return res.status(503).json({
      success: false,
      message: 'The API is not configured or its dependencies are unavailable.',
      errors: [],
    });
  }
});

app.use(api);

module.exports = app;
