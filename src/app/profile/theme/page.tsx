// src/app/profile/theme/page.tsx
'use client';

import { useThemeSettings } from '../../../components/ThemeProvider';

type ThemeOption = {
  id: 'lavender' | 'dark' | 'light' | 'blue';
  label: string;
  desc: string;
};

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'lavender',
    label: '라벤더',
    desc: '기본 핑크 + 퍼플 감성',
  },
  {
    id: 'dark',
    label: '다크 모드',
    desc: '어두운 배경 + 네온 포인트',
  },
  {
    id: 'light',
    label: '화이트',
    desc: '밝고 깨끗한 화이트 톤',
  },
  {
    id: 'blue',
    label: '블루',
    desc: '시원한 블루 포인트',
  },
];

export default function ThemeSettingsPage() {
  const { theme, plan, loading, canChangeTheme, setTheme } = useThemeSettings();

  const handleSelect = async (id: ThemeOption['id']) => {
    if (!canChangeTheme) return;
    await setTheme(id);
  };

  return (
    <div
      style={{
        maxWidth: 880,
        margin: '32px auto',
        padding: '0 16px 40px',
        color: 'var(--text-main)',
      }}
    >
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>
        화면 테마 설정
      </h1>
      <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 16 }}>
        유료 회원(Premium)은 UPLOG를 라벤더 / 다크 / 화이트 / 블루 테마로
        자유롭게 변경할 수 있어요.
      </p>

      <div
        style={{
          marginBottom: 16,
          padding: 12,
          borderRadius: 14,
          background: 'var(--card-soft)',
          fontSize: 13,
        }}
      >
        <div style={{ marginBottom: 4 }}>
          <strong>현재 플랜:</strong>{' '}
          <span style={{ textTransform: 'uppercase' }}>
            {plan === 'premium' ? 'Premium (유료)' : 'Free (무료)'}
          </span>
        </div>
        {plan === 'free' ? (
          <div style={{ opacity: 0.85 }}>
            🎀 현재는 기본 라벤더 테마만 사용할 수 있어요.
            <br />
            추후 유료 결제 전환 시, 다크/화이트/블루 테마가 모두
            열립니다.
          </div>
        ) : (
          <div style={{ opacity: 0.9 }}>✨ Premium 계정입니다. 원하는 테마를 골라 보세요.</div>
        )}
      </div>

      {loading && (
        <p style={{ fontSize: 13, opacity: 0.75 }}>프로필 정보를 불러오는 중입니다…</p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginTop: 8,
        }}
      >
        {THEME_OPTIONS.map((opt) => {
          const isActive = theme === opt.id;
          const isLocked = !canChangeTheme && opt.id !== 'lavender';

          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              disabled={isLocked || loading}
              style={{
                position: 'relative',
                textAlign: 'left',
                padding: '14px 14px 16px',
                borderRadius: 18,
                border: isActive
                  ? '2px solid var(--primary)'
                  : '1px solid var(--border-subtle)',
                background: 'var(--card)',
                boxShadow: isActive ? 'var(--shadow-soft)' : 'none',
                cursor: isLocked ? 'not-allowed' : 'pointer',
                opacity: isLocked ? 0.55 : 1,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 14 }}>
                  {opt.label}
                </span>
                {isActive && (
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: 'var(--primary-soft)',
                      color: 'var(--primary-strong)',
                    }}
                  >
                    사용 중
                  </span>
                )}
              </div>
              <p
                style={{
                  fontSize: 12,
                  opacity: 0.8,
                  margin: 0,
                  minHeight: 32,
                }}
              >
                {opt.desc}
              </p>

              {isLocked && (
                <div
                  style={{
                    position: 'absolute',
                    right: 10,
                    bottom: 10,
                    fontSize: 11,
                    opacity: 0.9,
                  }}
                >
                  🔒 Premium 전용
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
