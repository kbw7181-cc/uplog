// ✅ 파일: src/app/community/page.tsx
// ✅ 대표님 구조( src/app/ClientShell.tsx ) 기준: 아래 import가 정답
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getAvatarSrc } from '@/lib/getAvatarSrc';
import { getProfileSelect } from '@/lib/profileSelect';

import ClientShell from '../components/ClientShell';

type PostRow = {
  id: string;
  user_id: string | null;
  category: string | null;
  title: string | null;
  content: string | null;
  created_at: string | null;
  view_count?: number | null; // 있을 수도/없을 수도
};

type ProfileLite = {
  user_id: string;
  avatar_url: string | null;
  nickname?: string | null;
  name?: string | null;
};

type CommentRow = {
  id: string;
  post_id: string;
  user_id: string | null;
};

type LikeRow = {
  post_id: string;
  user_id: string;
};

function fmtTime(d?: string | null) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function clip(s?: string | null, n = 90) {
  const t = (s ?? '').trim();
  if (!t) return '';
  return t.length > n ? t.slice(0, n) + '…' : t;
}

export default function CommunityPage() {
  const router = useRouter();

  const [meId, setMeId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');

  const [posts, setPosts] = useState<PostRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [likedByMe, setLikedByMe] = useState<Record<string, boolean>>({});

  // ✅ 로그인 체크 + 내 uid
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id ?? '';
      if (!uid) {
        router.replace('/login');
        return;
      }
      if (mounted) setMeId(uid);
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  // ✅ 데이터 로드
  useEffect(() => {
    if (!meId) return;

    let alive = true;
    (async () => {
      setLoading(true);
      setErr('');

      // 1) posts
      const { data: postData, error: postErr } = await supabase
        .from('community_posts')
        .select('id,user_id,category,title,content,created_at,view_count')
        .order('created_at', { ascending: false })
        .limit(80);

      if (!alive) return;

      if (postErr) {
        setErr(postErr.message);
        setLoading(false);
        return;
      }

      const postRows = (postData ?? []) as PostRow[];
      setPosts(postRows);

      const postIds = postRows.map((p) => p.id);
      const userIds = Array.from(new Set(postRows.map((p) => p.user_id).filter(Boolean))) as string[];

      // 2) profiles (작성자) — ✅ profileSelect로 nickname/name 안전 처리
      if (userIds.length) {
        const cols = await getProfileSelect(); // base: user_id,avatar_url + (nickname or name)
        const { data: profData, error: profErr } = await supabase.from('profiles').select(cols.select).in('user_id', userIds);

        if (!alive) return;

        if (!profErr && profData) {
          const map: Record<string, ProfileLite> = {};
          for (const row of profData as any[]) {
            map[row.user_id] = row as ProfileLite;
          }
          setProfiles(map);
        }
      }

      // 3) comments count
      if (postIds.length) {
        const { data: cData, error: cErr } = await supabase.from('community_comments').select('id,post_id,user_id').in('post_id', postIds);

        if (!alive) return;

        if (cErr) {
          // 댓글 select가 막혀 있어도 목록이 죽으면 안 됨 (대표님 캡처용 안정성)
          setCommentCounts({});
        } else {
          const cc: Record<string, number> = {};
          for (const r of (cData ?? []) as CommentRow[]) {
            cc[r.post_id] = (cc[r.post_id] ?? 0) + 1;
          }
          setCommentCounts(cc);
        }
      }

      // 4) likes count + 내가 눌렀는지
      if (postIds.length) {
        const { data: lData, error: lErr } = await supabase.from('post_likes').select('post_id,user_id').in('post_id', postIds);

        if (!alive) return;

        if (lErr) {
          // like select 막혀도 화면 유지
          setLikeCounts({});
          setLikedByMe({});
        } else {
          const lc: Record<string, number> = {};
          const my: Record<string, boolean> = {};
          for (const r of (lData ?? []) as LikeRow[]) {
            lc[r.post_id] = (lc[r.post_id] ?? 0) + 1;
            if (r.user_id === meId) my[r.post_id] = true;
          }
          setLikeCounts(lc);
          setLikedByMe(my);
        }
      }

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [meId]);

  const headerRight = useMemo(() => {
    return (
      <div className="actions">
        <Link className="btn ghost" href="/home">
          홈
        </Link>
        <Link className="btn primary" href="/community/write">
          글쓰기
        </Link>
      </div>
    );
  }, []);

  async function toggleLike(postId: string) {
    if (!meId) return;

    const isLiked = !!likedByMe[postId];

    if (isLiked) {
      const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', meId);
      if (!error) {
        setLikedByMe((p) => ({ ...p, [postId]: false }));
        setLikeCounts((p) => ({ ...p, [postId]: Math.max(0, (p[postId] ?? 1) - 1) }));
      }
      return;
    }

    const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: meId });
    if (!error) {
      setLikedByMe((p) => ({ ...p, [postId]: true }));
      setLikeCounts((p) => ({ ...p, [postId]: (p[postId] ?? 0) + 1 }));
    }
  }

  return (
    <ClientShell>
      <div className="page">
        <div className="top">
          <div>
            <div className="h1">커뮤니티</div>
            <div className="sub">익명이 아니라, 대표님의 이름으로 남는 기록 ✨</div>
          </div>
          {headerRight}
        </div>

        {loading && <div className="card">불러오는 중…</div>}
        {!!err && <div className="card err">에러: {err}</div>}

        {!loading && !err && posts.length === 0 && <div className="card">아직 글이 없어요. 첫 글의 주인공이 되어보세요.</div>}

        <div className="list">
          {posts.map((p) => {
            const prof = p.user_id ? profiles[p.user_id] : undefined;

            const nickname =
              (prof?.nickname && String(prof.nickname).trim()) ||
              (prof?.name && String(prof.name).trim()) ||
              '익명 영업인';

            // ✅ avatar_url만 사용 (profile_image 혼선 제거)
            const avatar = getAvatarSrc(prof?.avatar_url || '');

            const cc = commentCounts[p.id] ?? 0;
            const lc = likeCounts[p.id] ?? 0;
            const mine = !!likedByMe[p.id];

            return (
              <div key={p.id} className="postCard">
                <Link className="postMain" href={`/community/${p.id}`}>
                  <div className="meta">
                    <div className="who">
                      <div className="avatarWrap">
                        {avatar ? <img className="avatar" src={avatar} alt="avatar" /> : <div className="avatar ph" />}
                      </div>
                      <div className="whoText">
                        <div className="nick">{nickname}</div>
                        <div className="time">{fmtTime(p.created_at)}</div>
                      </div>
                    </div>
                    {p.category ? <div className="pill">{p.category}</div> : <div />}
                  </div>

                  <div className="title">{p.title ?? '(제목 없음)'}</div>
                  <div className="content">{clip(p.content, 110)}</div>

                  <div className="stats">
                    <span>💬 {cc}</span>
                    <span>❤️ {lc}</span>
                    {typeof p.view_count === 'number' ? <span>👀 {p.view_count}</span> : null}
                  </div>
                </Link>

                <button className={`likeBtn ${mine ? 'on' : ''}`} onClick={() => toggleLike(p.id)}>
                  {mine ? '❤️' : '🤍'} 좋아요
                </button>
              </div>
            );
          })}
        </div>

        <style jsx>{styles}</style>
      </div>
    </ClientShell>
  );
}

const styles = `
.page{
  position:relative;
  padding: 6px 0 0;
  color:#24112f;
}
.top{
  display:flex;
  align-items:flex-end;
  justify-content:space-between;
  gap:12px;
  margin-bottom: 14px;
}
.h1{
  font-size: 28px;
  font-weight: 950;
  letter-spacing:-0.6px;
}
.sub{
  margin-top:6px;
  font-size: 14px;
  font-weight: 800;
  opacity: 0.7;
}
.actions{ display:flex; gap:10px; flex-wrap:wrap; }
.btn{
  display:inline-flex; align-items:center; justify-content:center;
  height: 42px;
  padding: 0 14px;
  border-radius: 999px;
  font-weight: 900;
  text-decoration:none;
  border: 1px solid rgba(80,0,120,0.18);
  background: rgba(255,255,255,0.75);
  box-shadow: 0 10px 22px rgba(160,70,255,0.10);
  color:#2a1236;
}
.btn.primary{
  background: linear-gradient(90deg, rgba(255,79,216,0.92), rgba(185,130,255,0.92));
  border-color: rgba(255,79,216,0.25);
  color: white;
}
.card{
  padding: 14px 14px;
  border-radius: 18px;
  background: rgba(255,255,255,0.78);
  border: 1px solid rgba(80,0,120,0.12);
  box-shadow: 0 10px 24px rgba(70,0,120,0.08);
  margin-bottom: 12px;
  font-weight: 800;
}
.card.err{ color:#7b1230; border-color: rgba(255,0,80,0.18); }
.list{
  display:flex;
  flex-direction:column;
  gap: 12px;
}
.postCard{
  border-radius: 22px;
  background: rgba(255,255,255,0.82);
  border: 1px solid rgba(80,0,120,0.12);
  box-shadow: 0 12px 28px rgba(90,0,140,0.08);
  overflow:hidden;
}
.postMain{
  display:block;
  padding: 14px 14px 10px;
  text-decoration:none;
  color: inherit;
}
.meta{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap: 12px;
  margin-bottom: 10px;
}
.who{ display:flex; align-items:center; gap: 10px; }
.avatarWrap{ width: 44px; height: 44px; flex: 0 0 44px; }
.avatar{
  width: 44px; height: 44px;
  border-radius: 14px;
  object-fit: cover;
  box-shadow: 0 10px 18px rgba(180,76,255,0.16);
}
.avatar.ph{
  background: linear-gradient(135deg, rgba(255,79,216,0.35), rgba(185,130,255,0.25));
  border: 1px solid rgba(255,79,216,0.25);
}
.nick{ font-weight: 950; letter-spacing:-0.2px; }
.time{ font-size: 12px; font-weight: 800; opacity:0.65; margin-top: 2px; }
.pill{
  padding: 7px 10px;
  border-radius: 999px;
  font-weight: 950;
  font-size: 12px;
  background: rgba(243,232,255,0.65);
  border: 1px solid rgba(185,130,255,0.18);
}
.title{
  font-size: 18px;
  font-weight: 950;
  letter-spacing:-0.4px;
  margin: 4px 0 6px;
}
.content{
  font-size: 14px;
  font-weight: 800;
  opacity: 0.78;
  line-height: 1.4;
}
.stats{
  display:flex;
  gap: 10px;
  margin-top: 10px;
  font-size: 13px;
  font-weight: 900;
  opacity: 0.8;
}
.likeBtn{
  width: 100%;
  height: 46px;
  border: 0;
  border-top: 1px solid rgba(80,0,120,0.10);
  background: rgba(255,255,255,0.72);
  font-weight: 950;
  cursor:pointer;
}
.likeBtn.on{
  background: linear-gradient(90deg, rgba(255,79,216,0.14), rgba(185,130,255,0.12));
}
`;
