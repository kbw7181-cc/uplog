// ✅✅✅ 전체복붙: src/app/rebuttal/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ClientShell from '../components/ClientShell';
import { supabase } from '@/lib/supabaseClient';

type RebuttalType =
  | '가격 부담'
  | '시간 부족'
  | '이미 사용 중'
  | '가족/지인과 상의'
  | '신뢰/의심'
  | '보류/미루기'
  | '기타';

const REBUTTAL_OPTIONS: { id: RebuttalType; label: string }[] = [
  { id: '가격 부담', label: '가격 부담' },
  { id: '시간 부족', label: '시간 부족·바쁨' },
  { id: '이미 사용 중', label: '이미 사용 중' },
  { id: '가족/지인과 상의', label: '가족/지인과 상의' },
  { id: '신뢰/의심', label: '신뢰·의심·걱정' },
  { id: '보류/미루기', label: '보류·나중에 연락해 달라' },
  { id: '기타', label: '기타(직접 입력 가능)' },
];

const TYPE_HINT: Record<RebuttalType, string> = {
  '가격 부담':
    '가격 이야기는 최대한 짧게, 대신 고객이 얻는 변화와 이득을 이미지로 보여주면 좋아요.',
  '시간 부족':
    '시간을 빼앗는 느낌이 아니라, 오히려 시간을 절약해 주는 제안이라는 걸 보여주면 좋아요.',
  '이미 사용 중':
    '지금 쓰는 것의 장점을 먼저 인정해 주고, 대표님 제안의 차이를 “조금 더” 정도로 가볍게 제시해 보세요.',
  '가족/지인과 상의':
    '가족과 상의하는 태도 자체를 존중해 주고, 함께 볼 수 있는 자료·포인트를 정리해 주면 좋아요.',
  '신뢰/의심':
    '의심은 자연스러운 감정이에요. 솔직하게 인정해 주고, 다른 고객들의 변화 사례를 짧게 들려주세요.',
  '보류/미루기':
    '지금 당장 결정이 부담스럽다는 신호니까, “부담 없는 다음 스텝”을 하나만 제안해 보세요.',
  기타:
    '고객이 숨기고 있는 진짜 이유가 무엇인지, 부드럽게 한 번 더 물어볼 수 있는 질문을 준비해 두면 좋아요.',
};

const FIXED_GUIDE =
  '거절 멘트를 그대로 적어두면, 시간이 지나도 감정 대신 문장과 상황이 선명하게 남아요.';

type MyRebuttal = {
  id: string;
  created_at: string;
  category: string | null;
  content: string | null;
};

