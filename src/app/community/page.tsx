'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

type Post = {
  id: string;
  user_id: string;
  category: string;
  title: string;
  content: string;
  created_at: string;
  likesCount?: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
};

const CATEGORY_OPTIONS = [
  '영업 노하우',
  '거절 공유',
  '오늘의 기록',
  '멘탈 관리',
  '자유',
];

export default function CommunityPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // -----------------------------
  // 🔥 글 목록 + 좋아요/담기 정보 불러오기
  // -----------------------------
  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) {
        router.replace('/login');
        return;
      }
      setUserId(u.id);

      // 1) 글 목록
      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error(postsError);
        setErrorMsg(postsError.message);
        setLoading(false);
        return;
      }

      // 2) 좋아요 목록
      const { data: likesData } = await supabase
        .from('post_likes')
        .select('*');

      // 3) 북마크 목록
      const { data: bookmarkData } = await supabase
        .from('post_bookmarks')
        .select('*');

      // 4) 결합
      const enriched = (postsData || []).map((p) => {
        const postLikes = likesData?.filter((l) => l.post_id === p.id) ?? [];
        const postBookmarks =
          bookmarkData?.filter((b) => b.post_id === p.id) ?? [];

        return {
          ...p,
          likesCount: postLikes.length,
          isLiked: postLikes.some((l) => l.user_id === u.id),
          isBookmarked: postBookmarks.some((b) => b.user_id === u.id),
        };
      });

      setPosts(enriched);
      setLoading(false);
    }

    init();
  }, [router]);

  // -----------------------------
  // 🔥 글 작성
  // -----------------------------
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        user_id: userId,
        category,
        title,
        content,
      })
      .select('*')
      .single();

    setSaving(false);

    if (error) {
      console.error(error);
      setErrorMsg(error.message);
      return;
    }

    router.refresh();
    setTitle('');
    setContent('');
  }

  // -----------------------------
  // 🔥 좋아요 토글
  // -----------------------------
  async function toggleLike(post: Post) {
    if (!userId) return;

    if (post.isLiked) {
      // 취소
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', userId);
    } else {
      // 추가
      await supabase.from('post_likes').insert({
        post_id: post.id,
        user_id: userId,
      });
    }

    router.refresh();
  }

  // -----------------------------
  // 🔥 북마크 토글
  // -----------------------------
  async function toggleBookmark(post: Post) {
    if (!userId) return;

    if (post.isBookmarked) {
      await supabase
        .from('post_bookmarks')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', userId);
    } else {
      await supabase.from('post_bookmarks').insert({
        post_id: post.id,
        user_id: userId,
      });
    }

    router.refresh();
  }

  // -----------------------------
  // 화면 렌더링
  // -----------------------------
  if (loading) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
        }}
      >
        로딩 중...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: 24,
        color: '#f5f5f5',
        background: '#050505',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>커뮤니티</h1>
          <p style={{ fontSize: 13, opacity: 0.8 }}>
            영업 노하우, 거절 경험, 오늘의 기록을 서로 나누는 공간입니다.
          </p>
        </div>
        <button
          onClick={() => router.push('/home')}
          style={{
            padding: '6px 12px',
            borderRadius: 999,
            border: '1px solid #555',
            background: 'transparent',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          ← 대시보드로
        </button>
      </header>

      {/* 글쓰기 섹션 */}
      <section
        style={{
          marginBottom: 24,
          padding: 16,
          borderRadius: 16,
          border: '1px solid #333',
        }}
      >
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>새 글 쓰기</h2>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                flex: '0 0 140px',
                padding: 8,
                borderRadius: 999,
                border: '1px solid #555',
                background: '#111',
                color: '#fff',
              }}
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{
                flex: 1,
                padding: 8,
                borderRadius: 999,
                border: '1px solid #555',
                background: '#111',
                color: '#fff',
                fontSize: 13,
              }}
            />
          </div>

          <textarea
            placeholder="내용을 적어주세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={4}
            style={{
              padding: 8,
              borderRadius: 12,
              border: '1px solid #555',
              background: '#111',
              color: '#fff',
              resize: 'vertical',
            }}
          />

          {errorMsg && (
            <p style={{ color: 'salmon', fontSize: 12 }}>{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{
              alignSelf: 'flex-end',
              padding: '8px 16px',
              borderRadius: 999,
              border: 'none',
              background: '#f5f5f5',
              color: '#111',
              cursor: 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? '등록 중...' : '등록하기'}
          </button>
        </form>
      </section>

      {/* 게시글 목록 */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {posts.length === 0 ? (
          <p style={{ fontSize: 13, opacity: 0.8 }}>
            아직 작성된 글이 없습니다. 대표님의 첫 글을 남겨보세요.
          </p>
        ) : (
          posts.map((post) => (
            <article
              key={post.id}
              style={{
                padding: 16,
                borderRadius: 16,
                border: '1px solid #333',
                background: '#111',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  opacity: 0.8,
                }}
              >
                <span>#{post.category}</span>
                <span>
                  {new Date(post.created_at).toLocaleString('ko-KR', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <h3 style={{ fontSize: 15, margin: '6px 0 8px' }}>
                {post.title}
              </h3>
              <p style={{ fontSize: 13, opacity: 0.9, whiteSpace: 'pre-wrap' }}>
                {post.content}
              </p>

              {/* 좋아요 + 담기 버튼 */}
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button
                  onClick={() => toggleLike(post)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: '1px solid #444',
                    background: post.isLiked ? '#ff4070' : '#111',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  {post.isLiked ? '❤️ 좋아요 취소' : '🤍 좋아요'} (
                  {post.likesCount})
                </button>

                <button
                  onClick={() => toggleBookmark(post)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: '1px solid #444',
                    background: post.isBookmarked ? '#ffd54f' : '#111',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  {post.isBookmarked ? '📂 담기 취소' : '📁 담기'}
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
