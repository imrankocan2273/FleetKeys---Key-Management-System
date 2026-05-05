const express = require('express');

const {
  listKeys,
  getKey,
  createKey,
  updateKey,
  deleteKey,
  listKeyEvents,
  addKeyEvent,
  scanKeyEvent,
} = require('../controllers/key.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireTenantContext } = require('../middlewares/tenant.middleware');
const { requireRole } = require('../middlewares/role.middleware');

const keyRouter = express.Router();

keyRouter.use(requireAuth, requireTenantContext);

keyRouter.get('/', listKeys);
keyRouter.post('/scan', scanKeyEvent);
keyRouter.get('/:keyId/events', listKeyEvents);
keyRouter.post('/:keyId/events', addKeyEvent);
keyRouter.get('/:keyId', getKey);

keyRouter.post('/', requireRole('admin'), createKey);
keyRouter.patch('/:keyId', requireRole('admin'), updateKey);
keyRouter.delete('/:keyId', requireRole('admin'), deleteKey);

module.exports = { keyRouter };