function formatKoreanDate(d: Date) {
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function toYYMMDD(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function RebuttalPage() {
  const router = useRouter();

  const [rebuttalType, setRebuttalType] = useState<RebuttalType>('가격 부담');
  const [customType, setCustomType] = useState('');
  const [rawText, setRawText] = useState('');
  const [situation, setSituation] = useState('');
  const [aiScript, setAiScript] = useState('');
  const [aiTips, setAiTips] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [myList, setMyList] = useState<MyRebuttal[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const [assetCount, setAssetCount] = useState<number>(0);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const todayLabel = useMemo(() => formatKoreanDate(new Date()), []);
  const effectiveTypeLabel = useMemo(() => {
    const c = customType.trim();
    if (c) return c;
    return rebuttalType;
  }, [customType, rebuttalType]);

  const loadMyRebuttals = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMyList([]);
        setAssetCount(0);
        return;
      }

      const { data, error } = await supabase
        .from('rebuttals')
        .select('id, created_at, category, content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(7);

      if (error || !data) {
        console.error(error);
        setMyList([]);
      } else {
        setMyList(data as MyRebuttal[]);
      }

      const { count, error: countError } = await supabase
        .from('rebuttals')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) {
        console.error(countError);
        setAssetCount(0);
      } else {
        setAssetCount(count ?? 0);
      }
    } catch (err) {
      console.error(err);
      setMyList([]);
      setAssetCount(0);
    }
  };

  useEffect(() => {
    loadMyRebuttals();
  }, []);

  const handleGetFeedback = () => {
    if (!rawText.trim()) {
      alert('오늘 받은 거절 멘트를 먼저 적어 주세요.');
      return;
    }
    if (rebuttalType === '기타' && !customType.trim()) {
      alert('거절 유형을 직접 입력해 주세요. (예: “배송/설치 걱정”, “효과 의심” 등)');
      return;
    }

    setLoading(true);
    setToast(null);

    const cleanRaw = rawText.trim();
    const cleanSituation = situation.trim();
    const typeForCopy = effectiveTypeLabel;

    const scriptLines: string[] = [];
    scriptLines.push('① 공감 한 마디');
    scriptLines.push(
      `“${cleanRaw}”라고 말씀해 주신 거 보니까, ${typeForCopy} 부분이 많이 신경 쓰이시는 것 같아요. 솔직하게 말씀해 주셔서 감사해요.`,
    );
    scriptLines.push('');
    scriptLines.push('② 진짜 이유 한 번 더 열어보기');
    scriptLines.push(
      '“대표님, 혹시 가장 걱정되시는 부분이 ‘지금 이 순간’일까요, 아니면 ‘바뀌었을 때 결과/적응’이 조금 불안하신 걸까요?”',
    );
    scriptLines.push('');
    scriptLines.push('③ 스토리텔링형 제안');
    scriptLines.push(
      '“제가 지금까지 도와드렸던 분들 중에도 처음에는 같은 말씀을 많이 하셨어요. 그런데 작은 변화부터 하나씩 해 보시면서, ‘이걸 왜 이제야 했을까’ 하신 분들이 많았거든요.”',
    );
    scriptLines.push('');
    scriptLines.push('④ 다음 스텝 가볍게 제안');
    scriptLines.push(
      '“오늘 당장 결정하지 않으셔도 돼요. 대신 대표님께 꼭 필요하신 부분만 쏙 정리해서, 5분만 딱 설명드려도 괜찮으실까요?”',
    );

    if (cleanSituation) {
      scriptLines.push('');
      scriptLines.push('※ 상황 메모 참고');
      scriptLines.push(cleanSituation);
    }

    const script = scriptLines.join('\n');

    const tip = `▪️ 유형: ${typeForCopy}
▪️ 핵심 포인트: ${
      rebuttalType === '기타'
        ? '직접 입력한 유형에 맞춰 “공감 → 질문 → 사례 → 다음 스텝” 순서를 유지해 보세요.'
        : TYPE_HINT[rebuttalType]
    }
▪️ 사용법: 거절 문장을 그대로 받아 적고, ① 공감 → ② 진짜 이유 질문 → ③ 사례·스토리 → ④ 부담 없는 다음 스텝 순서로 말해 보세요.`;

    setTimeout(() => {
      setAiScript(script);
      setAiTips(tip);
      setLoading(false);
      setToast('AI 스크립트를 만들었어요. 대표님 말투로 살짝만 다듬어 쓰시면 돼요.');
    }, 220);
  };

  const handleSave = async () => {
    if (!rawText.trim() || !aiScript.trim()) {
      alert('거절 멘트와 AI 스크립트가 모두 있어야 저장할 수 있어요.');
      return;
    }
    if (rebuttalType === '기타' && !customType.trim()) {
      alert('거절 유형을 직접 입력해 주세요. (예: “배송/설치 걱정”, “효과 의심” 등)');
      return;
    }

    setSaving(true);
    setToast(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert('로그인이 필요해요.');
        setSaving(false);
        return;
      }

      const categoryToSave = effectiveTypeLabel;

      const content = [
        `【거절 유형】 ${categoryToSave}`,
        '',
        '【받은 거절 멘트】',
        rawText.trim(),
        '',
        situation.trim() ? '【상황 메모】\n' + situation.trim() + '\n' : '',
        '【AI 공감형·스토리텔링 반론 스크립트】',
        aiScript.trim(),
        '',
        aiTips.trim()
          ? '【사용 팁】\n' + aiTips.trim()
          : '【사용 팁】\n대표님 말투에 맞게 살짝만 고쳐서 사용해 보세요.',
      ]
        .join('\n')
        .trim();

      const { error: insertError } = await supabase.from('rebuttals').insert({
        user_id: user.id,
        category: categoryToSave,
        content,
      });

      if (insertError) {
        console.error(insertError);
        alert('반론 아카이브 저장 중 오류가 발생했어요.');
      } else {
        setToast('오늘 반론 스크립트가 아카이브에 자산으로 저장됐어요.');
        setRawText('');
        setSituation('');
        setAiScript('');
        setAiTips('');
        setCustomType('');
        await loadMyRebuttals();
      }
    } catch (err) {
      console.error(err);
      alert('저장 중 알 수 없는 오류가 발생했어요.');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (item: MyRebuttal) => {
    const full = (item.content || '').trim();
    if (!full) {
      setToast('수정할 내용이 없습니다.');
      return;
    }
    setEditingId(item.id);
    setEditText(full);
    setToast('수정 모드예요. 다 고치고 “수정 완료” 눌러주세요.');
  };

  const handleFinishEdit = async (itemId: string) => {
    const next = editText.trim();
    if (!next) {
      alert('내용이 비어있어요.');
      return;
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert('로그인이 필요해요.');
        return;
      }

      const { error } = await supabase
        .from('rebuttals')
        .update({ content: next })
        .eq('id', itemId)
        .eq('user_id', user.id);

      if (error) {
        console.error(error);
        alert('수정 저장 중 오류가 발생했어요.');
        return;
      }

      setToast('수정 완료! 아카이브에 반영됐어요.');
      setEditingId(null);
      setEditText('');
      await loadMyRebuttals();
    } catch (err) {
      console.error(err);
      alert('수정 저장 중 알 수 없는 오류가 발생했어요.');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
    setToast('수정 취소했어요.');
  };

  const handleDelete = async (itemId: string) => {
    const ok = confirm('이 반론 자산을 삭제할까요? (되돌릴 수 없어요)');
    if (!ok) return;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert('로그인이 필요해요.');
        return;
      }

      const { error } = await supabase
        .from('rebuttals')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id);

      if (error) {
        console.error(error);
        alert('삭제 중 오류가 발생했어요.');
        return;
      }

      if (openId === itemId) setOpenId(null);
      if (editingId === itemId) {
        setEditingId(null);
        setEditText('');
      }

      setToast('삭제 완료. 목록에서 제거됐어요.');
      await loadMyRebuttals();
    } catch (err) {
      console.error(err);
      alert('삭제 중 알 수 없는 오류가 발생했어요.');
    }
  };

  const safeInsertCommunityPost = async (payload: any) => {
    const first = await supabase.from('community_posts').insert(payload);
    if (!first.error) return { ok: true as const };

    const e = first.error;
    const payload2 = { ...payload };
    if ('user_id' in payload2) {
      payload2.author_id = payload2.user_id;
      delete payload2.user_id;
    }
    const second = await supabase.from('community_posts').insert(payload2);
    if (!second.error) return { ok: true as const };

    return { ok: false as const, error: second.error ?? e };
  };

  const handleShareToCommunity = async (item: MyRebuttal) => {
    if (!item.content) {
      setToast('공유할 내용이 없습니다.');
      return;
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert('로그인이 필요해요.');
        return;
      }

      const lines = item.content
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);

      const typeLine = lines.find(l => l.startsWith('【거절 유형】')) || '';
      const rawIndex = lines.findIndex(l => l.startsWith('【받은 거절 멘트】'));
      const rawLine = rawIndex >= 0 ? lines[rawIndex + 1] ?? '' : '';
      const short = rawLine.length > 40 ? rawLine.slice(0, 40) + '…' : rawLine;

      const title =
        '[피드백] ' +
        (typeLine.replace('【거절 유형】', '').trim() || item.category || '반론 스크립트') +
        (short ? ' · ' + short : '');

      const payload: any = {
        category: '피드백',
        title,
        content: item.content,
        user_id: user.id,
      };

      const res = await safeInsertCommunityPost(payload);
      if (!res.ok) {
        console.error(res.error);
        alert(
          '커뮤니티 공유 중 오류가 발생했어요. community_posts 컬럼(user_id/author_id) 또는 RLS 정책을 확인해 주세요.',
        );
        return;
      }

      setToast('커뮤니티에 "피드백" 글로 자동 공유됐어요.');
      router.push('/community');
    } catch (err) {
      console.error(err);
      alert('커뮤니티 공유 중 알 수 없는 오류가 발생했어요.');
    }
  };

  const handleShareToFriend = (item: MyRebuttal) => {
    const raw = (item.content || '').trim();
    if (!raw) {
      setToast('공유할 내용이 없습니다.');
      return;
    }

    const shareText = ['[UPLOG 반론 스크립트 공유]', '', raw].join('\n');

    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('uplog-share-to-chat', shareText);
      }
      setToast('어느 친구에게 보낼지 선택해 주세요.');
      router.push('/chats');
    } catch (err) {
      console.error(err);
      setToast('공유 준비 중 오류가 발생했어요.');
    }
  };

  const renderContent = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="archive-content">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          let className = 'archive-line';

          if (
            trimmed.startsWith('【거절 유형】') ||
            trimmed.startsWith('【받은 거절 멘트】') ||
            trimmed.startsWith('【상황 메모】') ||
            trimmed.startsWith('【AI 공감형·스토리텔링 반론 스크립트】') ||
            trimmed.startsWith('【사용 팁】')
          ) {
            className += ' archive-line-tag';
          }

          if (
            trimmed.startsWith('①') ||
            trimmed.startsWith('②') ||
            trimmed.startsWith('③') ||
            trimmed.startsWith('④')
          ) {
            className += ' archive-line-step';
          }

          if (trimmed.startsWith('※ 상황 메모 참고')) {
            className += ' archive-line-note';
          }

          return (
            <p key={idx} className={className}>
              {line || '\u00A0'}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <ClientShell>
      <div className="rb-wrap">
        <div className="rb-inner">
          <div className="rb-title">
            <div className="rb-tag">UPLOG · REBUTTAL</div>
            <h1 className="rb-h1">반론 아카이브</h1>
          </div>

          {/* ✅ 말풍선+마스코트: 말풍선만 카드형 / 마스코트는 테두리 제거 + 사이즈 업 + 둥둥 */}
          <section className="rb-hero">
            <div className="rb-hero-bubble">
              <div className="rb-hero-badge">오늘 가이드</div>
              <div className="rb-hero-main">{FIXED_GUIDE}</div>
              <div className="rb-hero-sub">반론 자산은 ‘나의 아카이브’에 자동 누적됩니다.</div>
            </div>

            <div className="rb-hero-mascot">
              <img src="/assets/upzzu7.png" alt="업쮸" draggable={false} />
            </div>
          </section>

          {/* ===== 오늘 카드 ===== */}
          <section className="rb-card">
            <div className="rb-row">
              <span className="rb-label">오늘 날짜</span>
              <span className="rb-val">{todayLabel}</span>
            </div>
            <div className="rb-row">
              <span className="rb-label">오늘 상태</span>
              <span className="rb-pill rb-pill-warm">스크립트 연습 중</span>
            </div>
            <div className="rb-row">
              <span className="rb-label">AI 조합</span>
              <span className="rb-pill rb-pill-soft">대표님만의 자산 {assetCount}개 저장</span>
            </div>
          </section>

          {/* ===== 입력 ===== */}
          <section className="rb-sec">
            <div className="rb-sec-head">
              <h2 className="rb-h2">거절 유형 입력 · AI 피드백 받기</h2>
              <p className="rb-desc">
                거절 유형과 멘트를 저장해두면, AI가 <b>공감 멘트</b> + <b>스토리텔링 반론 스크립트</b>를 만들어요.
              </p>
            </div>

            <div className="rb-card">
              <div className="rb-type-row">
                <div className="rb-field">
                  <label className="rb-lbl rb-lbl-sm">거절 유형</label>
                  <select
                    className="rb-sel rb-sel-sm"
                    value={rebuttalType}
                    onChange={e => {
                      const v = e.target.value as RebuttalType;
                      setRebuttalType(v);
                      if (v !== '기타') setCustomType('');
                    }}
                  >
                    {REBUTTAL_OPTIONS.map(opt => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rb-field">
                  <label className="rb-lbl rb-lbl-sm">
                    직접 입력 <span className="rb-opt">(선택)</span>
                  </label>
                  <input
                    className="rb-inp rb-inp-sm"
                    placeholder='예) "배송/설치 걱정", "효과 의심"'
                    value={customType}
                    onChange={e => setCustomType(e.target.value)}
                  />
                </div>
              </div>

              <div className="rb-field">
                <label className="rb-lbl">오늘 받은 거절 멘트를 그대로 적어주세요.</label>
                <textarea
                  className="rb-ta"
                  rows={4}
                  placeholder="예) 지금은 생각이 없어요. 나중에 필요하면 제가 연락드릴게요."
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                />
              </div>

              <div className="rb-field">
                <label className="rb-lbl">
                  상황 메모 <span className="rb-opt">(선택)</span>
                </label>
                <textarea
                  className="rb-ta"
                  rows={3}
                  placeholder="예) 기존 고객 / 첫 통화 / 가격 부담을 많이 느끼는 상황 등 간단히 적어 두면 좋아요."
                  value={situation}
                  onChange={e => setSituation(e.target.value)}
                />
              </div>

              <div className="rb-btn-row">
                <button
                  type="button"
                  className="rb-btn rb-btn-primary"
                  onClick={handleGetFeedback}
                  disabled={loading}
                >
                  {loading ? 'AI 피드백 만드는 중…' : 'AI 피드백 받기'}
                </button>
              </div>
            </div>
          </section>

          {/* ===== 결과 ===== */}
          <section className="rb-sec">
            <div className="rb-sec-head">
              <h2 className="rb-h2">AI 반론 스크립트 · 사용 팁</h2>
              <p className="rb-desc">대표님 말투로 조금만 다듬어서 사용하면 돼요.</p>
            </div>

            <div className="rb-card rb-grid">
              <div className="rb-block">
                <div className="rb-block-ttl">AI가 제안하는 공감형·스토리텔링 반론</div>
                <textarea
                  className="rb-ta rb-ta-big"
                  rows={10}
                  value={aiScript}
                  onChange={e => setAiScript(e.target.value)}
                  placeholder="AI 피드백을 받으면 이곳에 스크립트가 표시됩니다."
                />
              </div>

              <div className="rb-block">
                <div className="rb-block-ttl">사용 팁 · 한 줄 정리</div>
                <textarea
                  className="rb-ta rb-ta-tip"
                  rows={6}
                  value={aiTips}
                  onChange={e => setAiTips(e.target.value)}
                  placeholder="예) 먼저 고객의 부담감을 인정해 주고, 가격이 아닌 ‘얻는 변화’를 그림 그려주기."
                />
              </div>
            </div>

            <div className="rb-btn-row rb-save-row">
              <button type="button" className="rb-btn rb-btn-save" onClick={handleSave} disabled={saving}>
                {saving ? '저장 중…' : '나의 반론 아카이브에 저장'}
              </button>
            </div>

            {toast && <div className="rb-toast">{toast}</div>}
          </section>

          {/* ===== 아카이브 ===== */}
          <section className="rb-sec">
            <div className="rb-sec-head">
              <h2 className="rb-h2">나의 반론 아카이브</h2>
              <p className="rb-desc">최근에 저장한 반론 스크립트가 여기에 정리돼요.</p>
            </div>

            <div className="rb-card rb-archive">
              {myList.length === 0 ? (
                <p className="rb-empty">아직 저장된 반론 스크립트가 없습니다.</p>
              ) : (
                <ul className="rb-list">
                  {myList.map(item => {
                    const dateLabel = toYYMMDD(item.created_at);
                    const full = item.content || '';

                    const lines = full.split('\n').map(l => l.trim());
                    const rawIndex = lines.findIndex(l => l.startsWith('【받은 거절 멘트】'));
                    const previewSource =
                      rawIndex >= 0
                        ? lines[rawIndex + 1] ?? ''
                        : lines.find(l => l.startsWith('“')) ?? '';
                    const preview =
                      previewSource.length > 44
                        ? previewSource.slice(0, 44) + ' ···'
                        : previewSource || '내용 미리보기를 불러올 수 없습니다.';

                    const isOpen = openId === item.id;
                    const isEditing = editingId === item.id;

                    return (
                      <li key={item.id} className="rb-item">
                        <button
                          type="button"
                          className={'rb-head' + (isOpen ? ' open' : '')}
                          onClick={() => {
                            if (isEditing) return;
                            setOpenId(isOpen ? null : item.id);
                          }}
                        >
                          <div className="rb-left">
                            <span className="rb-chip">{item.category || '유형 미지정'}</span>
                            <span className="rb-prev">{preview}</span>
                          </div>
                          <span className="rb-date">
                            {dateLabel}
                            <span className="rb-toggle">{isOpen ? '▲' : '▼'}</span>
                          </span>
                        </button>

                        {isOpen && (
                          <>
                            {!isEditing ? (
                              <>
                                {renderContent(full)}

                                <div className="rb-actions">
                                  <button
                                    type="button"
                                    className="rb-btn rb-btn-mini rb-ghost"
                                    onClick={() => handleStartEdit(item)}
                                  >
                                    수정
                                  </button>

                                  <button
                                    type="button"
                                    className="rb-btn rb-btn-mini rb-danger"
                                    onClick={() => handleDelete(item.id)}
                                  >
                                    삭제
                                  </button>

                                  <button
                                    type="button"
                                    className="rb-btn rb-btn-mini rb-community"
                                    onClick={() => handleShareToCommunity(item)}
                                  >
                                    커뮤니티에 공유
                                  </button>
                                  <button
                                    type="button"
                                    className="rb-btn rb-btn-mini rb-friend"
                                    onClick={() => handleShareToFriend(item)}
                                  >
                                    친구에게 공유
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="rb-edit">
                                  <div className="rb-edit-ttl">상세 내용 수정</div>
                                  <textarea
                                    className="rb-ta rb-ta-edit"
                                    rows={14}
                                    value={editText}
                                    onChange={e => setEditText(e.target.value)}
                                  />
                                </div>

                                <div className="rb-actions">
                                  <button
                                    type="button"
                                    className="rb-btn rb-btn-mini rb-btn-primary2"
                                    onClick={() => handleFinishEdit(item.id)}
                                  >
                                    수정 완료
                                  </button>
                                  <button
                                    type="button"
                                    className="rb-btn rb-btn-mini rb-ghost"
                                    onClick={handleCancelEdit}
                                  >
                                    취소
                                  </button>
                                  <button
                                    type="button"
                                    className="rb-btn rb-btn-mini rb-danger"
                                    onClick={() => handleDelete(item.id)}
                                  >
                                    삭제
                                  </button>
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>

        <style jsx global>{`
          /* ===== page background: 고객관리 톤(은은한 라벤더/핑크) ===== */
          .rb-wrap {
            min-height: 100vh;
            padding: 18px 22px 80px;
            box-sizing: border-box;
            background: linear-gradient(180deg, #f7f2ff 0%, #fdeaf6 55%, #f7f2ff 100%);
          }
          .rb-inner {
            max-width: 1100px;
            margin: 0 auto;
          }

          .rb-title {
            padding: 12px 6px 6px;
          }
          .rb-tag {
            font-size: 12px;
            letter-spacing: 0.18em;
            font-weight: 900;
            color: rgba(86, 60, 150, 0.65);
          }
          .rb-h1 {
            margin: 8px 0 0;
            font-size: 34px;
            font-weight: 1000;
            color: #2a1742;
          }

          /* ===== 헤더 카드(고객관리처럼) ===== */
          .rb-hero {
            margin-top: 14px;
            border-radius: 26px;
            background: linear-gradient(135deg, rgba(255, 214, 235, 0.75), rgba(217, 202, 255, 0.75));
            border: 2px solid rgba(236, 197, 255, 0.9);
            box-shadow: 0 16px 30px rgba(0, 0, 0, 0.12);
            padding: 16px 18px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            overflow: hidden;
          }

          /* 말풍선(카드형+테두리) */
          .rb-hero-bubble {
            flex: 1;
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.92);
            border: 1px solid rgba(223, 202, 255, 0.9);
            padding: 14px 16px;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
          }
          .rb-hero-badge {
            display: inline-block;
            font-size: 12px;
            font-weight: 1000;
            color: #7c3aed;
            background: rgba(246, 240, 255, 0.95);
            border: 1px solid rgba(223, 202, 255, 0.75);
            padding: 6px 10px;
            border-radius: 999px;
            margin-bottom: 10px;
          }
          .rb-hero-main {
            font-size: 16px;
            font-weight: 1000;
            color: #2a1742;
            line-height: 1.45;
          }
          .rb-hero-sub {
            margin-top: 6px;
            font-size: 12.5px;
            font-weight: 800;
            color: rgba(86, 60, 150, 0.68);
          }

          /* ✅✅✅ 마스코트: 테두리/카드효과 제거 + 사이즈 업 + 둥둥 */
          .rb-hero-mascot {
            width: 190px;
            height: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;

            /* ✅ 카드/테두리/배경 완전 제거 */
            background: transparent;
            border: none;
            box-shadow: none;

            /* 살짝 위로 띄워서 “둥둥” 더 자연스럽게 */
            transform: translateY(-2px);
          }
          .rb-hero-mascot img {
            width: 118px;
            height: 118px;
            object-fit: contain;
            user-select: none;
            -webkit-user-drag: none;

            /* 기존 드롭섀도는 유지(필요하면 약하게) */
            filter: drop-shadow(0 14px 18px rgba(0, 0, 0, 0.18));

            /* ✅ 둥둥 애니메이션 */
            animation: rb-float 2.8s ease-in-out infinite;
            will-change: transform;
          }

          @keyframes rb-float {
            0% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-10px);
            }
            100% {
              transform: translateY(0px);
            }
          }

          /* ===== 공통 카드 ===== */
          .rb-card {
            margin-top: 14px;
            border-radius: 26px;
            background: #ffffff;
            border: 1px solid rgba(229, 221, 255, 0.95);
            box-shadow: 0 16px 28px rgba(0, 0, 0, 0.12);
            padding: 18px 20px;
            box-sizing: border-box;
          }
          .rb-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
            padding: 8px 0;
            border-bottom: 1px dashed rgba(148, 114, 255, 0.28);
          }
          .rb-row:last-child {
            border-bottom: none;
          }
          .rb-label {
            color: rgba(86, 60, 150, 0.65);
            font-weight: 900;
          }
          .rb-val {
            color: #241336;
            font-weight: 1000;
          }
          .rb-pill {
            padding: 6px 12px;
            border-radius: 999px;
            font-size: 13px;
            font-weight: 1000;
          }
          .rb-pill-warm {
            background: linear-gradient(135deg, #ffb5df, #ff9ad1);
            color: #3b1030;
          }
          .rb-pill-soft {
            background: #f0ecff;
            color: #7a3aed;
          }

          /* ===== 섹션 ===== */
          .rb-sec {
            margin-top: 22px;
          }
          .rb-sec-head {
            margin: 0 0 12px;
            padding: 0 6px;
          }
          .rb-h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 1000;
            color: #2a1742;
          }
          .rb-desc {
            margin: 6px 0 0;
            font-size: 14px;
            color: rgba(58, 36, 92, 0.7);
            line-height: 1.6;
          }

          /* ===== 입력 ===== */
          .rb-field {
            margin-bottom: 14px;
          }
          .rb-lbl {
            display: block;
            font-size: 15px;
            font-weight: 1000;
            color: #5a3cb2;
            margin-bottom: 6px;
          }
          .rb-lbl-sm {
            font-size: 13px;
          }
          .rb-opt {
            font-size: 12px;
            font-weight: 900;
            color: #a78bfa;
          }

          .rb-type-row {
            display: grid;
            grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
            gap: 12px;
            margin-bottom: 2px;
          }

          .rb-sel,
          .rb-inp {
            width: 100%;
            border-radius: 999px;
            border: 1px solid #d6c7ff;
            background: #faf7ff;
            color: #241336;
            outline: none;
            box-sizing: border-box;
          }
          .rb-sel-sm,
          .rb-inp-sm {
            height: 36px;
            padding: 6px 12px;
            font-size: 13px;
          }
          .rb-sel:focus,
          .rb-inp:focus {
            border-color: #a855f7;
            box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.22);
          }
          .rb-inp::placeholder {
            color: #aa97e0;
          }

          .rb-ta {
            width: 100%;
            border-radius: 18px;
            border: 1px solid #d6c7ff;
            padding: 10px 12px;
            font-size: 15px;
            background: #faf7ff;
            color: #241336;
            outline: none;
            resize: vertical;
            line-height: 1.7;
            box-sizing: border-box;
          }
          .rb-ta:focus {
            border-color: #a855f7;
            box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.22);
          }
          .rb-ta::placeholder {
            color: #aa97e0;
          }
          .rb-ta-big {
            min-height: 220px;
          }
          .rb-ta-tip {
            min-height: 160px;
          }
          .rb-ta-edit {
            min-height: 260px;
            background: #fff;
          }

          /* ===== 버튼 ===== */
          .rb-btn-row {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 10px;
          }
          .rb-save-row {
            justify-content: flex-end;
          }
          .rb-btn {
            border: none;
            cursor: pointer;
            border-radius: 999px;
            padding: 10px 18px;
            font-size: 14px;
            font-weight: 1000;
          }
          .rb-btn:disabled {
            opacity: 0.7;
            cursor: default;
          }
          .rb-btn-primary {
            background: linear-gradient(135deg, #ff5aa9, #a855f7);
            color: #fff;
            box-shadow: 0 12px 22px rgba(0, 0, 0, 0.18);
          }
          .rb-btn-save {
            background: radial-gradient(circle at top left, #ff9ed5 0, #a35dff 70%);
            color: #fff;
            box-shadow: 0 14px 26px rgba(0, 0, 0, 0.2);
          }
          .rb-btn-primary2 {
            background: linear-gradient(135deg, #ff72b6, #7c3aed);
            color: #fff;
          }

          /* ===== 결과 2열 ===== */
          .rb-grid {
            display: grid;
            grid-template-columns: minmax(0, 2fr) minmax(0, 1.2fr);
            gap: 14px;
          }
          .rb-block {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .rb-block-ttl {
            font-size: 14px;
            font-weight: 1000;
            color: #6b41ff;
          }

          /* ===== toast ===== */
          .rb-toast {
            margin-top: 12px;
            border-radius: 999px;
            padding: 10px 14px;
            font-size: 13px;
            background: #ecfdf5;
            color: #047857;
            border: 1px solid #a7f3d0;
            font-weight: 1000;
          }

          /* ===== archive ===== */
          .rb-archive {
            padding-top: 16px;
          }
          .rb-empty {
            font-size: 14px;
            color: rgba(86, 60, 150, 0.7);
            line-height: 1.6;
          }
          .rb-list {
            list-style: none;
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .rb-item {
            padding: 10px 10px 12px;
            border-radius: 18px;
            border: 1px dashed #e0d5ff;
            background: #fbf9ff;
          }
          .rb-head {
            width: 100%;
            border: none;
            background: transparent;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 6px 6px;
            cursor: pointer;
          }
          .rb-head.open {
            border-bottom: 1px dashed #e0d5ff;
            padding-bottom: 10px;
            margin-bottom: 6px;
          }
          .rb-left {
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
            text-align: left;
          }
          .rb-chip {
            font-size: 13px;
            padding: 5px 10px;
            border-radius: 999px;
            background: #efe9ff;
            color: #5b21b6;
            font-weight: 1000;
            flex-shrink: 0;
          }
          .rb-prev {
            font-size: 14px;
            color: #4b365f;
            font-weight: 800;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 680px;
          }
          .rb-date {
            font-size: 12px;
            color: #a1a1aa;
            display: flex;
            align-items: center;
            gap: 6px;
            font-weight: 1000;
          }
          .rb-toggle {
            font-size: 11px;
          }

          .archive-content {
            margin-top: 8px;
            padding: 10px 12px;
            border-radius: 14px;
            background: #ffffff;
            border: 1px solid #e4ddff;
            font-size: 13.5px;
            line-height: 1.65;
            color: #423154;
          }
          .archive-line {
            margin: 0;
            white-space: pre-wrap;
            word-break: break-word;
          }
          .archive-line-tag {
            margin-top: 8px;
            font-weight: 1000;
            color: #6b21a8;
          }
          .archive-line-step {
            margin-top: 6px;
            font-weight: 1000;
            color: #ea580c;
          }
          .archive-line-note {
            font-size: 13px;
            color: #a16207;
            font-weight: 1000;
          }

          .rb-edit {
            margin-top: 10px;
            padding: 10px 12px;
            border-radius: 14px;
            background: #ffffff;
            border: 1px solid #e4ddff;
          }
          .rb-edit-ttl {
            font-size: 13px;
            font-weight: 1000;
            color: #6b41ff;
            margin-bottom: 8px;
          }

          .rb-actions {
            display: flex;
            gap: 10px;
            margin-top: 12px;
            flex-wrap: wrap;
          }
          .rb-btn-mini {
            padding: 9px 14px;
            font-size: 13px;
            font-weight: 1000;
            border: 1px solid transparent;
            box-shadow: none;
          }
          .rb-community {
            background: #fef2ff;
            color: #be185d;
            border: 1px solid #f9a8d4;
          }
          .rb-friend {
            background: #f0f9ff;
            color: #0369a1;
            border: 1px solid #7dd3fc;
          }
          .rb-ghost {
            background: #ffffff;
            color: #5b21b6;
            border: 1px solid #e4ddff;
          }
          .rb-danger {
            background: #fff1f2;
            color: #be123c;
            border: 1px solid #fecdd3;
          }

          @media (max-width: 960px) {
            .rb-wrap {
              padding: 16px 14px 70px;
            }
            .rb-grid {
              grid-template-columns: 1fr;
            }
            .rb-prev {
              max-width: 420px;
            }

            /* 모바일에서도 마스코트 “테두리 없이” 크게 유지 */
            .rb-hero-mascot {
              width: 170px;
              height: 112px;
            }
            .rb-hero-mascot img {
              width: 110px;
              height: 110px;
            }
          }

          @media (max-width: 640px) {
            .rb-h1 {
              font-size: 30px;
            }
            .rb-type-row {
              grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
            }
            .rb-hero {
              padding: 14px 14px;
            }

            .rb-hero-mascot {
              width: 150px;
              height: 104px;
            }
            .rb-hero-mascot img {
              width: 102px;
              height: 102px;
            }
          }
        `}</style>
      </div>
    </ClientShell>
  );
}
