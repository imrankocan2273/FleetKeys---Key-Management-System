const express = require('express');
const cors = require('cors');

const { env, validateEnv } = require('./config/env');
const { authRouter } = require('./routes/auth.routes');

validateEnv();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/auth', authRouter);

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(env.port, () => {
  console.log(`FleetKeys backend running on http://localhost:${env.port}`);
});
