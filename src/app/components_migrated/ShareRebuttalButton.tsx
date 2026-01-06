'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  rebuttalId: string;
  className?: string;
  label?: string;
};

export default function ShareRebuttalButton({ rebuttalId, className, label }: Props) {
  const [loading, setLoading] = useState(false);

  async function onShare() {
    if (!rebuttalId || loading) return;
    setLoading(true);

    try {
      // ✅ 목적: 반론아카이브의 내용을 "공유용"으로 커뮤니티 글쓰기 쪽에 넘기기
      // 현재 구조가 정확히 확정 전이라, 안전하게 localStorage + 라우팅(없으면 복사) 기반으로 처리
      const { data, error } = await supabase
        .from('rebuttals')
        .select('id,title,content,body,text,created_at')
        .eq('id', rebuttalId)
        .maybeSingle();

      if (error) throw error;

      const title =
        (data as any)?.title ??
        '반론 공유';

      const content =
        (data as any)?.content ??
        (data as any)?.body ??
        (data as any)?.text ??
        '';

      // ✅ 커뮤니티 글쓰기 화면에서 꺼내 쓰도록 저장
      try {
        localStorage.setItem(
          'uplog_share_rebuttal_prefill',
          JSON.stringify({
            rebuttalId,
            title,
            content,
            savedAt: Date.now(),
          })
        );
      } catch {}

      // ✅ 1순위: 커뮤니티 글쓰기(추후 복구될 화면)
      // 라우트가 막혀있거나 비활성화면, 복사로라도 공유 가능
      if (typeof window !== 'undefined') {
        // 일단 이동 시도
        window.location.href = `/community/write?from=rebuttal&id=${encodeURIComponent(rebuttalId)}`;
      }
    } catch (e) {
      // 이동이 안 되거나 에러면: 클립보드 복사로 안전 fallback
      try {
        const { data } = await supabase
          .from('rebuttals')
          .select('title,content,body,text')
          .eq('id', rebuttalId)
          .maybeSingle();

        const t = (data as any)?.title ?? '반론 공유';
        const c = (data as any)?.content ?? (data as any)?.body ?? (data as any)?.text ?? '';
        const clip = `${t}\n\n${c}`.trim();

        await navigator.clipboard.writeText(clip);
        alert('반론 내용을 복사했어요! 커뮤니티 글쓰기에서 붙여넣기 하면 됩니다.');
      } catch {
        alert('공유 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className={className ?? 'srbtn'}
      onClick={onShare}
      disabled={loading}
      aria-label="반론 공유하기"
    >
      {loading ? '공유중…' : (label ?? '공유하기')}

      <style jsx>{`
        .srbtn {
          border: 0;
          cursor: pointer;
          padding: 10px 12px;
          border-radius: 14px;
          font-weight: 900;
          font-size: 14px;
          color: #fff;
          background: linear-gradient(135deg, rgba(236, 72, 153, 0.95), rgba(168, 85, 247, 0.95));
          box-shadow: 0 12px 26px rgba(168, 85, 247, 0.18);
        }
        .srbtn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          box-shadow: none;
        }
      `}</style>
    </button>
  );
}
