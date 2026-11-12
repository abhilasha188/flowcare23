const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const cycleRoutes = require('./routes/cycleRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const symptomRoutes = require('./routes/symptomRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const userRoutes = require('./routes/userRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const aiRoutes = require('./routes/aiRoutes');
const mongoose = require('mongoose');
const errorHandler = require('./middleware/errorHandler');

const app = express();

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/cycles', cycleRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/symptoms', symptomRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/ai', aiRoutes);

app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'Welcome to FlowCare API' });
});

app.get('/api/health', (req, res) => {
  const database = mongoose.connection.readyState === 1 ? 'available' : 'unavailable';
  const healthy = database === 'available';
  return res.status(healthy ? 200 : 503).json({
    success: healthy,
    status: healthy ? 'healthy' : 'degraded',
    database,
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Resource not found', errors: [] });
});

app.use(errorHandler);

module.exports = app;
