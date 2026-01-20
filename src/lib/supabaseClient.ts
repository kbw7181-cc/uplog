import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // 빌드/런타임에서 조용히 터지는 걸 막기 위해 명확히 드러내기
  // (개발에서만 console로 확인 가능)
  // eslint-disable-next-line no-console
  console.warn('[supabaseClient] Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// ✅ 브라우저에서 "단 하나"만 쓰게 전역 캐시
declare global {
  // eslint-disable-next-line no-var
  var __uplog_supabase__: SupabaseClient | undefined;
}

function createSingleton(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'uplog-auth', // ✅ 키 고정(충돌/중복 방지)
    },
  });
}

export const supabase: SupabaseClient =
  typeof window === 'undefined'
    ? createSingleton()
    : (globalThis.__uplog_supabase__ ??= createSingleton());
