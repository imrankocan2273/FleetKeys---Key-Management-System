const {
  createAuthUser,
  deleteAuthUser,
  insertCompanyUser,
} = require('../daos/admin-user.dao');

async function createCompanyUser({ companyId, email, password, fullName }) {
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
      company_id: dbResult.row.company_id,
      company_user_id: dbResult.row.id,
    },
  };
}

module.exports = { createCompanyUser };
