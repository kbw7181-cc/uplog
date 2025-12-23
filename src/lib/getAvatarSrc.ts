// ✅ 파일: src/lib/getAvatarSrc.ts
import { supabase } from '@/lib/supabaseClient';

/**
 * avatar_url이
 * - https://... 형태면 그대로 사용
 * - "avatars/xxx.png" 같은 Storage 경로면 publicUrl로 변환
 * - 캐시 때문에 갱신이 안 보이면 ?v=timestamp 붙여서 bust
 */
export function getAvatarSrc(avatarUrl?: string | null, bust?: string): string {
  if (!avatarUrl) return '';
  const v = String(avatarUrl).trim();
  if (!v) return '';

  // 이미 URL이면 그대로
  if (v.startsWith('http://') || v.startsWith('https://')) {
    const sep = v.includes('?') ? '&' : '?';
    return bust ? `${v}${sep}v=${encodeURIComponent(bust)}` : v;
  }

  // Storage 경로면 변환
  try {
    const { data } = supabase.storage.from('avatars').getPublicUrl(v);
    const url = data?.publicUrl ?? '';
    if (!url) return v;

    const sep = url.includes('?') ? '&' : '?';
    return bust ? `${url}${sep}v=${encodeURIComponent(bust)}` : url;
  } catch {
    return v;
  }
}

export function getAvatarBust(): string {
  return String(Date.now());
}
