const { supabase } = require('../config/supabase');

async function resolveCompanyUserIdByAuthUserId({ authUserId }) {
  const { data, error } = await supabase
    .from('company_users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .limit(1)
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, companyUserId: data.id };
}

async function insertKey({ companyId, keyCode, qrToken, status, note, createdBy }) {
  const { data, error } = await supabase
    .from('keys')
    .insert({
      company_id: companyId,
      key_code: keyCode,
      qr_token: qrToken,
      status: status || 'available',
      note: note || null,
      created_by: createdBy || null,
    })
    .select('*')
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, row: data };
}

async function selectKeysByCompanyId({ companyId }) {
  const { data, error } = await supabase
    .from('keys')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, rows: data || [] };
}

async function selectKeyById({ companyId, keyId }) {
  const { data, error } = await supabase
    .from('keys')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', keyId)
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, row: data || null };
}

async function updateKeyById({ companyId, keyId, patch }) {
  const { data, error } = await supabase
    .from('keys')
    .update(patch)
    .eq('company_id', companyId)
    .eq('id', keyId)
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, row: data || null };
}

async function deleteKeyById({ companyId, keyId }) {
  const { data, error } = await supabase
    .from('keys')
    .delete()
    .eq('company_id', companyId)
    .eq('id', keyId)
    .select('id')
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, row: data || null };
}

module.exports = {
  resolveCompanyUserIdByAuthUserId,
  insertKey,
  selectKeysByCompanyId,
  selectKeyById,
  updateKeyById,
  deleteKeyById,
};

