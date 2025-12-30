// ✅✅✅ 전체복붙: src/app/community/share/[id]/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ClientShell from '../../../components/ClientShell';
import { supabase } from '@/lib/supabaseClient';

export default function CommunityShareRunnerPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [msg, setMsg] = useState('공유 준비중…');
  const [detail, setDetail] = useState<string | null>(null);

  // ✅ 개발모드 StrictMode에서 useEffect 2번 실행 방지
  const ranRef = useRef(false);

  const payload = useMemo(() => {
    const title = (sp.get('title') || '').trim();
    const body = (sp.get('body') || '').trim();
    const rebuttalId = (sp.get('rebuttalId') || '').trim();
    const jobType = (sp.get('jobType') || '기타').trim();
    const category = (sp.get('category') || '반론공유').trim();

    return {
      title,
      body,
      rebuttalId,
      jobType,
      category,
    };
  }, [sp]);

  useEffect(() => {
    let alive = true;
    if (ranRef.current) return; // ✅ 한번만
    ranRef.current = true;

    (async () => {
      try {
        setMsg('로그인 확인 중…');
        setDetail(null);

        const { data: u, error: uErr } = await supabase.auth.getUser();
        if (!alive) return;

        if (uErr) {
          setMsg('인증 확인 실패');
          setDetail(String(uErr.message || uErr));
          return;
        }

        if (!u?.user) {
          router.replace('/login');
          return;
        }

        if (!payload.title || !payload.body) {
          setMsg('공유할 내용이 비어있어요. (title/body 필요)');
          setDetail(`받은 값\n- title: ${payload.title}\n- body: ${payload.body}`);
          return;
        }

        setMsg('커뮤니티에 업로드 중…');

        const insertPayload: any = {
          user_id: u.user.id,
          title: payload.title,
          body: payload.body,
          category: payload.category, // ✅ DB에 category 컬럼 추가 완료 가정
          job_type: payload.jobType, // ✅ DB에 job_type 컬럼 추가 완료 가정
          image_urls: null,
          rebuttal_id: payload.rebuttalId ? payload.rebuttalId : null,
        };

        const { data, error } = await supabase
          .from('community_posts')
          .insert(insertPayload)
          .select('id')
          .maybeSingle();

        if (!alive) return;

        if (error) {
          setMsg('공유 실패 ❌ (RLS/컬럼/테이블 확인 필요)');
          setDetail(
            `Supabase error:\n${String(error.message || error)}\n\ninsertPayload:\n${JSON.stringify(
              insertPayload,
              null,
              2
            )}`
          );
          return;
        }

        const newId = (data as any)?.id;
        if (!newId) {
          setMsg('공유는 되었는데 id를 못 받았어요. 목록으로 이동합니다…');
          router.replace('/community');
          return;
        }

        setMsg('공유 완료 ✅ 이동중…');
        router.replace(`/community/${newId}`);
      } catch (e: any) {
        setMsg('공유 처리 중 예외 발생');
        setDetail(String(e?.message || e));
      }
    })();

    return () => {
      alive = false;
    };
  }, [router, payload]);

  const Card: any = {
    maxWidth: 760,
    margin: '0 auto',
    padding: '20px 14px',
  };

  const Box: any = {
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    border: '1px solid rgba(60,30,90,0.12)',
    boxShadow: '0 18px 40px rgba(40,10,70,0.10)',
    padding: 16,
  };

  const Btn: any = {
    marginTop: 12,
    padding: '10px 12px',
    borderRadius: 14,
    border: '1px solid rgba(60,30,90,0.12)',
    backgroundColor: 'rgba(255,255,255,0.92)',
    fontWeight: 950,
    cursor: 'pointer',
    color: '#2a0f3a',
  };

  return (
    <ClientShell>
      <div style={Card}>
        <div style={Box}>
          <div style={{ fontSize: 18, fontWeight: 950, color: '#2a0f3a' }}>커뮤니티 공유</div>

          <div style={{ marginTop: 10, fontWeight: 900, color: '#2a0f3a', opacity: 0.82, whiteSpace: 'pre-wrap' }}>
            {msg}
          </div>

          {detail ? (
            <pre
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 14,
                backgroundColor: 'rgba(250,245,255,0.9)',
                border: '1px solid rgba(200,120,255,0.18)',
                color: '#2a0f3a',
                fontWeight: 800,
                fontSize: 12,
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {detail}
            </pre>
          ) : null}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" style={Btn} onClick={() => router.replace('/community')}>
              커뮤니티로 이동
            </button>
            <button type="button" style={Btn} onClick={() => router.back()}>
              뒤로가기
            </button>
          </div>
        </div>
      </div>
    </ClientShell>
  );
}
