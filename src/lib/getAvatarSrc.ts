import { supabase } from './supabaseClient';

export function getAvatarSrc(avatar_url?: string | null) {
  if (!avatar_url) return '/assets/default-avatar.png';

  // 이미 완성 URL이면 그대로
  if (avatar_url.startsWith('http')) {
    return avatar_url;
  }

  // Storage 경로면 public URL로 변환
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(avatar_url);

  return data.publicUrl;
}
