const { createClient } = require('@supabase/supabase-js');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { env } = require('../config/env');

function normalizeBusinessType(rawBusinessType, rawIndustry) {
  const businessType = String(rawBusinessType || '').trim().toLowerCase();
  if (businessType === 'hotel/motel' || businessType === 'hotel-motel') return 'hotel/motel';
  if (businessType === 'rent-a-car') return 'rent-a-car';

  const industry = String(rawIndustry || '').trim().toLowerCase();
  if (industry === 'hotel_motel') return 'hotel/motel';
  if (industry === 'rent_a_car') return 'rent-a-car';

  return null;
}

async function loginWithPassword({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    session: data.session,
    user: data.user,
  };
}

async function loadUserCompanyContext({ authUserId }) {
  const { data, error } = await supabaseAdmin
    .from('company_users')
    .select('role, company_id, full_name, position, phone')
    .eq('auth_user_id', authUserId)
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: 'No company_users row found for this user' };
  }

  let companyResult = await supabaseAdmin
    .from('companies')
    .select('name, business_type')
    .eq('id', data.company_id)
    .limit(1)
    .maybeSingle();

  if (companyResult.error && String(companyResult.error.message || '').includes('business_type')) {
    companyResult = await supabaseAdmin
      .from('companies')
      .select('name, industry')
      .eq('id', data.company_id)
      .limit(1)
      .maybeSingle();
  }

  if (companyResult.error) {
    return { ok: false, error: companyResult.error.message };
  }

  const company = companyResult.data;
  const normalizedBusinessType = normalizeBusinessType(
    company?.business_type,
    company?.industry
  );

  return {
    ok: true,
    context: {
      role: data.role,
      company_id: data.company_id,
      full_name: data.full_name || null,
      position: data.position || null,
      phone: data.phone || null,
      company_name: company?.name || null,
      business_type: normalizedBusinessType,
    },
  };
}

async function logoutWithAccessToken({ accessToken }) {
  const scopedClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
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

  const { error } = await scopedClient.auth.signOut();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

async function changePassword({ accessToken, email, currentPassword, newPassword }) {
  const verification = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (verification.error) {
    return { ok: false, error: verification.error.message };
  }

  const scopedClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
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

  const { data, error } = await scopedClient.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    user: data?.user || verification.data?.user || null,
  };
}

async function updateUserProfile({ companyId, authUserId, fullName, position }) {
  const patch = {};

  if (fullName !== undefined) {
    patch.full_name = fullName ? String(fullName).trim() : null;
  }

  if (position !== undefined) {
    patch.position = position ? String(position).trim() : null;
  }

  const { data, error } = await supabaseAdmin
    .from('company_users')
    .update(patch)
    .eq('company_id', companyId)
    .eq('auth_user_id', authUserId)
    .select('id, company_id, auth_user_id, role, full_name, position, phone')
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: 'No company_users row found for this user' };
  }

  return { ok: true, user: data };
}

async function refreshSession({ refreshToken }) {
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    session: data.session,
    user: data.user,
  };
}

module.exports = {
  loginWithPassword,
  refreshSession,
  loadUserCompanyContext,
  logoutWithAccessToken,
  changePassword,
  updateUserProfile,
};
