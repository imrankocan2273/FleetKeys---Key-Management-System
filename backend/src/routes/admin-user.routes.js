const express = require('express');

const { createUser } = require('../controllers/admin-user.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireTenantContext } = require('../middlewares/tenant.middleware');
const { requireRole } = require('../middlewares/role.middleware');

const adminUserRouter = express.Router();

adminUserRouter.use(requireAuth, requireTenantContext, requireRole('admin'));
adminUserRouter.post('/users', createUser);

module.exports = { adminUserRouter };
