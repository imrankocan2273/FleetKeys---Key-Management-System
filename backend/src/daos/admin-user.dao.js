const { supabase, supabaseAdmin } = require('../config/supabase');

async function createAuthUser({ email, password }) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, user: data.user };
}

async function deleteAuthUser({ authUserId }) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

async function insertCompanyUser({ companyId, authUserId, fullName }) {
  const { data, error } = await supabase
    .from('company_users')
    .insert({
      company_id: companyId,
      auth_user_id: authUserId,
      role: 'user',
      full_name: fullName || null,
    })
    .select('id, company_id, auth_user_id, role, full_name')
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, row: data };
}

module.exports = {
  createAuthUser,
  deleteAuthUser,
  insertCompanyUser,
};
