// ✅✅✅ 전체복붙: src/app/components/ThemeProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type ThemeMode = 'light' | 'dark';

export type ThemeSettings = {
  mode: ThemeMode;
  accent: string; // 예: '#a855f7'
};

type ThemeCtx = {
  settings: ThemeSettings;
  setSettings: (next: ThemeSettings) => void;
};

const DEFAULT_SETTINGS: ThemeSettings = {
  mode: 'light',
  accent: '#a855f7',
};

const ThemeContext = createContext<ThemeCtx | null>(null);

/** ✅ Provider */
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<ThemeSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('uplog_theme_settings');
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ThemeSettings>;
        setSettingsState({
          mode: parsed.mode === 'dark' ? 'dark' : 'light',
          accent: typeof parsed.accent === 'string' ? parsed.accent : DEFAULT_SETTINGS.accent,
        });
      }
    } catch {}
  }, []);

  const setSettings = (next: ThemeSettings) => {
    setSettingsState(next);
    try {
      localStorage.setItem('uplog_theme_settings', JSON.stringify(next));
    } catch {}
  };

  const value = useMemo(() => ({ settings, setSettings }), [settings]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** ✅ 훅: Provider 밖이어도 "throw 금지" (빌드/배포 우선) */
export function useThemeSettings(): ThemeCtx {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;

  // ✅ Provider가 아직 없거나 import가 꼬여도 빌드가 죽지 않게 fallback
  return {
    settings: DEFAULT_SETTINGS,
    setSettings: () => {},
  };
}
