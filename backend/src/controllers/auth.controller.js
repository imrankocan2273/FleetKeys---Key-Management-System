const {
  loginWithPassword,
  loadUserCompanyContext,
  logoutWithAccessToken,
} = require('../services/auth.service');

async function login(req, res) {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      message: 'username and password are required',
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

  const contextResult = await loadUserCompanyContext({
    authUserId: authResult.user?.id,
  });

  if (!contextResult.ok) {
    return res.status(403).json({
      message: 'User is not assigned to any company user context',
      details: contextResult.error,
    });
  }

  const context = contextResult.context;

  return res.status(200).json({
    message: 'Login successful',
    access_token: authResult.session?.access_token,
    refresh_token: authResult.session?.refresh_token,
    user: {
      id: authResult.user?.id,
      email: authResult.user?.email,
    },
    profile: context,
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
