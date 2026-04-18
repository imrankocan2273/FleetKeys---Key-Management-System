const {
  loginWithPassword,
  logoutWithAccessToken,
} = require('../services/auth.service');

async function login(req, res) {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      message: 'username and password are required',
    });
  }

  const result = await loginWithPassword({
    email: String(username).trim(),
    password: String(password),
  });

  if (!result.ok) {
    return res.status(401).json({
      message: 'Invalid credentials',
      details: result.error,
    });
  }

  return res.status(200).json({
    message: 'Login successful',
    access_token: result.session?.access_token,
    refresh_token: result.session?.refresh_token,
    user: {
      id: result.user?.id,
      email: result.user?.email,
    },
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
