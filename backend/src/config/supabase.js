
const { createClient } = require("@supabase/supabase-js");
const env = require("./env");

const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

const supabase =
  env.SUPABASE_URL && key
    ? createClient(env.SUPABASE_URL, key, { auth: { persistSession: false } })
    : null;

module.exports = supabase;
