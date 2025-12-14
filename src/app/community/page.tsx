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

export default function CommunityPage() {
  const router = useRouter();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category>('전체');
  const [search, setSearch] = useState('');

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
        padding: '32px 16px 44px',
        boxSizing: 'border-box',
        background:
          'linear-gradient(180deg,#ffe4f3 0%,#f1e4ff 45%,#e0f2ff 100%)',
        color: '#111827',
      }}
    >
      {/* 애니메이션 */}
      <style>{`
        @keyframes upzzuFloat {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        @keyframes neonPulse {
          0% { box-shadow: 0 12px 22px rgba(0,0,0,0.16), 0 0 0 rgba(236,72,153,0.0), 0 0 0 rgba(168,85,247,0.0); }
          50% { box-shadow: 0 12px 22px rgba(0,0,0,0.16), 0 0 18px rgba(236,72,153,0.28), 0 0 24px rgba(168,85,247,0.22); }
          100% { box-shadow: 0 12px 22px rgba(0,0,0,0.16), 0 0 0 rgba(236,72,153,0.0), 0 0 0 rgba(168,85,247,0.0); }
        }
        @keyframes softGlowBg {
          0% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.62; transform: scale(1.03); }
          100% { opacity: 0.35; transform: scale(1); }
        }
        @keyframes chipGlow {
          0% { box-shadow: 0 0 0 rgba(244,114,182,0); }
          50% { box-shadow: 0 0 14px rgba(244,114,182,0.25); }
          100% { box-shadow: 0 0 0 rgba(244,114,182,0); }
        }
      `}</style>

      <div
        style={{
          maxWidth: '980px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          rowGap: 22,
        }}
      >
        {/* 헤더 */}
        <section
          style={{
            borderRadius: 28,
            padding: '22px 22px 18px',
            background:
              'linear-gradient(120deg,#ff9ecf 0%,#a855f7 45%,#6366f1 100%)',
            boxShadow: '0 22px 40px rgba(0,0,0,0.28)',
            color: '#fdfcff',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* 배경 글로우 */}
          <div
            style={{
              position: 'absolute',
              inset: -40,
              background:
                'radial-gradient(circle at 18% 22%, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.0) 55%), radial-gradient(circle at 80% 75%, rgba(236,72,153,0.22) 0%, rgba(168,85,247,0.0) 62%)',
              filter: 'blur(6px)',
              animation: 'softGlowBg 4.8s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />

          {/* 타이틀 */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p
              style={{
                fontSize: 12,
                letterSpacing: '0.32em',
                textTransform: 'uppercase',
                opacity: 0.95,
                fontWeight: 800,
                margin: 0,
              }}
            >
              UPLOG · COMMUNITY
            </p>

            <h1
              style={{
                marginTop: 10,
                fontSize: 30,
                fontWeight: 900,
                letterSpacing: 0.5,
                marginBottom: 0,
              }}
            >
              성장하는 U P 커뮤니티
            </h1>
          </div>

          {/* 말풍선(왼쪽 고정/작게) + 마스코트(오른쪽 고정) */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              marginTop: 16,
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              alignItems: 'end',
              columnGap: 16,
              rowGap: 12,
            }}
          >
            {/* 말풍선: 크기 줄임 + 왼쪽 고정 */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 520, // ✅ 말풍선 사이즈 줄임
                padding: '12px 14px', // ✅ 살짝 줄임
                borderRadius: 20,
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(255,255,255,0.86))',
                border: '1px solid rgba(255,255,255,0.70)',
                color: '#111827',
                backdropFilter: 'blur(10px)',
                animation: 'neonPulse 3.2s ease-in-out infinite',
                justifySelf: 'start', // ✅ 무조건 왼쪽
              }}
            >
             {/* 꼬리: 오른쪽(마스코트 방향) */}
<div
  style={{
    position: 'absolute',
    right: -8,                 // ✅ 말풍선 밖으로 살짝 튀어나오게
    top: '58%',                // ✅ 아래가 아니라 "가운데쯤"
    transform: 'translateY(-50%) rotate(45deg)',
    width: 16,
    height: 16,
    background:
      'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(255,255,255,0.86))',
    borderRight: '1px solid rgba(255,255,255,0.70)',
    borderBottom: '1px solid rgba(255,255,255,0.70)',
    borderRadius: 4,
    boxShadow: '8px 10px 18px rgba(0,0,0,0.08)', // ✅ 살짝 입체감
    pointerEvents: 'none',
  }}
/>


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
                    height: 30,
                    borderRadius: 999,
                    background: 'linear-gradient(180deg,#ec4899,#a855f7)',
                    boxShadow: '0 0 14px rgba(236,72,153,0.30)',
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: 15, // ✅ 살짝 줄임
                      fontWeight: 900,
                      color: '#111827',
                      lineHeight: 1.2,
                    }}
                  >
                    업쮸의 안전 이용 안내 ✨
                  </div>
                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 12,
                      color: '#6b7280',
                      fontWeight: 800,
                    }}
                  >
                    따뜻하게, 똑똑하게, 오래 가자!
                  </div>
                </div>
              </div>

              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  fontSize: 13, // ✅ 글도 살짝 줄임
                  lineHeight: 1.75,
                  color: '#374151',
                }}
              >
                <li>
                  <span style={{ fontWeight: 900, color: '#be185d' }}>
                    개인정보(연락처/고객정보)
                  </span>
                  는 절대 올리지 않기
                </li>
                <li>
                  <span style={{ fontWeight: 900, color: '#7c3aed' }}>
                    비방·욕설·허위 사실
                  </span>
                  은{' '}
                  <span style={{ fontWeight: 900, color: '#111827' }}>
                    글 삭제 + 퇴출
                  </span>
                  될 수 있어요
                </li>
                <li>
                  캡처/이미지 업로드 전{' '}
                  <span style={{ fontWeight: 900, color: '#0f172a' }}>
                    회사·고객 정보 노출
                  </span>
                  여부 확인
                </li>
                <li>
                  <span style={{ fontWeight: 900, color: '#0ea5e9' }}>
                    구체적으로
                  </span>
                  ,{' '}
                  <span style={{ fontWeight: 900, color: '#ec4899' }}>
                    친절하게
                  </span>{' '}
                  공유하면 서로가 빨라져요
                </li>
              </ul>
            </div>

            {/* 마스코트: 무조건 오른쪽 */}
            <div
              style={{
                width: 170,
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'flex-end',
                justifySelf: 'end', // ✅ 무조건 오른쪽
              }}
            >
              <img
                src="/assets/upzzu3.png"
                alt="Upzzu Mascot"
                style={{
                  width: 150,
                  height: 150,
                  objectFit: 'contain',
                  animation: 'upzzuFloat 3.4s ease-in-out infinite',
                  filter:
                    'drop-shadow(0 18px 30px rgba(0,0,0,0.28)) drop-shadow(0 0 16px rgba(236,72,153,0.16))',
                }}
              />
            </div>
          </div>
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
          <div style={{ display: 'flex', flexDirection: 'column', rowGap: 12 }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  color: '#4b5563',
                  marginBottom: 4,
                  fontWeight: 800,
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
                  background: 'linear-gradient(90deg,#fb7185,#e879f9,#a855f7)',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 900,
                  boxShadow: '0 0 22px rgba(244,114,182,0.5)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  marginTop: 4,
                  animation: 'chipGlow 3.1s ease-in-out infinite',
                }}
              >
                + 새 글쓰기
              </button>
            </div>
          </div>
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
                    fontWeight: active ? 900 : 700,
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>

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
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        padding: '4px 11px',
                        borderRadius: 999,
                        backgroundColor: '#ffe4f4',
                        color: '#be185d',
                        fontWeight: 900,
                      }}
                    >
                      {post.category}
                    </span>
                    <span style={{ fontWeight: 900 }}>
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
                      fontWeight: 900,
                      color: '#111827',
                      letterSpacing: 0.2,
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
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
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
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ fontWeight: 800 }}>익명 영업인 · 공개</span>

                    <div
                      style={{ display: 'flex', gap: 8 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => router.push(`/community/${post.id}`)}
                        style={{
                          padding: '6px 13px',
                          borderRadius: 999,
                          border: '1px solid #e5e7eb',
                          backgroundColor: '#ffffff',
                          color: '#374151',
                          cursor: 'pointer',
                          fontWeight: 900,
                        }}
                      >
                        자세히 보기
                      </button>

                      <button
                        type="button"
                        onClick={() => router.push(`/community/share/${post.id}`)}
                        style={{
                          padding: '6px 13px',
                          borderRadius: 999,
                          border: '1px solid #e5e7eb',
                          backgroundColor: '#ffffff',
                          color: '#374151',
                          cursor: 'pointer',
                          fontWeight: 900,
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
