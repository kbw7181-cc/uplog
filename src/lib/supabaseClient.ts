// src/lib/supabaseClient.ts
"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[SUPABASE] ENV 값이 비어 있습니다.", {
    url: supabaseUrl,
    key: supabaseAnonKey ? "존재함(내용은 숨김)" : "없음",
  });
}

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    persistSession: true,
  },
});
