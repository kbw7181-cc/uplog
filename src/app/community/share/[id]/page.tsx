'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';

type CommunityPost = {
  id: string;
  category: string;
  title: string;
  content: string;
  created_at: string;
};

export default function CommunitySharePage() {
  const router = useRouter();
  const params = useParams();
  const postId = params?.id as string;

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!postId) return;

    const fetchPost = async () => {
      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (error) {
        console.error('COMMUNITY_SHARE_ERROR', error);
        setPost(null);
      } else {
        setPost(data as CommunityPost);
      }
      setLoading(false);
    };

    fetchPost();
  }, [postId]);

  const handleCopyLink = async () => {
    try {
      const url = window.location.origin + `/community/${postId}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      alert('링크 복사에 실패했습니다. 직접 주소창에서 복사해 주세요.');
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#fafaff' }}
      >
        <p style={{ fontSize: 14, color: '#6b7280' }}>공유 정보를 불러오는 중입니다…</p>
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
            공유할 글을 찾을 수 없습니다.
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
            커뮤니티로 돌아가기
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
          }}
        >
          <button
            type="button"
            onClick={() => router.push(`/community/${post.id}`)}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            ← 글 상세로
          </button>

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
            커뮤니티 목록
          </button>
        </div>

        {/* 공유 카드 */}
        <section
          className="rounded-3xl px-6 py-6 shadow border"
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e9d5ff',
          }}
        >
          <p
            style={{
              fontSize: 11,
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              color: '#ec4899',
              fontWeight: 600,
            }}
          >
            UPLOG · SHARE
          </p>
          <h1
            style={{
              marginTop: 8,
              fontSize: 22,
              fontWeight: 700,
              color: '#111827',
            }}
          >
            친구에게 공유하기
          </h1>
          <p
            style={{
              marginTop: 8,
              fontSize: 13,
              color: '#4b5563',
            }}
          >
            아래 내용을 복사해서 카톡/문자/메신저에 붙여넣으면,
            대표님이 본 감동 그대로 친구에게 전달할 수 있습니다.
          </p>

          {/* 글 요약 */}
          <div
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: 16,
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: '#6b7280',
                marginBottom: 6,
              }}
            >
              [{post.category}] 익명 영업인
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#111827',
                marginBottom: 8,
              }}
            >
              {post.title}
            </div>
            <div
              style={{
                fontSize: 14,
                color: '#374151',
                lineHeight: 1.6,
                maxHeight: 140,
                overflow: 'hidden',
              }}
            >
              {post.content}
            </div>
          </div>

          {/* 링크 복사 영역 */}
          <div
            style={{
              marginTop: 18,
              paddingTop: 12,
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              flexDirection: 'column',
              rowGap: 10,
            }}
          >
            <label
              style={{
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              공유 링크
            </label>
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <input
                readOnly
                value={typeof window === 'undefined'
                  ? ''
                  : window.location.origin + `/community/${post.id}`}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 999,
                  border: '1px solid #e5e7eb',
                  padding: '0 14px',
                  fontSize: 13,
                  color: '#111827',
                }}
              />
              <button
                type="button"
                onClick={handleCopyLink}
                style={{
                  height: 40,
                  padding: '0 16px',
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
                {copied ? '복사완료' : '링크 복사'}
              </button>
            </div>
            <p
              style={{
                fontSize: 12,
                color: '#9ca3af',
              }}
            >
              예) “이 글 너무 공감돼서 공유해요. 우리 같이 힘내요 😊”
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
