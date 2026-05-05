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

async function insertCompanyUser({ companyId, authUserId, fullName, position }) {
  const { data, error } = await supabase
    .from('company_users')
    .insert({
      company_id: companyId,
      auth_user_id: authUserId,
      role: 'user',
      full_name: fullName || null,
      position: position || null,
    })
    .select('id, company_id, auth_user_id, role, full_name, position')
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, row: data };
}

async function selectCompanyUsers({ companyId }) {
  const { data, error } = await supabase
    .from('company_users')
    .select('id, company_id, auth_user_id, role, full_name, position')
    .eq('company_id', companyId)
    .order('id', { ascending: true });

  if (error) {
    return { ok: false, error: error.message };
  }

  const rows = (data || []).map((row) => ({
    id: row.id,
    company_id: row.company_id,
    auth_user_id: row.auth_user_id,
    role: row.role,
    full_name: row.full_name,
    position: row.position,
    email: null,
  }));

  return { ok: true, rows };
}

async function findCompanyUserById({ companyId, companyUserId }) {
  const { data, error } = await supabase
    .from('company_users')
    .select('id, company_id, auth_user_id, role, full_name, position')
    .eq('company_id', companyId)
    .eq('id', companyUserId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, row: data || null };
}

async function updateCompanyUserProfile({ companyId, companyUserId, fullName, position }) {
  const { data, error } = await supabase
    .from('company_users')
    .update({
      full_name: fullName || null,
      position: position || null,
    })
    .eq('company_id', companyId)
    .eq('id', companyUserId)
    .select('id, company_id, auth_user_id, role, full_name, position')
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, row: data };
}

async function deleteCompanyUserById({ companyId, companyUserId }) {
  const { error } = await supabase
    .from('company_users')
    .delete()
    .eq('company_id', companyId)
    .eq('id', companyUserId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

module.exports = {
  createAuthUser,
  deleteAuthUser,
  insertCompanyUser,
  selectCompanyUsers,
  findCompanyUserById,
  updateCompanyUserProfile,
  deleteCompanyUserById,
};
