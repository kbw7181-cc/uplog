// ✅ 파일: src/lib/weatherClient.ts
export type WeatherSlot = { time: string; temp: number; desc: string };

function pickRegionByAddress(addressText?: string | null) {
  const t = (addressText ?? '').trim();
  if (!t) return { label: '서울', lat: 37.5665, lon: 126.9780 };

  const map: Record<string, { label: string; lat: number; lon: number }> = {
    서울: { label: '서울', lat: 37.5665, lon: 126.978 },
    부산: { label: '부산', lat: 35.1796, lon: 129.0756 },
    대전: { label: '대전', lat: 36.3504, lon: 127.3845 },
    대구: { label: '대구', lat: 35.8714, lon: 128.6014 },
    인천: { label: '인천', lat: 37.4563, lon: 126.7052 },
    광주: { label: '광주', lat: 35.1595, lon: 126.8526 },
    울산: { label: '울산', lat: 35.5384, lon: 129.3114 },
    세종: { label: '세종', lat: 36.48, lon: 127.289 },
    경기: { label: '경기', lat: 37.4138, lon: 127.5183 },
    강원: { label: '강원', lat: 37.8228, lon: 128.1555 },
    충북: { label: '충북', lat: 36.6357, lon: 127.4915 },
    충남: { label: '충남', lat: 36.5184, lon: 126.8 },
    전북: { label: '전북', lat: 35.7175, lon: 127.153 },
    전남: { label: '전남', lat: 34.8161, lon: 126.4629 },
    경북: { label: '경북', lat: 36.576, lon: 128.5056 },
    경남: { label: '경남', lat: 35.4606, lon: 128.2132 },
    제주: { label: '제주', lat: 33.4996, lon: 126.5312 },
  };

  for (const key of Object.keys(map)) {
    if (t.includes(key)) return map[key];
  }
  return { label: '서울', lat: 37.5665, lon: 126.978 };
}

export function resolveRegionFromProfile(profile: any) {
  const addr = (profile?.address_text ?? null) as string | null;
  const lat = profile?.lat;
  const lon = profile?.lon;

  if (typeof lat === 'number' && typeof lon === 'number') {
    const label = addr?.trim() ? addr.split(' ')[0] : '내 지역';
    return { label, lat, lon };
  }

  const picked = pickRegionByAddress(addr);
  return picked;
}

export async function fetchLiveWeatherSlots(lat: number, lon: number): Promise<WeatherSlot[]> {
  const key = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
  if (!key) throw new Error('NEXT_PUBLIC_OPENWEATHER_KEY missing');

  const url =
    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}` +
    `&appid=${key}&units=metric&lang=kr`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`weather fetch failed: ${res.status}`);
  const json = await res.json();

  const list = Array.isArray(json?.list) ? json.list : [];
  const slots: WeatherSlot[] = list.slice(0, 6).map((it: any) => {
    const dt = typeof it?.dt === 'number' ? it.dt * 1000 : Date.now();
    const d = new Date(dt);
    const hh = `${String(d.getHours()).padStart(2, '0')}:00`;
    const temp = Math.round(Number(it?.main?.temp ?? 0));
    const desc = String(it?.weather?.[0]?.description ?? '흐림');
    return { time: hh, temp, desc };
  });

  return slots;
}
