const express = require('express');
const cors = require('cors');

const { env, validateEnv } = require('./config/env');
const { app } = require('./app');

validateEnv();

app.listen(env.port, () => {
  console.log(`FleetKeys backend running on http://localhost:${env.port}`);
});
