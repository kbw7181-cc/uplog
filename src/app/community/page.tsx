// src/app/community/page.tsx
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
  '피드백',
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

      const titleText = (post.title || '').toLowerCase();
      const contentText = (post.content || '').toLowerCase();

      const matchSearch =
        !keyword ||
        titleText.includes(keyword) ||
        contentText.includes(keyword);

      return matchCategory && matchSearch;
    });
  }, [posts, activeCategory, search]);

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '32px 16px 40px',
        boxSizing: 'border-box',
        background:
          'linear-gradient(180deg,#ffe4f3 0%,#f1e4ff 45%,#e0f2ff 100%)',
        color: '#111827',
      }}
    >
      <div
        style={{
          maxWidth: '980px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          rowGap: 28,
        }}
      >
        {/* 상단 타이틀 카드 */}
        <section
          style={{
            borderRadius: 28,
            padding: '22px 26px 20px',
            background:
              'linear-gradient(120deg,#ff9ecf 0%,#a855f7 45%,#6366f1 100%)',
            boxShadow: '0 22px 40px rgba(0,0,0,0.32)',
            color: '#fdfcff',
          }}
        >
          <p
            style={{
              fontSize: 12,
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              opacity: 0.95,
              fontWeight: 600,
            }}
          >
            UPLOG · COMMUNITY
          </p>
          <h1
            style={{
              marginTop: 10,
              fontSize: 30,
              fontWeight: 900,
              letterSpacing: 1,
            }}
          >
            성장하는 U P 커뮤니티
          </h1>
          <p
            style={{
              marginTop: 10,
              fontSize: 15,
              lineHeight: 1.7,
              maxWidth: 520,
              opacity: 0.96,
            }}
          >
            영업 노하우, 거절 경험, 멘탈 관리까지.
            <br />
            대표님의 하루를 함께 나누고 서로 성장하는 공간입니다.
          </p>
        </section>

        {/* 검색 + 새 글쓰기 */}
        <section
          style={{
            borderRadius: 24,
            padding: '18px 22px',
            backgroundColor: '#ffffff',
            border: '1px solid #e9d5ff',
            boxShadow: '0 14px 28px rgba(148,163,184,0.25)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              rowGap: 12,
            }}
          >
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  color: '#4b5563',
                  marginBottom: 4,
                  fontWeight: 500,
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
                  height: 46,
                  borderRadius: 999,
                  border: '1px solid #ddd6fe',
                  backgroundColor: '#f9fafb',
                  padding: '0 18px',
                  fontSize: 14,
                  color: '#111827',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => router.push('/community/new')}
                style={{
                  height: 46,
                  padding: '0 28px',
                  borderRadius: 999,
                  border: 'none',
                  background:
                    'linear-gradient(90deg,#fb7185,#e879f9,#a855f7)',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 700,
                  boxShadow: '0 0 22px rgba(244,114,182,0.5)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  marginTop: 4,
                }}
              >
                + 새 글쓰기
              </button>
            </div>
          </div>
        </section>

        {/* 커뮤니티 가이드 */}
        <section
          style={{
            borderRadius: 24,
            padding: '18px 22px 20px',
            background:
              'linear-gradient(135deg,#fdf2ff,#ffe4f4,#e0f2fe)',
            border: '1px solid #f9a8d4',
            boxShadow: '0 18px 40px rgba(236,72,153,0.18)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                width: 9,
                height: 34,
                borderRadius: 999,
                background:
                  'linear-gradient(180deg,#ec4899,#a855f7)',
              }}
            />
            <div>
              <h2
                style={{
                  fontSize: 19,
                  fontWeight: 800,
                  color: '#111827',
                }}
              >
                커뮤니티 가이드
              </h2>
              <p
                style={{
                  marginTop: 2,
                  fontSize: 13,
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
              fontSize: 14,
              color: '#374151',
              lineHeight: 1.8,
              paddingLeft: 20,
            }}
          >
            <li>개인정보(연락처/고객정보)는 절대 올리지 않습니다.</li>
            <li>비방·욕설·허위 사실 업로드 시 글 삭제 및 퇴출될 수 있습니다.</li>
            <li>실질적 도움이 되는 영업 경험·노하우·멘탈 관리 공유를 권장합니다.</li>
            <li>캡처 시 회사·고객 정보가 노출되지 않도록 꼭 확인해주세요.</li>
          </ul>
        </section>

        {/* 카테고리 + 게시글 목록 */}
        <section
          style={{
            borderRadius: 24,
            padding: '20px 22px 22px',
            backgroundColor: '#ffffff',
            border: '1px solid #e9d5ff',
            boxShadow: '0 14px 30px rgba(148,163,184,0.25)',
          }}
        >
          {/* 카테고리 탭 */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 22,
            }}
          >
            {CATEGORIES.map((cat) => {
              const active = cat === activeCategory;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 999,
                    fontSize: 13,
                    border: active ? 'none' : '1px solid #e9d5ff',
                    background: active
                      ? 'linear-gradient(90deg,#fb7185,#e879f9,#a855f7)'
                      : '#f9fafb',
                    color: active ? '#ffffff' : '#374151',
                    boxShadow: active
                      ? '0 0 14px rgba(244,114,182,0.55)'
                      : 'none',
                    cursor: 'pointer',
                    fontWeight: active ? 700 : 500,
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
                padding: '44px 0',
                fontSize: 14,
                color: '#6b7280',
              }}
            >
              글을 불러오는 중입니다…
            </div>
          ) : filteredPosts.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '44px 0',
                fontSize: 14,
                color: '#6b7280',
              }}
            >
              아직 등록된 글이 없습니다. 대표님의 첫 글을 남겨보세요 🙂
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', rowGap: 18 }}>
              {filteredPosts.map((post) => (
                <article
                  key={post.id}
                  onClick={() => router.push(`/community/${post.id}`)}
                  style={{
                    backgroundColor: '#f9fafb',
                    borderRadius: 18,
                    border: '1px solid #e9d5ff',
                    padding: '18px 20px 16px',
                    boxShadow: '0 10px 22px rgba(148,163,184,0.35)',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 12,
                      color: '#6b7280',
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        padding: '4px 11px',
                        borderRadius: 999,
                        backgroundColor: '#ffe4f4',
                        color: '#be185d',
                        fontWeight: 600,
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
                      fontSize: 17,
                      fontWeight: 700,
                      color: '#111827',
                    }}
                  >
                    {post.title}
                  </h3>

                  <p
                    style={{
                      marginTop: 8,
                      fontSize: 14,
                      color: '#374151',
                      lineHeight: 1.7,
                    }}
                  >
                    {post.content}
                  </p>

                  <div
                    style={{
                      marginTop: 14,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 12,
                      color: '#6b7280',
                    }}
                  >
                    <span>익명 영업인 · 공개</span>
                    <div
                      style={{ display: 'flex', gap: 8 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => router.push(`/community/${post.id}`)}
                        style={{
                          padding: '5px 13px',
                          borderRadius: 999,
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
                          padding: '5px 13px',
                          borderRadius: 999,
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
