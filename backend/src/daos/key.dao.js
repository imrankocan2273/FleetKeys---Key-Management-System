const { createClient } = require('@supabase/supabase-js');
const { supabaseAdmin } = require('../config/supabase');
const { env } = require('../config/env');

function createScopedAuthClient(accessToken) {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

async function selectKeys({ companyId, status }) {
  let query = supabaseAdmin
    .from('keys')
    .select('id, company_id, key_code, qr_token, status, note, created_by, created_at, updated_at')
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };

  return { ok: true, rows: data || [] };
}

async function selectKeyById({ companyId, keyId }) {
  const { data, error } = await supabaseAdmin
    .from('keys')
    .select('id, company_id, key_code, qr_token, status, note, created_by, created_at, updated_at')
    .eq('company_id', companyId)
    .eq('id', keyId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };

  return { ok: true, row: data || null };
}

async function insertKey({ companyId, keyCode, qrToken, status, note, createdByCompanyUserId }) {
  const { data, error } = await supabaseAdmin
    .from('keys')
    .insert({
      company_id: companyId,
      key_code: keyCode,
      qr_token: qrToken,
      status,
      note: note || null,
      created_by: createdByCompanyUserId || null,
    })
    .select('id, company_id, key_code, qr_token, status, note, created_by, created_at, updated_at')
    .single();

  if (error) return { ok: false, error: error.message };

  return { ok: true, row: data };
}

async function updateKeyById({ companyId, keyId, patch }) {
  const { data, error } = await supabaseAdmin
    .from('keys')
    .update(patch)
    .eq('company_id', companyId)
    .eq('id', keyId)
    .select('id, company_id, key_code, qr_token, status, note, created_by, created_at, updated_at')
    .maybeSingle();

  if (error) return { ok: false, error: error.message };

  return { ok: true, row: data || null };
}

async function deleteKeyById({ companyId, keyId }) {
  const { data, error } = await supabaseAdmin
    .from('keys')
    .delete()
    .eq('company_id', companyId)
    .eq('id', keyId)
    .select('id');

  if (error) return { ok: false, error: error.message };

  return { ok: true, deleted: (data || []).length > 0 };
}

async function selectCompanyUserIdByAuthUserId({ companyId, authUserId }) {
  const { data, error } = await supabaseAdmin
    .from('company_users')
    .select('id')
    .eq('company_id', companyId)
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };

  return { ok: true, companyUserId: data?.id || null };
}

async function selectKeyEventsByKeyId({ companyId, keyId, limit }) {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 200) : 50;

  const { data, error } = await supabaseAdmin
    .from('key_events')
    .select('id, key_id, company_id, user_id, action, message, created_at')
    .eq('company_id', companyId)
    .eq('key_id', keyId)
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (error) return { ok: false, error: error.message };

  const rows = (data || []).map((row) => ({
    id: row.id,
    key_id: row.key_id,
    company_id: row.company_id,
    user_id: row.user_id,
    action: row.action,
    message: row.message,
    created_at: row.created_at,
  }));

  return { ok: true, rows };
}

async function selectCompanyUsersByAuthUserIds({ companyId, authUserIds }) {
  const safeAuthUserIds = Array.from(
    new Set((authUserIds || []).filter((value) => typeof value === 'string' && value.trim()))
  );

  if (!safeAuthUserIds.length) {
    return { ok: true, rows: [] };
  }

  const { data, error } = await supabaseAdmin
    .from('company_users')
    .select('id, auth_user_id, full_name, position, phone')
    .eq('company_id', companyId)
    .in('auth_user_id', safeAuthUserIds);

  if (error) return { ok: false, error: error.message };

  return { ok: true, rows: data || [] };
}

async function selectRecentKeyEvents({ companyId, limit }) {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 200) : 50;

  const { data, error } = await supabaseAdmin
    .from('key_events')
    .select('id, key_id, company_id, user_id, action, message, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (error) return { ok: false, error: error.message };

  return { ok: true, rows: data || [] };
}

async function insertKeyEvent({ keyId, companyId, authUserId, action, message }) {
  const { data, error } = await supabaseAdmin
    .from('key_events')
    .insert({
      key_id: keyId,
      company_id: companyId,
      user_id: authUserId,
      action,
      message: message || null,
    })
    .select('id, key_id, company_id, user_id, action, message, created_at')
    .single();

  if (error) return { ok: false, error: error.message };

  return { ok: true, row: data };
}

async function executeScanKeyEvent({ accessToken, qrToken, action, message }) {
  const scopedClient = createScopedAuthClient(accessToken);

  const { data, error } = await scopedClient.rpc('scan_key_event', {
    p_qr_token: qrToken,
    p_action: action,
    p_message: message || null,
  });

  if (error) return { ok: false, error: error.message };

  return { ok: true, row: data || null };
}

module.exports = {
  selectKeys,
  selectKeyById,
  insertKey,
  updateKeyById,
  deleteKeyById,
  selectCompanyUserIdByAuthUserId,
  selectKeyEventsByKeyId,
  selectCompanyUsersByAuthUserIds,
  selectRecentKeyEvents,
  insertKeyEvent,
  executeScanKeyEvent,
};
