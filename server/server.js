const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const app = require('./app');
const connectDB = require('./config/db');
const { ensureAuthConfiguration } = require('./utils/auth');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    ensureAuthConfiguration();
    await connectDB();

    app.listen(PORT, () => {
      console.log(`FlowCare API running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
