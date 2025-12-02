// src/app/sms-helper/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type SmsTemplate = {
  id: string;
  user_id: string;
  category: string;
  title: string;
  content: string;
  is_favorite: boolean;
  created_at: string;
};

export default function SmsHelperPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [category, setCategory] = useState('배송 안내');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [onlyFavorite, setOnlyFavorite] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert('로그인이 필요합니다.');
        return;
      }
      setUserId(user.id);
      await fetchTemplates(user.id, false);
    }
    loadUser();
  }, []);

  async function fetchTemplates(uId: string, favoriteOnly: boolean) {
    setLoading(true);
    try {
      let query = supabase
        .from('sms_templates')
        .select('*')
        .eq('user_id', uId)
        .order('created_at', { ascending: false });

      if (favoriteOnly) {
        query = query.eq('is_favorite', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTemplates((data || []) as SmsTemplate[]);
    } catch (e: any) {
      console.error(e);
      alert('문자 템플릿을 불러오는 중 오류가 발생했습니다.\n' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!userId) {
      alert('로그인이 필요합니다.');
      return;
    }
    if (!title.trim()) {
      alert('템플릿 이름을 입력해 주세요.');
      return;
    }
    if (!content.trim()) {
      alert('문자 내용을 입력해 주세요.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('sms_templates').insert({
        user_id: userId,
        category,
        title: title.trim(),
        content: content.trim(),
        is_favorite: false,
      });
      if (error) throw error;

      setTitle('');
      setContent('');
      await fetchTemplates(userId, onlyFavorite);
      alert('문자 템플릿이 저장되었습니다.');
    } catch (e: any) {
      console.error(e);
      alert('저장 중 오류가 발생했습니다.\n' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleFavorite(t: SmsTemplate) {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('sms_templates')
        .update({ is_favorite: !t.is_favorite })
        .eq('id', t.id)
        .eq('user_id', userId);
      if (error) throw error;
      await fetchTemplates(userId, onlyFavorite);
    } catch (e: any) {
      console.error(e);
      alert('즐겨찾기 변경 중 오류가 발생했습니다.\n' + e.message);
    }
  }

  async function deleteTemplate(t: SmsTemplate) {
    if (!userId) return;
    if (!confirm(`'${t.title}' 템플릿을 삭제할까요?`)) return;

    try {
      const { error } = await supabase
        .from('sms_templates')
        .delete()
        .eq('id', t.id)
        .eq('user_id', userId);
      if (error) throw error;
      await fetchTemplates(userId, onlyFavorite);
    } catch (e: any) {
      console.error(e);
      alert('삭제 중 오류가 발생했습니다.\n' + e.message);
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      alert('문자 내용이 복사되었습니다.');
    } catch (e) {
      console.error(e);
      alert('클립보드 복사에 실패했습니다.');
    }
  }

  async function toggleFavoriteFilter() {
    const next = !onlyFavorite;
    setOnlyFavorite(next);
    if (!userId) return;
    await fetchTemplates(userId, next);
  }

  return (
    <div className="min-h-screen bg-[#05020A] text-white px-4 py-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold mb-1">문자 도우미</h1>
            <p className="text-sm text-gray-400">
              택배 발송 / 배송완료 / 파손·분실 / 반론 후 관리 / 위로 문자 등을
              템플릿으로 저장해 두고, 한 번에 복사해서 사용하세요.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleFavoriteFilter}
            className="px-3 py-1.5 rounded-full border border-pink-500 text-xs text-pink-200 hover:bg-pink-500/10"
          >
            {onlyFavorite ? '전체 보기' : '즐겨찾기만 보기'}
          </button>
        </header>

        {/* 템플릿 등록 폼 */}
        <section className="rounded-2xl bg-[#111018] border border-pink-500/40 p-4">
          <h2 className="text-sm font-semibold mb-3">새 문자 템플릿 저장</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs mb-1">카테고리</label>
              <select
                className="w-full rounded-xl bg-black/60 border border-gray-700 px-3 py-2 text-xs"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option>배송 안내</option>
                <option>배송 완료 확인</option>
                <option>파손/분실 안내</option>
                <option>반론 후 관리</option>
                <option>위로/응원 문자</option>
                <option>기타</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs mb-1">템플릿 이름</label>
              <input
                className="w-full rounded-xl bg-black/60 border border-gray-700 px-3 py-2 text-xs"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 배송완료 확인 문자 (기본형)"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs mb-1">문자 내용</label>
            <textarea
              rows={4}
              className="w-full rounded-xl bg-black/60 border border-gray-700 px-3 py-2 text-xs resize-none"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="예: 안녕하세요, ○○님. 오늘 발송된 상품이 잘 도착하셨는지 확인차 연락드립니다..."
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-full bg-pink-500 text-xs font-semibold hover:bg-pink-400 disabled:opacity-60"
            >
              {saving ? '저장 중...' : '문자 템플릿 저장'}
            </button>
          </div>
        </section>

        {/* 템플릿 목록 */}
        <section className="rounded-2xl bg-[#111018] border border-gray-800 p-4">
          <h2 className="text-sm font-semibold mb-3">내 문자 템플릿</h2>
          {loading ? (
            <p className="text-xs text-gray-400">불러오는 중...</p>
          ) : templates.length === 0 ? (
            <p className="text-xs text-gray-500">
              아직 저장된 문자가 없습니다. 위에서 템플릿을 만들어 보세요.
            </p>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-gray-700 bg-black/40 px-3 py-2 text-xs"
                >
                  <div className="flex justify-between items-center mb-1">
                    <div>
                      <span className="inline-flex items-center rounded-full bg-pink-500/10 border border-pink-400/60 px-2 py-0.5 mr-2 text-[10px] text-pink-200">
                        {t.category}
                      </span>
                      <span className="font-semibold">{t.title}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => toggleFavorite(t)}
                        className="px-2 py-1 rounded-full border border-pink-500/60 text-[10px] hover:bg-pink-500/10"
                      >
                        {t.is_favorite ? '♥ 담김' : '♡ 담기'}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(t.content)}
                        className="px-2 py-1 rounded-full border border-gray-600 text-[10px] hover:bg-white/5"
                      >
                        복사
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTemplate(t)}
                        className="px-2 py-1 rounded-full border border-gray-600 text-[10px] hover:bg-red-500/20"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  <div className="whitespace-pre-wrap text-gray-200">
                    {t.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
