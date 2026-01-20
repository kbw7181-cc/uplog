export async function safeFetch(input: RequestInfo | URL, init?: RequestInit) {
  const url = String(input);

  // ✅ supabase 루트 도메인만 치는 요청 차단(400 폭탄 방지)
  if (/^https?:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url.trim())) {
    console.warn('[safeFetch blocked]', url);
    // 빈 응답을 반환해도 되지만, 여기서는 명시적으로 에러를 던져 원인 추적이 쉬움
    throw new Error(`Blocked bad fetch url: ${url}`);
  }

  return fetch(input, init);
}
