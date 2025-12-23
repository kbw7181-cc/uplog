export function getAvatarBust(url?: string | null) {
  if (!url) return '';
  const u = String(url).trim();
  if (!u) return '';

  const sep = u.includes('?') ? '&' : '?';
  return `${u}${sep}v=${Date.now()}`;
}
