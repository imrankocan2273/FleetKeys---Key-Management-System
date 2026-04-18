const { createClient } = require('@supabase/supabase-js');
const { env } = require('./env');

const commonOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
};

const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, commonOptions);
const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, commonOptions);

module.exports = { supabase, supabaseAdmin };
