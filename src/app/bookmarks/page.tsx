'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

type Post = {
  id: string;
  user_id: string;
  category: string;
  title: string;
  content: string;
  created_at: string;
};

export default function BookmarksPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      // 1) 로그인 유저 확인
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) {
        router.replace('/login');
        return;
      }
      setUserId(u.id);

      // 2) 내가 담아둔 북마크 목록(post_id만)
      const { data: bookmarkRows, error: bookmarkError } = await supabase
        .from('post_bookmarks')
        .select('post_id')
        .eq('user_id', u.id);

      if (bookmarkError) {
        console.error(bookmarkError);
        setErrorMsg(bookmarkError.message);
        setLoading(false);
        return;
      }

      const ids = (bookmarkRows || []).map((b: any) => b.post_id);

      if (ids.length === 0) {
        // 담은 글이 하나도 없을 때
        setPosts([]);
        setLoading(false);
        return;
      }

      // 3) 해당 post_id 들에 해당하는 글 가져오기
      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
        .select('*')
        .in('id', ids)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error(postsError);
        setErrorMsg(postsError.message);
        setLoading(false);
        return;
      }

      setPosts(postsData || []);
      setLoading(false);
    }

    load();
  }, [router]);

  // 북마크 해제
  async function removeBookmark(postId: string) {
    if (!userId) return;
    await supabase
      .from('post_bookmarks')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    // 화면에서 바로 제거
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#050505',
          color: '#f5f5f5',
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
        background: '#050505',
        color: '#f5f5f5',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>담아둔 글</h1>
          <p style={{ fontSize: 13, opacity: 0.8 }}>
            대표님이 공감되거나 다시 보고 싶은 글들만 모아둔 공간입니다.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => router.push('/community')}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid #555',
              background: 'transparent',
              color: '#f5f5f5',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            ← 커뮤니티
          </button>
          <button
            onClick={() => router.push('/home')}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid #555',
              background: 'transparent',
              color: '#f5f5f5',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            대시보드
          </button>
        </div>
      </header>

      {errorMsg && (
        <p style={{ color: 'salmon', fontSize: 12, marginBottom: 12 }}>
          {errorMsg}
        </p>
      )}

      {/* 담아둔 글이 없을 때 */}
      {posts.length === 0 ? (
        <p style={{ fontSize: 13, opacity: 0.8 }}>
          아직 담아둔 글이 없습니다. 커뮤니티에서 마음에 드는 글을{' '}
          <strong>📁 담기</strong> 해보세요.
        </p>
      ) : (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.map((post) => (
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
                  marginBottom: 4,
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

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  marginTop: 12,
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  onClick={() => removeBookmark(post.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: '1px solid #444',
                    background: '#111',
                    color: '#f5f5f5',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  📂 담기 취소
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
