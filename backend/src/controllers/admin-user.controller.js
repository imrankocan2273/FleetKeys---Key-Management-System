const { createCompanyUser } = require('../services/admin-user.service');

async function createUser(req, res) {
  const { username, password, full_name: fullName } = req.body || {};
  const companyId = req.context?.company_id;

  if (!companyId) {
    return res.status(403).json({ message: 'Missing company context' });
  }

  if (!username || !password) {
    return res.status(400).json({
      message: 'username and password are required',
    });
  }

  if (String(password).length < 8) {
    return res.status(400).json({
      message: 'password must have at least 8 characters',
    });
  }

  const result = await createCompanyUser({
    companyId,
    email: String(username).trim().toLowerCase(),
    password: String(password),
    fullName: fullName ? String(fullName).trim() : null,
  });

  if (!result.ok) {
    return res.status(400).json({
      message: 'User creation failed',
      details: result.error,
    });
  }

  return res.status(201).json({
    message: 'User created',
    user: result.created,
  });
}

module.exports = { createUser };
