// src/lib/rebuttalApi.ts
import { supabase } from './supabaseClient';
import type { Rebuttal, RebuttalFeedback } from '@/types/rebuttal';

export async function fetchRebuttals(userId: string) {
  const { data, error } = await supabase
    .from('rebuttals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Rebuttal[];
}

export async function fetchRebuttalDetail(id: string) {
  const { data: rebuttal, error } = await supabase
    .from('rebuttals')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;

  const { data: feedbacks, error: fErr } = await supabase
    .from('rebuttal_feedbacks')
    .select('*')
    .eq('rebuttal_id', id)
    .order('created_at', { ascending: true });

  if (fErr) throw fErr;

  return {
    rebuttal: rebuttal as Rebuttal,
    feedbacks: (feedbacks || []) as RebuttalFeedback[],
  };
}
