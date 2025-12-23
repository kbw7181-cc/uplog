export function hardLogout() {
  try {
    // Supabase가 쓰는 토큰 키들 싹 제거
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith('sb-') && k.endsWith('-auth-token')) keys.push(k);
      if (k.includes('supabase.auth')) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {}

  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (!k) continue;
      if (k.startsWith('sb-') && k.endsWith('-auth-token')) keys.push(k);
      if (k.includes('supabase.auth')) keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {}

  // ✅ 가장 확실한 이동
  window.location.href = '/login';
}
