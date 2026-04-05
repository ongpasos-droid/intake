const { createClient } = require('@supabase/supabase-js');

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
} else {
  console.warn('[supabase] SUPABASE_URL or SUPABASE_SERVICE_KEY not set — Supabase client disabled');
}

module.exports = supabase;
