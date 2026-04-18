const express = require('express');

const { adminMe, userMe } = require('../controllers/protected.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireTenantContext } = require('../middlewares/tenant.middleware');
const { requireRole } = require('../middlewares/role.middleware');

const protectedRouter = express.Router();

protectedRouter.use(requireAuth, requireTenantContext);

protectedRouter.get('/me', (req, res) => {
  res.status(200).json({
    user: req.auth.user,
    context: req.context,
  });
});

protectedRouter.get('/admin/me', requireRole('admin'), adminMe);
protectedRouter.get('/user/me', requireRole('user'), userMe);

module.exports = { protectedRouter };
