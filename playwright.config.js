const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'node tests/support/start-test-server.js',
    url: 'http://127.0.0.1:4173/__health',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      TEST_PORT: '4173',
    },
  },
});