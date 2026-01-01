// ✅✅✅ 전체복붙: src/lib/getAvatarSrc.ts
import { supabase } from '@/lib/supabaseClient';

export function getAvatarSrc(avatar_url?: string | null) {
  if (!avatar_url) return '';

  const s = String(avatar_url).trim();
  if (!s) return '';

  // 이미 완전한 URL이면 그대로
  if (s.startsWith('http://') || s.startsWith('https://')) return s;

  // data URL도 허용
  if (s.startsWith('data:image/')) return s;

  // storage 경로면 public url로 변환
  // 예: avatars/xxx.png  또는  /avatars/xxx.png
  const clean = s.replace(/^\/+/, '');
  const { data } = supabase.storage.from('avatars').getPublicUrl(clean);

  // 캐시 때문에 바뀐 이미지가 안 보일 수 있어 bust
  const url = data?.publicUrl ?? '';
  if (!url) return '';

  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${Date.now()}`;
}
