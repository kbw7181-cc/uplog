// ✅ 파일: src/app/components/WeatherCard.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

type WeatherSlot = {
  time: string;   // "08시"
  temp: number;   // 섭씨
  desc: string;   // "맑음"
  icon: string;   // 이모지 or 아이콘문자
};

type Props = {
  // ✅ 대표님 홈에서 프로필 저장된 좌표를 넘겨주면 그 지역 날씨로 뜸
  lat?: number | null;
  lon?: number | null;

  // ✅ 좌표 없으면 기본 지역명(표시용)
  label?: string; // 예: "서울"
};

function iconByOpenWeather(main?: string) {
  const m = (main || '').toLowerCase();
  if (m.includes('clear')) return '☀️';
  if (m.includes('cloud')) return '⛅';
  if (m.includes('rain') || m.includes('drizzle')) return '🌧️';
  if (m.includes('thunder')) return '⛈️';
  if (m.includes('snow')) return '❄️';
  if (m.includes('mist') || m.includes('fog') || m.includes('haze')) return '🌫️';
  return '🌤️';
}

function koDesc(main?: string) {
  const m = (main || '').toLowerCase();
  if (m.includes('clear')) return '맑음';
  if (m.includes('cloud')) return '구름';
  if (m.includes('rain') || m.includes('drizzle')) return '비';
  if (m.includes('thunder')) return '천둥번개';
  if (m.includes('snow')) return '눈';
  if (m.includes('mist') || m.includes('fog') || m.includes('haze')) return '안개';
  return '흐림';
}

export default function WeatherCard({ lat, lon, label = '서울' }: Props) {
  const [nowTemp, setNowTemp] = useState<number | null>(null);
  const [slots, setSlots] = useState<WeatherSlot[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');

  const apiKey = useMemo(() => process.env.NEXT_PUBLIC_OPENWEATHER_KEY || '', []);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!apiKey) {
        setStatus('error');
        return;
      }

      setStatus('loading');

      // ✅ 좌표가 없으면 서울 좌표로 fallback
      const useLat = typeof lat === 'number' ? lat : 37.5665;
      const useLon = typeof lon === 'number' ? lon : 126.978;

      try {
        // ✅ 3시간 단위 예보(40개)에서 오늘~가까운 6개 슬롯 추출
        const url =
          `https://api.openweathermap.org/data/2.5/forecast` +
          `?lat=${useLat}&lon=${useLon}&appid=${apiKey}&units=metric&lang=kr`;

        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`OW fetch failed: ${res.status}`);

        const json = await res.json();

        const list = Array.isArray(json?.list) ? json.list : [];
        const city = json?.city;

        // 현재에 가장 가까운 항목을 now로 사용
        const first = list[0];
        const tNow = Math.round(first?.main?.temp ?? 0);

        const nextSlots: WeatherSlot[] = list.slice(0, 6).map((it: any) => {
          const dtTxt: string = String(it?.dt_txt || '');
          const hour = dtTxt ? dtTxt.slice(11, 13) : '00';
          const main = it?.weather?.[0]?.main as string | undefined;

          return {
            time: `${hour}시`,
            temp: Math.round(it?.main?.temp ?? 0),
            desc: koDesc(main),
            icon: iconByOpenWeather(main),
          };
        });

        if (!alive) return;

        setNowTemp(tNow);
        setSlots(nextSlots);
        setStatus('ok');
      } catch (e) {
        if (!alive) return;
        console.error('WeatherCard error', e);
        setStatus('error');
      }
    };

    run();

    return () => {
      alive = false;
    };
  }, [apiKey, lat, lon]);

  // ✅✅✅ 중요: 아래 리턴 JSX는 "디자인 고정"을 위해 최소만 제공합니다.
  // 대표님이 기존 WeatherCard UI가 있으면,
  // (1) 이 파일의 상태/로직만 가져가고
  // (2) return 부분은 대표님 기존 그대로 두세요.
  return (
    <div className="rounded-3xl bg-white/5 border border-white/10 p-4 md:p-5 shadow-[0_18px_55px_rgba(0,0,0,0.6)]">
      <div className="flex items-end justify-between">
        <h2 className="text-sm md:text-base font-black text-white/90">날씨</h2>
        <div className="text-xs font-black text-white/60">{label}</div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="text-3xl font-black text-white">{nowTemp ?? '--'}°</div>
        <div className="text-xs font-black text-white/60">
          {status === 'loading' ? '불러오는 중…' : status === 'error' ? '날씨 오류' : '실데이터'}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 md:grid-cols-6 gap-2">
        {slots.map((w, i) => (
          <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-2 text-center">
            <div className="text-xs font-black text-white/70">{w.time}</div>
            <div className="text-lg">{w.icon}</div>
            <div className="text-sm font-black text-white">{w.temp}°</div>
            <div className="text-[11px] font-black text-white/60">{w.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
