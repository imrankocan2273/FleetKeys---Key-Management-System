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

module.exports = { loginWithPassword, logoutWithAccessToken };
