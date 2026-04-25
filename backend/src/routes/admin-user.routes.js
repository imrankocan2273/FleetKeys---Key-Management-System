const express = require('express');

const {
  createUser,
  listUsers,
  updateUser,
  deleteUser,
} = require('../controllers/admin-user.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireTenantContext } = require('../middlewares/tenant.middleware');
const { requireRole } = require('../middlewares/role.middleware');

const adminUserRouter = express.Router();

adminUserRouter.use(requireAuth, requireTenantContext, requireRole('admin'));
adminUserRouter.get('/users', listUsers);
adminUserRouter.post('/users', createUser);
adminUserRouter.put('/users/:companyUserId', updateUser);
adminUserRouter.delete('/users/:companyUserId', deleteUser);

module.exports = { adminUserRouter };
