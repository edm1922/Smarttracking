import { createClient } from '@supabase/supabase-js';

// Helper to safely get environment variables
const getEnv = (key: string) => {
  if (typeof window === 'undefined') {
    return process.env[key] || '';
  }
  return process.env[key] || '';
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

// Only initialize if both are present to avoid immediate crash
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({} as any, {
      get: (target, prop) => {
        if (prop === 'auth') {
          return new Proxy({}, { get: () => () => ({ data: {}, error: null }) });
        }
        return () => Promise.resolve({ data: null, error: new Error('Supabase not initialized') });
      }
    });
