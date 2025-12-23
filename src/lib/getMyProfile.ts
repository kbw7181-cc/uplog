// ✅ 파일: src/lib/getProfileSelect.ts
import { supabase } from '@/lib/supabaseClient';

type ProfileCols = {
  hasNickname: boolean;
  hasName: boolean;
  select: string;
};

// 🔒 런타임 동안 1회만 판별
let cached: ProfileCols | null = null;

export async function getProfileSelect(): Promise<ProfileCols> {
  if (cached) return cached;

  // ⚠️ avatar_url은 항상 그대로 유지 (변환 ❌)
  const base = 'user_id,avatar_url';

  // 1️⃣ nickname 컬럼 존재 여부 테스트
  {
    const { error } = await supabase.from('profiles').select(`${base},nickname`).limit(1);
    if (!error) {
      cached = { hasNickname: true, hasName: false, select: `${base},nickname` };
      return cached;
    }
  }

  // 2️⃣ name 컬럼 존재 여부 테스트
  {
    const { error } = await supabase.from('profiles').select(`${base},name`).limit(1);
    if (!error) {
      cached = { hasNickname: false, hasName: true, select: `${base},name` };
      return cached;
    }
  }

  // 3️⃣ 둘 다 없을 때 (최소 안전 셀렉트)
  cached = { hasNickname: false, hasName: false, select: base };
  return cached;
}
