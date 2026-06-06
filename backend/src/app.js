const express = require('express');
const cors = require('cors');

const { authRouter } = require('./routes/auth.routes');
const { protectedRouter } = require('./routes/protected.routes');
const { adminUserRouter } = require('./routes/admin-user.routes');
const { keyRouter } = require('./routes/key.routes');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/protected', protectedRouter);
  app.use('/api/admin', adminUserRouter);
  app.use('/api/keys', keyRouter);

  app.use((_req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });

  return app;
}

const app = createApp();

module.exports = { app, createApp };