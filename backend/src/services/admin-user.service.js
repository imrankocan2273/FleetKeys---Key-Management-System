const {
  createAuthUser,
  deleteAuthUser,
  insertCompanyUser,
  selectCompanyUsers,
  updateCompanyUserProfile,
  deleteCompanyUserById,
  findCompanyUserById,
} = require('../daos/admin-user.dao');

async function createCompanyUser({ companyId, email, password, fullName, position, phone }) {
  const authResult = await createAuthUser({ email, password });
  if (!authResult.ok) {
    return { ok: false, error: authResult.error };
  }

  const authUserId = authResult.user?.id;
  if (!authUserId) {
    return { ok: false, error: 'Auth user creation returned no user id' };
  }

  const dbResult = await insertCompanyUser({
    companyId,
    authUserId,
    fullName,
    position,
    phone,
  });

  if (!dbResult.ok) {
    await deleteAuthUser({ authUserId });
    return { ok: false, error: dbResult.error };
  }

  return {
    ok: true,
    created: {
      auth_user_id: authUserId,
      email: authResult.user?.email,
      role: dbResult.row.role,
      full_name: dbResult.row.full_name,
      position: dbResult.row.position,
      phone: dbResult.row.phone,
      company_id: dbResult.row.company_id,
      company_user_id: dbResult.row.id,
    },
  };
}

async function listCompanyUsers({ companyId }) {
  const result = await selectCompanyUsers({ companyId });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, users: result.rows };
}

async function updateCompanyUser({ companyId, companyUserId, fullName, position, phone }) {
  const existing = await findCompanyUserById({ companyId, companyUserId });
  if (!existing.ok) {
    return { ok: false, error: existing.error };
  }
  if (!existing.row) {
    return { ok: false, error: 'User not found' };
  }

  const updated = await updateCompanyUserProfile({
    companyId,
    companyUserId,
    fullName,
    position,
    phone,
  });
  if (!updated.ok) {
    return { ok: false, error: updated.error };
  }

  return { ok: true, user: updated.row };
}

async function deleteCompanyUser({ companyId, companyUserId, actingAuthUserId }) {
  const existing = await findCompanyUserById({ companyId, companyUserId });
  if (!existing.ok) {
    return { ok: false, error: existing.error };
  }
  if (!existing.row) {
    return { ok: false, error: 'User not found' };
  }

  if (existing.row.auth_user_id === actingAuthUserId) {
    return { ok: false, error: 'Cannot delete currently logged in admin' };
  }

  const deleteDb = await deleteCompanyUserById({ companyId, companyUserId });
  if (!deleteDb.ok) {
    return { ok: false, error: deleteDb.error };
  }

  const authUserId = existing.row.auth_user_id;
  if (authUserId) {
    const deleteAuth = await deleteAuthUser({ authUserId });
    if (!deleteAuth.ok) {
      return { ok: false, error: `Deleted from company_users but auth deletion failed: ${deleteAuth.error}` };
    }
  }

  return { ok: true };
}

module.exports = { createCompanyUser, listCompanyUsers, updateCompanyUser, deleteCompanyUser };
