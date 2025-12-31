/**
 * ✅ 프로젝트 공통 자산 경로
 * - upzzu / 로고 등은 public/assets 아래에 둔다는 전제
 * - 이후 파일 위치가 바뀌어도 여기만 수정하면 전 페이지가 따라감
 */
export function assetPath(p: string) {
  const clean = (p || '').replace(/^\/+/, '');
  return `/assets/${clean}`;
}

// ✅ 자주 쓰는 것들은 상수로
export const UPZZU_FALLBACK = assetPath('upzzu1.png');
export const LOGO_PATH = assetPath('lolo.png');
