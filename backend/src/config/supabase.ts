import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables!');
}

// Service role client - has full access, bypasses RLS
// This is ONLY used on the backend, never exposed to frontend
export const createSupabaseAdminClient = () =>
  createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

export const supabaseAdmin = createSupabaseAdminClient();

console.log('✅ Supabase Admin client initialized (credentials hidden from frontend)');

