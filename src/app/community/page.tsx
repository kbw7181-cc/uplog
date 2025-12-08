'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

const CATEGORIES = [
  '전체',
  '영업 노하우',
  '거절 경험',
  '멘탈 관리',
  '오늘의 기록',
  '자유',
] as const;

type Category = (typeof CATEGORIES)[number];

type CommunityPost = {
  id: string;
  category: string;
  title: string;
  content: string;
  created_at: string;
};

const IMAGE_KEY_PREFIX = 'uplog-community-image-';

export default function CommunityPage() {
  const router = useRouter();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category>('전체');
  const [search, setSearch] = useState('');

  // 글 목록 로드
  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('COMMUNITY_FETCH_ERROR', error);
        setPosts([]);
      } else {
        setPosts((data || []) as CommunityPost[]);
      }
      setLoading(false);
    };

    fetchPosts();
  }, []);

  // 검색/카테고리 필터
  const filteredPosts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return posts.filter((post) => {
      const matchCategory =
        activeCategory === '전체' || post.category === activeCategory;

      const matchSearch =
        !keyword ||
        post.title.toLowerCase().includes(keyword) ||
        post.content.toLowerCase().includes(keyword);

      return matchCategory && matchSearch;
    });
  }, [posts, activeCategory, search]);

  return (
    <div
      className="min-h-screen py-10 px-4"
      style={{
        backgroundColor: '#fafaff',
        color: '#111827',
        position: 'relative',
        zIndex: 0,
      }}
    >
      {/* 뒤 배경 덮는 레이어 */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#fafaff',
          zIndex: -1,
        }}
      />

      {/* 섹션 간 간격 넉넉하게 */}
      <div
        className="max-w-4xl mx-auto"
        style={{
          display: 'flex',
          flexDirection: 'column',
          rowGap: 36,
        }}
      >
        {/* 상단 타이틀 카드 */}
        <section
          className="rounded-3xl px-6 py-7 shadow-lg border"
          style={{
            background:
              'linear-gradient(90deg, #fef6ff, #eaf3ff, #ffeefe)',
            borderColor: 'rgba(180, 180, 255, 0.6)',
          }}
        >
          <p
            style={{
              fontSize: '11px',
              letterSpacing: '0.4em',
              textTransform: 'uppercase',
              color: '#ec4899',
              fontWeight: 600,
            }}
          >
            UPLOG · COMMUNITY
          </p>
          <h1
            style={{
              marginTop: '8px',
              fontSize: '26px',
              fontWeight: 800,
              color: '#111827',
            }}
          >
            영업인 커뮤니티
          </h1>
          <p
            style={{
              marginTop: '12px',
              fontSize: '14px',
              color: '#4b5563',
              lineHeight: 1.6,
            }}
          >
            영업 노하우 · 거절 경험 · 멘탈 관리까지.
            <br />
            대표님의 하루를 함께 나누는 공간입니다.
          </p>
        </section>

        {/* 검색 + 새 글쓰기 */}
        <section
          className="rounded-3xl px-6 py-5 shadow border"
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e9d5ff',
          }}
        >
          <div
            className="flex flex-col md:flex-row md:items-center"
            style={{ rowGap: 12, columnGap: 16 }}
          >
            <div className="flex-1">
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  color: '#4b5563',
                  marginBottom: '4px',
                }}
              >
                제목·내용 검색
              </label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="예) 거절 후 회복, 계약 성사 스토리"
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '999px',
                  border: '1px solid #ddd6fe',
                  backgroundColor: '#ffffff',
                  padding: '0 16px',
                  fontSize: '14px',
                  color: '#111827',
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => router.push('/community/new')}
              style={{
                height: '44px',
                padding: '0 24px',
                borderRadius: '999px',
                border: 'none',
                background:
                  'linear-gradient(90deg, #fb7185, #e879f9, #a855f7)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                boxShadow: '0 0 20px rgba(244,114,182,0.45)',
                cursor: 'pointer',
                marginTop: 4,
              }}
            >
              + 새 글쓰기
            </button>
          </div>
        </section>

        {/* 커뮤니티 가이드 – 더 눈에 띄게 */}
        <section
          className="rounded-3xl px-6 py-6 shadow border"
          style={{
            background:
              'linear-gradient(135deg,#fdf2ff,#ffe4f4,#e0f2fe)',
            borderColor: '#f9a8d4',
            boxShadow: '0 18px 40px rgba(236,72,153,0.18)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                width: 8,
                height: 32,
                borderRadius: 999,
                background:
                  'linear-gradient(180deg,#ec4899,#a855f7)',
              }}
            />
            <div>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#111827',
                }}
              >
                커뮤니티 가이드
              </h2>
              <p
                style={{
                  marginTop: 2,
                  fontSize: '12px',
                  color: '#4b5563',
                }}
              >
                따뜻한 영업인 공간을 위해 꼭 지켜주세요.
              </p>
            </div>
          </div>

          <ul
            style={{
              marginTop: 10,
              fontSize: '14px',
              color: '#374151',
              lineHeight: 1.7,
              paddingLeft: 18,
            }}
          >
            <li>개인정보(연락처/고객정보)는 절대 올리지 않습니다.</li>
            <li>비방/욕설/허위 사실 업로드 시 글 삭제 및 퇴출될 수 있습니다.</li>
            <li>실질적 도움이 되는 영업 경험/노하우/멘탈 관리 공유를 권장합니다.</li>
            <li>캡처 시 회사·고객 정보가 노출되지 않도록 꼭 확인해주세요.</li>
          </ul>
        </section>

        {/* 카테고리 + 게시글 목록 */}
        <section
          className="rounded-3xl px-6 py-6 shadow border"
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e9d5ff',
          }}
        >
          {/* 카테고리 탭 – 가이드와 간격을 위해 섹션 전체 위로 32px 띄워져 있음 */}
          <div
            className="flex flex-wrap gap-2"
            style={{ marginBottom: 24 }}
          >
            {CATEGORIES.map((cat) => {
              const active = cat === activeCategory;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '999px',
                    fontSize: '13px',
                    border: active ? 'none' : '1px solid #e9d5ff',
                    background: active
                      ? 'linear-gradient(90deg,#fb7185,#e879f9,#a855f7)'
                      : '#f9fafb',
                    color: active ? '#ffffff' : '#374151',
                    boxShadow: active
                      ? '0 0 12px rgba(244,114,182,0.5)'
                      : 'none',
                    cursor: 'pointer',
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* 게시글 카드 리스트 */}
          {loading ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 0',
                fontSize: '14px',
                color: '#6b7280',
              }}
            >
              글을 불러오는 중입니다…
            </div>
          ) : filteredPosts.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 0',
                fontSize: '14px',
                color: '#6b7280',
              }}
            >
              아직 등록된 글이 없습니다. 대표님의 첫 글을 남겨보세요 🙂
            </div>
          ) : (
            <div
              className="space-y-7"
              style={{ marginTop: 4 }}
            >
              {filteredPosts.map((post) => (
                <article
                  key={post.id}
                  onClick={() => router.push(`/community/${post.id}`)}
                  style={{
                    backgroundColor: '#f9fafb',
                    borderRadius: '18px',
                    border: '1px solid #e9d5ff',
                    padding: '20px 22px',
                    boxShadow: '0 8px 18px rgba(148,163,184,0.35)',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      color: '#6b7280',
                      marginBottom: '8px',
                    }}
                  >
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '999px',
                        backgroundColor: '#ffe4f4',
                        color: '#be185d',
                        fontWeight: 500,
                      }}
                    >
                      {post.category}
                    </span>
                    <span>
                      {new Date(post.created_at).toLocaleDateString('ko-KR', {
                        month: '2-digit',
                        day: '2-digit',
                        weekday: 'short',
                      })}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: '17px',
                      fontWeight: 600,
                      color: '#111827',
                    }}
                  >
                    {post.title}
                  </h3>

                  <p
                    style={{
                      marginTop: '8px',
                      fontSize: '14px',
                      color: '#374151',
                      lineHeight: 1.6,
                    }}
                  >
                    {post.content}
                  </p>

                  <div
                    style={{
                      marginTop: '14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      color: '#6b7280',
                    }}
                  >
                    <span>익명 영업인 · 공개</span>
                    <div
                      style={{ display: 'flex', gap: '8px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => router.push(`/community/${post.id}`)}
                        style={{
                          padding: '4px 12px',
                          borderRadius: '999px',
                          border: '1px solid #e5e7eb',
                          backgroundColor: '#ffffff',
                          color: '#374151',
                          cursor: 'pointer',
                        }}
                      >
                        자세히 보기
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/community/share/${post.id}`)
                        }
                        style={{
                          padding: '4px 12px',
                          borderRadius: '999px',
                          border: '1px solid #e5e7eb',
                          backgroundColor: '#ffffff',
                          color: '#374151',
                          cursor: 'pointer',
                        }}
                      >
                        친구에게 공유
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
