const {
  createCompanyUser,
  listCompanyUsers,
  updateCompanyUser,
  deleteCompanyUser,
} = require('../services/admin-user.service');

async function createUser(req, res) {
  const {
    username,
    password,
    full_name: fullName,
    position,
    phone,
  } = req.body || {};
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
    position: position ? String(position).trim() : null,
    phone: phone ? String(phone).trim() : null,
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

async function listUsers(req, res) {
  const companyId = req.context?.company_id;
  if (!companyId) {
    return res.status(403).json({ message: 'Missing company context' });
  }

  const result = await listCompanyUsers({ companyId });
  if (!result.ok) {
    return res.status(400).json({ message: 'User list failed', details: result.error });
  }

  return res.status(200).json({ users: result.users });
}

async function updateUser(req, res) {
  const companyId = req.context?.company_id;
  const companyUserId = String(req.params.companyUserId || '').trim();
  const {
    full_name: fullName,
    position,
    phone,
  } = req.body || {};

  if (!companyId) {
    return res.status(403).json({ message: 'Missing company context' });
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(companyUserId);
  if (!isUuid) {
    return res.status(400).json({ message: 'Invalid companyUserId' });
  }

  const result = await updateCompanyUser({
    companyId,
    companyUserId,
    fullName: fullName ? String(fullName).trim() : null,
    position: position ? String(position).trim() : null,
    phone: phone ? String(phone).trim() : null,
  });

  if (!result.ok) {
    return res.status(400).json({ message: 'User update failed', details: result.error });
  }

  return res.status(200).json({ message: 'User updated', user: result.user });
}

async function deleteUser(req, res) {
  const companyId = req.context?.company_id;
  const companyUserId = String(req.params.companyUserId || '').trim();
  const actingAuthUserId = req.context?.user_id;

  if (!companyId) {
    return res.status(403).json({ message: 'Missing company context' });
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(companyUserId);
  if (!isUuid) {
    return res.status(400).json({ message: 'Invalid companyUserId' });
  }

  const result = await deleteCompanyUser({
    companyId,
    companyUserId,
    actingAuthUserId,
  });

  if (!result.ok) {
    return res.status(400).json({ message: 'User delete failed', details: result.error });
  }

  return res.status(200).json({ message: 'User deleted' });
}

module.exports = { createUser, listUsers, updateUser, deleteUser };
