const { loadUserCompanyContext } = require('../services/auth.service');

async function requireTenantContext(req, res, next) {
  const authUserId = req.auth?.user?.id;
  if (!authUserId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const contextResult = await loadUserCompanyContext({ authUserId });
  if (!contextResult.ok) {
    return res.status(403).json({
      message: 'User has no tenant company_users context',
      details: contextResult.error,
    });
  }

  req.context = {
    user_id: authUserId,
    role: contextResult.context.role,
    company_id: contextResult.context.company_id,
    company_name: contextResult.context.company_name,
    business_type: contextResult.context.business_type,
  };

  return next();
}

module.exports = { requireTenantContext };
