const express = require('express');
const { login, logout, refresh, updatePassword, updateProfile } = require('../controllers/auth.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireTenantContext } = require('../middlewares/tenant.middleware');

const authRouter = express.Router();

authRouter.post('/login', login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);
authRouter.post('/change-password', requireAuth, updatePassword);
authRouter.patch('/profile', requireAuth, requireTenantContext, updateProfile);

module.exports = { authRouter };
