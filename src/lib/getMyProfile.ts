// ✅✅✅ 전체복붙: src/lib/getMyProfile.ts
import { supabase } from '@/lib/supabaseClient';

export type MyProfile = {
  user_id: string;
  email?: string | null;
  nickname?: string | null;
  name?: string | null;
  role?: string | null;
  is_admin?: boolean;
  avatar_url?: string | null;
  created_at?: string | null;
  [key: string]: any;
};

export async function getMyProfileSafe() {
  // 1) session에서 uid 확보
  const { data: sess, error: sessErr } = await supabase.auth.getSession();
  if (sessErr) return { uid: null as string | null, profile: null as MyProfile | null, error: sessErr };

  const uid = sess.session?.user?.id ?? null;
  if (!uid) return { uid, profile: null, error: null };

  // 2) profiles: 중복 안전하게 최신 1개만
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(1);

  const profile = (data?.[0] ?? null) as MyProfile | null;

  return { uid, profile, error };
}
