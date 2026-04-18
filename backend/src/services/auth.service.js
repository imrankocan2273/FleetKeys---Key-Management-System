const { createClient } = require('@supabase/supabase-js');
const { supabase } = require('../config/supabase');
const { env } = require('../config/env');

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

async function loadUserCompanyProfile({ authUserId }) {
  const { data, error } = await supabase
    .from('company_users')
    .select('role, company_id, companies(name, business_type)')
    .eq('auth_user_id', authUserId)
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: 'No company profile found for this user' };
  }

  const company = Array.isArray(data.companies) ? data.companies[0] : data.companies;

  return {
    ok: true,
    profile: {
      role: data.role,
      company_id: data.company_id,
      company_name: company?.name || null,
      business_type: company?.business_type || null,
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

module.exports = {
  loginWithPassword,
  loadUserCompanyProfile,
  logoutWithAccessToken,
};
