import { createClient } from '@supabase/supabase-js';

// These should be in your frontend/.env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase Client Init:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  url: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING'
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL and Anon Key are required. Please check your .env.local file.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
