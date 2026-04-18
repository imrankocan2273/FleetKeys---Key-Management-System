const express = require('express');

const {
  createKeyController,
  listKeysController,
  getKeyController,
  updateKeyController,
  deleteKeyController,
} = require('../controllers/key.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireTenantContext } = require('../middlewares/tenant.middleware');
const { requireRole } = require('../middlewares/role.middleware');

const keyRouter = express.Router();

keyRouter.use(requireAuth, requireTenantContext);

keyRouter.get('/', listKeysController);
keyRouter.get('/:id', getKeyController);

keyRouter.post('/', requireRole('admin'), createKeyController);
keyRouter.patch('/:id', requireRole('admin'), updateKeyController);
keyRouter.delete('/:id', requireRole('admin'), deleteKeyController);

module.exports = { keyRouter };

