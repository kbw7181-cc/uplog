// ✅✅✅ 전체복붙: src/lib/kpiClient.ts
import { supabase } from '@/lib/supabaseClient';

export type UserKpis = {
  month_start: string;
  month_end: string;
  contracts_month: number;
  posts_month: number;
  comments_month: number;
  likes_given_month: number;
  cheers_received_month: number;
};

function monthStartYMD(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const dd = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export async function fetchMyKpis(monthStart?: string): Promise<UserKpis> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) {
    return {
      month_start: monthStart || monthStartYMD(),
      month_end: monthStart || monthStartYMD(),
      contracts_month: 0,
      posts_month: 0,
      comments_month: 0,
      likes_given_month: 0,
      cheers_received_month: 0,
    };
  }

  const p_month_start = monthStart || monthStartYMD();

  const { data, error } = await supabase.rpc('get_user_kpis', {
    p_uid: uid,
    p_month_start,
  });

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return {
      month_start: p_month_start,
      month_end: p_month_start,
      contracts_month: 0,
      posts_month: 0,
      comments_month: 0,
      likes_given_month: 0,
      cheers_received_month: 0,
    };
  }

  const row = data[0] as any;

  return {
    month_start: String(row.month_start || p_month_start),
    month_end: String(row.month_end || p_month_start),
    contracts_month: Number(row.contracts_month || 0),
    posts_month: Number(row.posts_month || 0),
    comments_month: Number(row.comments_month || 0),
    likes_given_month: Number(row.likes_given_month || 0),
    cheers_received_month: Number(row.cheers_received_month || 0),
  };
}
