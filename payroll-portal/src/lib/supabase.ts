import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only initialize if both are present to avoid immediate crash
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({} as any, {
      get: (target, prop) => {
        if (prop === 'auth') {
          return new Proxy({}, { get: () => () => ({ data: { user: null }, error: null }) });
        }
        if (prop === 'from') {
          return () => ({
            select: () => ({
              order: () => Promise.resolve({ data: [], error: null })
            })
          });
        }
        return () => Promise.resolve({ data: null, error: new Error('Supabase not initialized') });
      }
    });
