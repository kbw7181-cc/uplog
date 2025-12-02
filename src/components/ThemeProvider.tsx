// src/components/ThemeProvider.tsx
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { supabase } from '../lib/supabaseClient';

type ThemeName = 'lavender' | 'dark' | 'light' | 'blue';
type PlanName = 'free' | 'premium';

type ThemeContextValue = {
  theme: ThemeName;
  plan: PlanName;
  loading: boolean;
  canChangeTheme: boolean;
  setTheme: (next: ThemeName) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = 'uplog-theme';

function applyThemeToDocument(theme: ThemeName) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('lavender');
  const [plan, setPlan] = useState<PlanName>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setLoading(true);

      // 1) 로컬 저장된 테마 먼저 적용 (깜빡임 줄이기)
      if (typeof window !== 'undefined') {
        const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as
          | ThemeName
          | null;
        if (stored) {
          setThemeState(stored);
          applyThemeToDocument(stored);
        } else {
          applyThemeToDocument('lavender');
        }
      }

      // 2) Supabase 프로필에서 plan / theme 가져오기
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, theme')
        .eq('id', user.id)
        .single();

      if (profile) {
        const nextPlan = (profile.plan || 'free') as PlanName;
        const nextTheme = (profile.theme || 'lavender') as ThemeName;
        setPlan(nextPlan);
        setThemeState(nextTheme);
        applyThemeToDocument(nextTheme);

        // 로컬에도 저장
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        }
      }

      setLoading(false);
    };

    init();
  }, []);

  const canChangeTheme = plan === 'premium';

  const setTheme = async (next: ThemeName) => {
    // 무료 플랜이면 변경 불가
    if (!canChangeTheme) {
      // 무료 계정일 때는 로컬만 기본 테마로 유지
      applyThemeToDocument('lavender');
      setThemeState('lavender');
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(THEME_STORAGE_KEY, 'lavender');
      }
      return;
    }

    setThemeState(next);
    applyThemeToDocument(next);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('profiles').update({ theme: next }).eq('id', user.id);
  };

  const value: ThemeContextValue = {
    theme,
    plan,
    loading,
    canChangeTheme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeSettings() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeSettings must be used within ThemeProvider');
  }
  return ctx;
}
