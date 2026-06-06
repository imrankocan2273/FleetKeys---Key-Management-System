const {
  loginWithPassword,
  refreshSession,
  loadUserCompanyContext,
  logoutWithAccessToken,
  changePassword,
  updateUserProfile,
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

async function refresh(req, res) {
  const { refresh_token: refreshToken } = req.body || {};

  if (!refreshToken) {
    return res.status(400).json({
      message: 'refresh_token is required',
    });
  }

  const refreshResult = await refreshSession({
    refreshToken: String(refreshToken).trim(),
  });

  if (!refreshResult.ok) {
    return res.status(401).json({
      message: 'Refresh failed',
      details: refreshResult.error,
    });
  }

  const contextResult = await loadUserCompanyContext({
    authUserId: refreshResult.user?.id,
  });

  if (!contextResult.ok) {
    return res.status(403).json({
      message: 'User is not assigned to any company user context',
      details: contextResult.error,
    });
  }

  return res.status(200).json({
    message: 'Refresh successful',
    access_token: refreshResult.session?.access_token,
    refresh_token: refreshResult.session?.refresh_token,
    user: {
      id: refreshResult.user?.id,
      email: refreshResult.user?.email,
    },
    profile: contextResult.context,
  });
}

async function updatePassword(req, res) {
  const accessToken = req.auth?.accessToken;
  const email = req.auth?.user?.email;
  const { current_password: currentPassword, new_password: newPassword } = req.body || {};

  if (!accessToken || !email) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'current_password and new_password are required' });
  }

  if (String(newPassword).trim().length < 8) {
    return res.status(400).json({ message: 'new_password must be at least 8 characters' });
  }

  const result = await changePassword({
    accessToken,
    email,
    currentPassword: String(currentPassword),
    newPassword: String(newPassword),
  });

  if (!result.ok) {
    const message = String(result.error || 'Password update failed');
    const statusCode = message.toLowerCase().includes('invalid') ? 401 : 400;
    return res.status(statusCode).json({ message: 'Password update failed', details: message });
  }

  return res.status(200).json({
    message: 'Password updated successfully',
  });
}

async function updateProfile(req, res) {
  const companyId = req.context?.company_id;
  const authUserId = req.auth?.user?.id;
  const { full_name: fullName, position } = req.body || {};

  if (!companyId || !authUserId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (fullName === undefined && position === undefined) {
    return res.status(400).json({ message: 'full_name or position is required' });
  }

  const result = await updateUserProfile({
    companyId,
    authUserId,
    fullName,
    position,
  });

  if (!result.ok) {
    return res.status(400).json({ message: 'Profile update failed', details: result.error });
  }

  return res.status(200).json({
    message: 'Profile updated successfully',
    profile: result.user,
  });
}

module.exports = { login, logout, refresh, updatePassword, updateProfile };
