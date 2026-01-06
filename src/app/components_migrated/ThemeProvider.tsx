'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type ThemeName = 'lavender' | 'dark' | 'light' | 'blue';
type PlanName = 'free' | 'premium';

type ThemeSettings = {
  theme: ThemeName;
  plan: PlanName;
};

type Ctx = {
  loading: boolean;
  settings: ThemeSettings;
  setTheme: (t: ThemeName) => void;
  setPlan: (p: PlanName) => void;
  refresh: () => Promise<void>;
};

const DEFAULT_SETTINGS: ThemeSettings = {
  theme: 'lavender',
  plan: 'free',
};

const ThemeContext = createContext<Ctx | null>(null);

export function useThemeSettings() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeSettings must be used within ThemeProvider');
  return ctx;
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_SETTINGS);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSettings(DEFAULT_SETTINGS);
        return;
      }

      // ✅ profiles 테이블에 theme/plan 컬럼이 없을 수도 있으니 안전하게 처리
      const { data, error } = await supabase
        .from('profiles')
        .select('theme,plan')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        setSettings(DEFAULT_SETTINGS);
        return;
      }

      const next: ThemeSettings = {
        theme: (data as any)?.theme ?? DEFAULT_SETTINGS.theme,
        plan: (data as any)?.plan ?? DEFAULT_SETTINGS.plan,
      };

      setSettings(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setTheme = useCallback(async (t: ThemeName) => {
    setSettings((prev) => ({ ...prev, theme: t }));

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('profiles').update({ theme: t }).eq('user_id', user.id);
    } catch {}
  }, []);

  const setPlan = useCallback(async (p: PlanName) => {
    setSettings((prev) => ({ ...prev, plan: p }));

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('profiles').update({ plan: p }).eq('user_id', user.id);
    } catch {}
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      loading,
      settings,
      setTheme,
      setPlan,
      refresh,
    }),
    [loading, settings, setTheme, setPlan, refresh]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
