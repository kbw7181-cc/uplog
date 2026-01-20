// ✅✅✅ 전체복붙: src/lib/getSafeImgSrc.ts
import { supabase } from '@/lib/supabaseClient';

type Opt = {
  bucket?: string;              // e.g. 'avatars', 'support_uploads'
  fallback?: string;            // e.g. '/gogo.png'
  cacheBust?: boolean;          // default true
};

function isHttpUrl(v: string) {
  return /^https?:\/\//i.test(v);
}

function isSupabaseRootUrl(v: string) {
  // ex) https://xxxx.supabase.co   or https://xxxx.supabase.co/
  return /^https?:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(v.trim());
}

function hasStoragePublicPath(v: string) {
  return /\/storage\/v1\/object\/public\//i.test(v);
}

export function getSafeImgSrc(raw: any, opt: Opt = {}) {
  const bucket = opt.bucket || 'avatars';
  const fallback = opt.fallback || '/gogo.png';
  const cacheBust = opt.cacheBust !== false;

  const v = typeof raw === 'string' ? raw.trim() : '';
  if (!v) return fallback;

  // ✅ supabase 루트 도메인만 들어오면 무조건 fallback (400 폭탄 차단)
  if (isSupabaseRootUrl(v)) return fallback;

  // ✅ 이미 완전한 public url이면 그대로(단, cache bust 옵션)
  if (isHttpUrl(v) && hasStoragePublicPath(v)) {
    return cacheBust ? `${v}${v.includes('?') ? '&' : '?'}v=${Date.now()}` : v;
  }

  // ✅ http(s)인데 storage 경로가 없으면(=깨진 URL일 확률 높음) fallback
  if (isHttpUrl(v) && v.includes('supabase.co') && !hasStoragePublicPath(v)) {
    return fallback;
  }

  // ✅ "avatars/xxx.png" 같은 storage 경로일 때
  // ✅ "userId/xxx.png" 같이 버킷 내부 경로만 있을 때
  // => getPublicUrl로 변환
  const path = v.replace(/^\/+/, '');
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  const url = (data?.publicUrl ? String(data.publicUrl) : '') || '';

  if (!url || isSupabaseRootUrl(url)) return fallback;

  return cacheBust ? `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}` : url;
}
