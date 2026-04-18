const { loadUserCompanyProfile } = require('../services/auth.service');

async function requireTenantContext(req, res, next) {
  const authUserId = req.auth?.user?.id;
  if (!authUserId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const profileResult = await loadUserCompanyProfile({ authUserId });
  if (!profileResult.ok) {
    return res.status(403).json({
      message: 'User has no tenant profile',
      details: profileResult.error,
    });
  }

  req.context = {
    user_id: authUserId,
    role: profileResult.profile.role,
    company_id: profileResult.profile.company_id,
    company_name: profileResult.profile.company_name,
    business_type: profileResult.profile.business_type,
  };

  return next();
}

module.exports = { requireTenantContext };
