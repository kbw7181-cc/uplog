const KEY = 'chat.readAt';

type ReadMap = Record<string, number>;

function isBrowser() {
  return typeof window !== 'undefined';
}

function load(): ReadMap {
  if (!isBrowser()) return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

function save(m: ReadMap) {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY, JSON.stringify(m));
}

export function markRead(roomId: string) {
  if (!isBrowser()) return;
  const m = load();
  m[roomId] = Date.now();
  save(m);
}

export function isUnread(roomId?: string | null, lastAt?: string | null) {
  if (!isBrowser()) return false;
  if (!roomId || !lastAt) return false;

  const m = load();
  const readAt = m[roomId] || 0;
  return new Date(lastAt).getTime() > readAt;
}
