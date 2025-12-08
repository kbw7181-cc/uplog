'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

type CommunityPost = {
  id: string;
  category: string;
  title: string;
  content: string;
  created_at: string;
};

type CommentItem = {
  id: number;
  author: string;
  content: string;
  createdAt: string;
};

const IMAGE_KEY_PREFIX = 'uplog-community-image-';

export default function CommunityDetailPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params?.id as string;

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [loading, setLoading] = useState(true);

  // 좋아요/조회수/댓글은 지금은 프론트 상태만
  const [likeCount, setLikeCount] = useState(3);
  const [liked, setLiked] = useState(false);
  const [viewCount, setViewCount] = useState(0);

  const [commentInput, setCommentInput] = useState('');
  const [comments, setComments] = useState<CommentItem[]>([]);

  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) return;

    const fetchPost = async () => {
      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (error) {
        console.error('COMMUNITY_DETAIL_ERROR', error);
        setPost(null);
      } else {
        const p = data as CommunityPost;
        setPost(p);
        setViewCount((prev) => prev + 1);

        // localStorage에 저장된 이미지 불러오기
        try {
          if (typeof window !== 'undefined') {
            const key = `${IMAGE_KEY_PREFIX}${p.id}`;
            const stored = window.localStorage.getItem(key);
            if (stored) {
              setImageSrc(stored);
            }
          }
        } catch (e) {
          console.error('IMAGE_LOAD_ERROR', e);
        }
      }
      setLoading(false);
    };

    fetchPost();
  }, [postId]);

  const handleToggleLike = () => {
    setLiked((prev) => !prev);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
  };

  const handleAddComment = () => {
    if (!commentInput.trim()) return;

    const newComment: CommentItem = {
      id: Date.now(),
      author: '익명 영업인',
      content: commentInput.trim(),
      createdAt: new Date().toISOString(),
    };

    setComments((prev) => [newComment, ...prev]);
    setCommentInput('');
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    });
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#fafaff' }}
      >
        <p style={{ fontSize: 14, color: '#6b7280' }}>글을 불러오는 중입니다…</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#fafaff' }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: 24,
            borderRadius: 16,
            border: '1px solid #e5e7eb',
          }}
        >
          <p style={{ fontSize: 14, color: '#374151' }}>
            해당 글을 찾을 수 없습니다.
          </p>
          <button
            type="button"
            onClick={() => router.push('/community')}
            style={{
              marginTop: 12,
              padding: '6px 14px',
              borderRadius: 999,
              border: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-10 px-4"
      style={{ backgroundColor: '#fafaff' }}
    >
      <div
        className="max-w-3xl mx-auto"
        style={{ display: 'flex', flexDirection: 'column', rowGap: 20 }}
      >
        {/* 상단 네비 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <button
            type="button"
            onClick={() => router.push('/community')}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            ← 목록으로
          </button>
          <button
            type="button"
            onClick={() => router.push(`/community/share/${post.id}`)}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              border: 'none',
              background:
                'linear-gradient(90deg,#fb7185,#e879f9,#a855f7)',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            친구에게 공유
          </button>
        </div>

        {/* 본문 카드 */}
        <section
          className="rounded-3xl px-6 py-6 shadow border"
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e9d5ff',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: '#6b7280',
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  backgroundColor: '#ffe4f4',
                  color: '#be185d',
                  fontWeight: 500,
                }}
              >
                {post.category}
              </span>
              <span>익명 영업인 · 공개</span>
            </div>
            <span>{formatDate(post.created_at)}</span>
          </div>

          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#111827',
              marginBottom: 12,
            }}
          >
            {post.title}
          </h1>

          <p
            style={{
              fontSize: 15,
              color: '#374151',
              lineHeight: 1.8,
              whiteSpace: 'pre-line',
            }}
          >
            {post.content}
          </p>

          {/* 이미지가 있다면 표시 */}
          {imageSrc && (
            <div
              style={{
                marginTop: 16,
                borderRadius: 16,
                overflow: 'hidden',
                border: '1px solid #e5e7eb',
              }}
            >
              <img
                src={imageSrc}
                alt="첨부 이미지"
                style={{ width: '100%', display: 'block' }}
              />
            </div>
          )}

          {/* 좋아요 / 조회수 */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 12,
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 13,
            }}
          >
            <button
              type="button"
              onClick={handleToggleLike}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 999,
                border: liked ? 'none' : '1px solid #e5e7eb',
                background: liked
                  ? 'linear-gradient(90deg,#fb7185,#e879f9)'
                  : '#ffffff',
                color: liked ? '#ffffff' : '#374151',
                cursor: 'pointer',
                fontWeight: liked ? 600 : 400,
              }}
            >
              <span>{liked ? '❤️ 좋아요 취소' : '🤍 좋아요'}</span>
              <span>({likeCount})</span>
            </button>

            <div style={{ display: 'flex', gap: 12, color: '#6b7280' }}>
              <span>조회수 {viewCount}회</span>
              <span>댓글 {comments.length}개</span>
            </div>
          </div>
        </section>

        {/* 댓글 영역 */}
        <section
          className="rounded-3xl px-6 py-6 shadow border"
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e9d5ff',
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            댓글
          </h2>

          {/* 댓글 입력 */}
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 14,
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
            }}
          >
            <textarea
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="댓글을 남겨주세요. (예: 오늘 제 마음이랑 똑같아요, 힘내요!)"
              rows={3}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontSize: 14,
                color: '#111827',
                backgroundColor: 'transparent',
              }}
            />
            <div
              style={{
                marginTop: 8,
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={handleAddComment}
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: 'none',
                  background:
                    'linear-gradient(90deg,#fb7185,#e879f9,#a855f7)',
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                댓글 등록
              </button>
            </div>
          </div>

          {/* 댓글 목록 */}
          {comments.length === 0 ? (
            <p
              style={{
                fontSize: 13,
                color: '#9ca3af',
              }}
            >
              아직 댓글이 없습니다. 첫 댓글을 남겨보세요 🙂
            </p>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                rowGap: 12,
              }}
            >
              {comments.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: '#6b7280',
                      marginBottom: 4,
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{c.author}</span>
                    <span>
                      {new Date(c.createdAt).toLocaleString('ko-KR', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 14,
                      color: '#111827',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {c.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
