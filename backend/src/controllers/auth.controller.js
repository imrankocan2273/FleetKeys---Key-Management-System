const {
  loginWithPassword,
  loadUserCompanyProfile,
  logoutWithAccessToken,
} = require('../services/auth.service');

function isClientRoleAllowed({ clientType, role }) {
  if (clientType === 'web_admin') return role === 'admin';
  if (clientType === 'mobile_user') return role === 'user';
  return false;
}

async function login(req, res) {
  const { username, password, client_type: clientType } = req.body || {};

  if (!username || !password || !clientType) {
    return res.status(400).json({
      message: 'username, password and client_type are required',
    });
  }

  if (!['web_admin', 'mobile_user'].includes(clientType)) {
    return res.status(400).json({
      message: 'client_type must be web_admin or mobile_user',
    });
  }

  const authResult = await loginWithPassword({
    email: String(username).trim(),
    password: String(password),
  });

  if (!authResult.ok) {
    return res.status(401).json({
      message: 'Invalid credentials',
      details: authResult.error,
    });
  }

  const profileResult = await loadUserCompanyProfile({
    authUserId: authResult.user?.id,
  });

  if (!profileResult.ok) {
    return res.status(403).json({
      message: 'User is not assigned to any company profile',
      details: profileResult.error,
    });
  }

  const profile = profileResult.profile;

  if (!isClientRoleAllowed({ clientType, role: profile.role })) {
    return res.status(403).json({
      message: 'Role is not allowed for this client type',
      details: `client_type=${clientType}, role=${profile.role}`,
    });
  }

  return res.status(200).json({
    message: 'Login successful',
    access_token: authResult.session?.access_token,
    refresh_token: authResult.session?.refresh_token,
    user: {
      id: authResult.user?.id,
      email: authResult.user?.email,
    },
    profile,
  });
}

async function logout(req, res) {
  const { access_token: accessToken } = req.body || {};

  if (!accessToken) {
    return res.status(400).json({
      message: 'access_token is required',
    });
  }

  const result = await logoutWithAccessToken({ accessToken });

  if (!result.ok) {
    return res.status(400).json({
      message: 'Logout failed',
      details: result.error,
    });
  }

  return res.status(200).json({
    message: 'Logout successful',
  });
}

module.exports = { login, logout };
