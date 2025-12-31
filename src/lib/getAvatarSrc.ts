// ✅✅✅ 전체복붙: src/lib/getAvatarSrc.ts

import { supabase } from '@/lib/supabaseClient';

/**
 * avatar_url이
 * - 이미 http(s) URL이면 그대로 반환
 * - 'avatars/xxx.png' 같은 Storage 경로면 publicUrl로 변환
 * - 없으면 '' 반환
 *
 * ✅ 서버/빌드에서도 안전: 단순 문자열 처리만 함
 */
export function getAvatarSrc(avatar_url?: string | null): string {
  const v = (avatar_url ?? '').trim();
  if (!v) return '';

  // 이미 완성 URL이면 그대로
  if (v.startsWith('http://') || v.startsWith('https://')) return v;

  // data url도 그대로
  if (v.startsWith('data:')) return v;

  // supabase storage 경로(avatars/...)면 public url로 변환
  try {
    const { data } = supabase.storage.from('avatars').getPublicUrl(v);
    const url = data?.publicUrl ?? '';
    return url;
  } catch {
    return '';
  }
}
