// ✅✅✅ 전체복붙: src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ✅ SSR 안전 storage
const storage =
  typeof window === 'undefined'
    ? undefined
    : {
        getItem: (key: string) => window.localStorage.getItem(key),
        setItem: (key: string, value: string) => window.localStorage.setItem(key, value),
        removeItem: (key: string) => window.localStorage.removeItem(key),
      };

// ✅ ENV 누락 시 앱이 "죽지 않게" 더미 클라이언트 제공 (화면에서 에러 표시 가능)
function makeStubSupabase(reason: string) {
  const err = () => Promise.reject(new Error(reason));
  return {
    __is_stub: true,
    __reason: reason,
    auth: {
      getSession: err,
      getUser: err,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: err,
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: err, maybeSingle: err }) }),
      update: err,
      insert: err,
      delete: err,
    }),
    storage: {
      from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }),
    },
  } as any;
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage,
        },
      })
    : makeStubSupabase(
        `ENV_MISSING: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY (url="${supabaseUrl ? 'OK' : 'EMPTY'}", key="${supabaseAnonKey ? 'OK' : 'EMPTY'}")`,
      );
