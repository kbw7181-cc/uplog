export type CityKey =
  | '서울'
  | '부산'
  | '대구'
  | '인천'
  | '광주'
  | '대전'
  | '울산'
  | '세종'
  | '경기'
  | '강원'
  | '충북'
  | '충남'
  | '전북'
  | '전남'
  | '경북'
  | '경남'
  | '제주';

export const CITY_COORDS: Record<CityKey, { lat: number; lon: number }> = {
  서울: { lat: 37.5665, lon: 126.978 },
  부산: { lat: 35.1796, lon: 129.0756 },
  대구: { lat: 35.8714, lon: 128.6014 },
  인천: { lat: 37.4563, lon: 126.7052 },
  광주: { lat: 35.1595, lon: 126.8526 },
  대전: { lat: 36.3504, lon: 127.3845 },
  울산: { lat: 35.5384, lon: 129.3114 },
  세종: { lat: 36.4801, lon: 127.289 },
  경기: { lat: 37.4138, lon: 127.5183 },
  강원: { lat: 37.8228, lon: 128.1555 },
  충북: { lat: 36.6357, lon: 127.4914 },
  충남: { lat: 36.6588, lon: 126.6728 },
  전북: { lat: 35.7175, lon: 127.153 },
  전남: { lat: 34.8679, lon: 126.991 },
  경북: { lat: 36.4919, lon: 128.8889 },
  경남: { lat: 35.4606, lon: 128.2132 },
  제주: { lat: 33.4996, lon: 126.5312 },
};

export function extractCity(address?: string | null): CityKey {
  if (!address) return '서울';
  const keys = Object.keys(CITY_COORDS) as CityKey[];
  const found = keys.find((k) => address.includes(k));
  return found ?? '서울';
}
