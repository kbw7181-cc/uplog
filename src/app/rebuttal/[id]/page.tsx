// src/app/rebuttal/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

type RebuttalRow = {
  id: string;
  [key: string]: any; // 컬럼 이름이 조금 달라도 에러 안 나게 any 처리
};

export default function RebuttalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id ?? '') as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [rebuttal, setRebuttal] = useState<RebuttalRow | null>(null);
  const [originalText, setOriginalText] = useState('');
  const [aiFeedback, setAiFeedback] = useState('');
  const [myScript, setMyScript] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchRebuttal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchRebuttal() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('rebuttals')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      const row = data as RebuttalRow;
      setRebuttal(row);

      // 컬럼 이름이 프로젝트마다 다를 수 있어서 여러 후보 중 하나 골라서 사용
      const original =
        row.original_text ||
        row.raw_text ||
        row.rebuttal_text ||
        row.content ||
        '';
      const feedback =
        row.ai_feedback ||
        row.feedback ||
        row.ai_reply ||
        row.review_text ||
        '';
      const script =
        row.my_script ||
        row.final_script ||
        row.user_script ||
        row.my_rebuttal ||
        '';

      setOriginalText(original);
      setAiFeedback(feedback);
      setMyScript(script);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message ?? '반론을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveMyScript() {
    if (!id) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase
        .from('rebuttals')
        .update({
          // 내 최종 스크립트 저장
          my_script: myScript.trim() || null,
          // 상태 컬럼이 있을 때를 대비해서 값도 같이 정리
          status: 'final',
        })
        .eq('id', id);

      if (error) throw error;
      alert('내 반론 스크립트가 저장되었습니다.');
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message ?? '저장 중 오류가 발생했습니다.');
      alert('저장 중 오류가 발생했습니다.\n' + (e.message ?? ''));
    } finally {
      setSaving(false);
    }
  }

  function handleShareToFriend() {
    // 친구(메모 채팅) 쪽으로 공유 – 일단 rebuttalId만 넘겨줌
    router.push(`/memo-chat?rebuttalId=${id}`);
  }

  function handleShareToCommunity() {
    // 커뮤니티 글쓰기로 이동 – rebuttalId를 쿼리로 넘김
    router.push(`/community?rebuttalId=${id}`);
  }

  if (!id) {
    return (
      <div className="min-h-screen bg-[#05020A] text-white flex items-center justify-center">
        잘못된 접근입니다.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05020A] text-white px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold mb-1">반론 아카이브</h1>
            <p className="text-sm text-gray-400">
              반론 문장 · AI 피드백 · 내가 정리한 스크립트를 한 번에 관리
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-3 py-1.5 rounded-full border border-gray-700 text-sm hover:bg-white/5"
          >
            ← 목록으로
          </button>
        </header>

        {loading ? (
          <p className="text-sm text-gray-400">불러오는 중...</p>
        ) : errorMsg ? (
          <p className="text-sm text-red-400">오류: {errorMsg}</p>
        ) : !rebuttal ? (
          <p className="text-sm text-gray-400">반론 정보를 찾을 수 없습니다.</p>
        ) : (
          <div className="space-y-5">
            {/* 카테고리/상태 정보 */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {rebuttal.category && (
                <span className="inline-flex items-center rounded-full bg-pink-500/10 border border-pink-400/60 px-3 py-1 text-pink-200">
                  {rebuttal.category}
                </span>
              )}
              {rebuttal.status && (
                <span className="inline-flex items-center rounded-full bg-sky-500/10 border border-sky-400/60 px-3 py-1 text-sky-200">
                  {rebuttal.status === 'final'
                    ? '최종본'
                    : rebuttal.status === 'draft'
                    ? '수정 예정'
                    : rebuttal.status}
                </span>
              )}
              {rebuttal.created_at && (
                <span className="text-gray-400">
                  {new Date(rebuttal.created_at).toLocaleString()}
                </span>
              )}
            </div>

            {/* 1. 내가 입력한 반론 문장 */}
            <section className="bg-[#111018] rounded-2xl p-4 border border-gray-800">
              <h2 className="text-sm font-semibold mb-2">내가 받은 고객 반론</h2>
              <textarea
                className="w-full rounded-xl bg-black/60 border border-gray-700 px-3 py-2 text-sm outline-none resize-none min-h-[80px]"
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
                placeholder="예: 생각해보고 연락드릴게요, 직장이 너무 바빠요 등"
              />
              <p className="mt-1 text-xs text-gray-500">
                필요하면 이 문장도 직접 수정해서 보관할 수 있습니다.
              </p>
            </section>

            {/* 2. AI 피드백 영역 (읽기 전용) */}
            <section className="bg-[#111018] rounded-2xl p-4 border border-pink-500/40">
              <h2 className="text-sm font-semibold mb-2">AI 피드백 / 제안 스크립트</h2>
              <div className="rounded-xl bg-black/60 border border-gray-700 px-3 py-2 text-sm whitespace-pre-wrap min-h-[80px]">
                {aiFeedback
                  ? aiFeedback
                  : '아직 저장된 AI 피드백이 없습니다. (새 반론 생성 화면에서 AI 피드백을 받아 저장하면 이곳에 표시됩니다.)'}
              </div>
            </section>

            {/* 3. 내가 정리한 최종 반론 스크립트 */}
            <section className="bg-[#111018] rounded-2xl p-4 border border-emerald-500/30">
              <h2 className="text-sm font-semibold mb-2">내가 정리한 반론 스크립트</h2>
              <textarea
                className="w-full rounded-xl bg-black/60 border border-gray-700 px-3 py-2 text-sm outline-none resize-none min-h-[120px]"
                value={myScript}
                onChange={(e) => setMyScript(e.target.value)}
                placeholder="AI 피드백을 참고해서, 실제로 고객에게 사용할 나만의 멘트를 정리해 두세요."
              />
              <div className="flex justify-between items-center mt-3">
                <p className="text-xs text-gray-500">
                  자주 쓰는 멘트를 여기 저장해 두고, 나중에 복사해서 바로 사용할 수 있습니다.
                </p>
                <button
                  type="button"
                  onClick={handleSaveMyScript}
                  disabled={saving}
                  className="px-4 py-1.5 rounded-full bg-emerald-500 text-xs font-semibold hover:bg-emerald-400 disabled:opacity-60"
                >
                  {saving ? '저장 중...' : '내 스크립트 저장'}
                </button>
              </div>
            </section>

            {/* 4. 공유 버튼 */}
            <section className="bg-[#111018] rounded-2xl p-4 border border-gray-800">
              <h2 className="text-sm font-semibold mb-3">공유하기</h2>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleShareToFriend}
                  className="px-4 py-2 rounded-full bg-pink-500 text-sm font-semibold hover:bg-pink-400"
                >
                  친구에게 공유 (채팅)
                </button>
                <button
                  type="button"
                  onClick={handleShareToCommunity}
                  className="px-4 py-2 rounded-full bg-purple-500 text-sm font-semibold hover:bg-purple-400"
                >
                  커뮤니티에 공유
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                버튼을 누르면 해당 반론 내용과 내 스크립트를 가지고 이동한 화면에서
                친구 채팅 또는 커뮤니티 글로 이어서 작성할 수 있습니다.
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
