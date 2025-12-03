'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error(error);
      }
      setProfile(data || {});
      setLoading(false);
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500 text-sm">
        프로필 불러오는 중...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 text-center text-gray-500 text-sm">
        프로필 정보를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* 기본 프로필 카드 */}
      <section className="rounded-3xl bg-gradient-to-r from-purple-600 to-pink-500 text-white p-5 shadow-lg">
        <p className="text-[11px] uppercase tracking-[0.15em] opacity-80 mb-1">
          U P L O G · PROFILE
        </p>
        <h1 className="text-2xl font-bold mb-1">
          {profile.name || '이름 미입력'}
        </h1>
        <p className="text-sm opacity-90">
          {profile.email || '이메일 미입력'}
        </p>
        {profile.role_text && (
          <p className="text-xs opacity-90 mt-2">{profile.role_text}</p>
        )}
      </section>

      {/* 활동 지표 카드들 */}
      <section className="mt-2">
        <h2 className="text-sm font-semibold text-gray-800 mb-2">
          나의 활동 지표
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-2xl bg-purple-50 p-3">
            <p className="text-gray-500 mb-1">반론 아카이브</p>
            <p className="text-lg font-bold text-purple-700">
              {((profile as any)?.rebuttal_count ?? 0)}
              <span className="text-[11px] text-gray-500 ml-1">건</span>
            </p>
          </div>

          <div className="rounded-2xl bg-pink-50 p-3">
            <p className="text-gray-500 mb-1">준 피드백</p>
            <p className="text-lg font-bold text-pink-600">
              {((profile as any)?.feedback_given_count ?? 0)}
              <span className="text-[11px] text-gray-500 ml-1">개</span>
            </p>
          </div>

          <div className="rounded-2xl bg-purple-50 p-3">
            <p className="text-gray-500 mb-1">받은 피드백</p>
            <p className="text-lg font-bold text-purple-700">
              {((profile as any)?.feedback_received_count ?? 0)}
              <span className="text-[11px] text-gray-500 ml-1">개</span>
            </p>
          </div>

          <div className="rounded-2xl bg-pink-50 p-3">
            <p className="text-gray-500 mb-1">받은 좋아요</p>
            <p className="text-lg font-bold text-pink-600">
              {((profile as any)?.feedback_like_count ?? 0)}
              <span className="text-[11px] text-gray-500 ml-1">개</span>
            </p>
          </div>

          <div className="rounded-2xl bg-purple-50 p-3">
            <p className="text-gray-500 mb-1">커뮤니티 글</p>
            <p className="text-lg font-bold text-purple-700">
              {((profile as any)?.community_post_count ?? 0)}
              <span className="text-[11px] text-gray-500 ml-1">개</span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
