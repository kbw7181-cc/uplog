// src/lib/getAvatarSrc.ts
import { supabase } from '@/lib/supabaseClient';

export function getAvatarSrc(avatarUrl?: string | null) {
  const v = (avatarUrl || '').trim();

  // ✅ 1) 없으면 기본 이미지 (public 루트)
  if (!v) return '/gogo.png'; // 또는 '/default-avatar.png'

  // ✅ 2) 이미 http(s)면 그대로
  if (/^https?:\/\//i.test(v)) return v;

  // ✅ 3) 절대경로(/something)이면 그대로
  if (v.startsWith('/')) return v;

  // ✅ 4) storage 경로(avatars/xxx.png 등)면 public url로 변환
  try {
    const { data } = supabase.storage.from('avatars').getPublicUrl(v);
    const url = data?.publicUrl ? String(data.publicUrl) : '';
    return url || '/gogo.png';
  } catch {
    return '/gogo.png';
  }
}
