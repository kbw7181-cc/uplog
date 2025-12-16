'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import s from './admin.module.css';

type ProfileRow = {
  user_id: string;
  name?: string | null;
  nickname?: string | null;
  email?: string | null;
  role?: string | null; // 'admin' | 'user' | 'suspended'
  created_at?: string | null;
};

type BadgeRow = {
  user_id?: string | null;
  name?: string | null;
  nickname?: string | null;
  badge_name?: string | null;
  score?: number | null;
  week_start?: string | null;
};

function fmtDate(iso?: string | null) {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return '-';
  }
}

function roleLabel(role?: string | null) {
  if (role === 'admin') return '관리자';
  if (role === 'suspended') return '정지';
  return '일반';
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [q, setQ] = useState('');

  // 문의 카운트
  const [supportTotal, setSupportTotal] = useState(0);
  const [supportOpen, setSupportOpen] = useState(0);
  const [supportPending, setSupportPending] = useState(0);
  const [supportClosed, setSupportClosed] = useState(0);
  const [supportUnread, setSupportUnread] = useState(0);

  // 배지 TOP
  const [badgeRows, setBadgeRows] = useState<BadgeRow[]>([]);
  const [badgeHint, setBadgeHint] = useState<string | null>(null);

  const totalCount = profiles.length;
  const adminCount = profiles.filter((p) => p.role === 'admin').length;
  const suspendedCount = profiles.filter((p) => p.role === 'suspended').length;
  const userCount = totalCount - adminCount - suspendedCount;

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return profiles;
    return profiles.filter((p) => {
      const name = (p.nickname ?? p.name ?? '').toLowerCase();
      const email = (p.email ?? '').toLowerCase();
      const uid = (p.user_id ?? '').toLowerCase();
      return name.includes(k) || email.includes(k) || uid.includes(k);
    });
  }, [profiles, q]);

  async function loadSupportsCounts() {
    // ✅ is_read_admin 우선, 없으면 status(open/pending)로 fallback
    try {
      const { count: unread } = await supabase
        .from('supports')
        .select('*', { count: 'exact', head: true })
        .eq('is_read_admin', false);

      setSupportUnread(typeof unread === 'number' ? unread : 0);
    } catch {
      // fallback: open/pending 합
      try {
        const { count: c } = await supabase
          .from('supports')
          .select('*', { count: 'exact', head: true })
          .in('status', ['open', 'pending']);
        setSupportUnread(typeof c === 'number' ? c : 0);
      } catch {
        setSupportUnread(0);
      }
    }

    // 상태별 카운트
    const safeCount = async (status?: 'open' | 'pending' | 'closed') => {
      const q = supabase.from('supports').select('*', { count: 'exact', head: true });
      const { count } = status ? await q.eq('status', status) : await q;
      return typeof count === 'number' ? count : 0;
    };

    try {
      const [t, o, p, c] = await Promise.all([
        safeCount(undefined),
        safeCount('open'),
        safeCount('pending'),
        safeCount('closed'),
      ]);
      setSupportTotal(t);
      setSupportOpen(o);
      setSupportPending(p);
      setSupportClosed(c);
    } catch {
      setSupportTotal(0);
      setSupportOpen(0);
      setSupportPending(0);
      setSupportClosed(0);
    }
  }

  async function loadBadgesTop() {
    // ✅ 배지 시스템은 대표님 DB 구조가 여러 버전이었어서 "없어도 안 깨지게" 안전하게
    // 우선순위: weekly_badges 뷰/테이블(권장) → 없으면 안내만 표시
    setBadgeHint(null);
    setBadgeRows([]);

    try {
      const { data, error } = await supabase
        .from('weekly_badges')
        .select('week_start, user_id, badge_name, score, profiles(name,nickname)')
        .order('score', { ascending: false })
        .limit(10);

      if (error) throw error;

      const rows: BadgeRow[] =
        (data as any[])?.map((r) => ({
          week_start: r.week_start ?? null,
          user_id: r.user_id ?? null,
          badge_name: r.badge_name ?? null,
          score: typeof r.score === 'number' ? r.score : null,
          name: r.profiles?.name ?? null,
          nickname: r.profiles?.nickname ?? null,
        })) ?? [];

      setBadgeRows(rows);
      return;
    } catch {
      // 테이블/뷰가 아직 없거나 RLS 막힘
      setBadgeHint('배지 목록(weekly_badges)이 아직 준비되지 않았어요. (테이블/뷰 생성 또는 RLS 확인 필요)');
      setBadgeRows([]);
    }
  }

  async function loadAll() {
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) {
        setIsAdmin(false);
        setProfiles([]);
        return;
      }

      // ✅ 관리자 판별
      const { data: me } = await supabase.from('profiles').select('role').eq('user_id', u.user.id).maybeSingle();
      const admin = me?.role === 'admin';
      setIsAdmin(admin);

      if (!admin) {
        setProfiles([]);
        return;
      }

      // ✅ 회원 리스트
      const { data: list, error } = await supabase
        .from('profiles')
        .select('user_id, name, nickname, email, role, created_at')
        .order('created_at', { ascending: false })
        .limit(300);

      if (error) throw error;
      setProfiles((list as ProfileRow[]) ?? []);

      // ✅ 문의/배지 같이 로드
      await Promise.all([loadSupportsCounts(), loadBadgesTop()]);
    } catch (e) {
      console.error(e);
      setProfiles([]);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setRole(userId: string, nextRole: string) {
    try {
      setProfiles((prev) => prev.map((p) => (p.user_id === userId ? { ...p, role: nextRole } : p)));

      const { error } = await supabase.from('profiles').update({ role: nextRole }).eq('user_id', userId);
      if (error) throw error;
    } catch (e) {
      console.error(e);
      await loadAll();
      alert('변경이 실패했어요. (권한/RLS 또는 컬럼 확인 필요)');
    }
  }

  if (loading) {
    return (
      <div className={s.wrap}>
        <div className={s.header}>
          <div className={s.title}>관리자 대시보드</div>
          <div className={s.sub}>불러오는 중...</div>
        </div>
        <div className={s.panel}>
          <div className={s.skeleton} />
          <div className={s.skeleton} />
          <div className={s.skeleton} />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className={s.wrap}>
        <div className={s.header}>
          <div className={s.title}>관리자 전용</div>
          <div className={s.sub}>권한이 없어서 접근할 수 없어요.</div>

          <div className={s.topRight}>
            <Link className={s.miniBtn} href="/home">
              홈
            </Link>
          </div>
        </div>

        <div className={s.panel}>
          <div className={s.card}>
            <div className={s.cardTitle}>안내</div>
            <div className={s.cardDesc}>관리자 계정(role=admin)으로 로그인했는지 확인해 주세요.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.wrap}>
      {/* 상단 */}
      <div className={s.header}>
        <div className={s.title}>관리자 대시보드</div>
        <div className={s.sub}>회원 · 문의 · 배지 현황을 한눈에</div>

        <div className={s.topRight}>
          <Link className={s.miniBtn} href="/home">
            홈
          </Link>
          <button className={s.miniBtn} onClick={() => loadAll()}>
            새로고침
          </button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className={s.grid}>
        <div className={`${s.stat} ${s.statWhite}`}>
          <div className={s.statLabel}>전체 회원</div>
          <div className={s.statValue}>{totalCount}</div>
        </div>
        <div className={`${s.stat} ${s.statMint}`}>
          <div className={s.statLabel}>일반 회원</div>
          <div className={s.statValue}>{userCount}</div>
        </div>
        <div className={`${s.stat} ${s.statViolet}`}>
          <div className={s.statLabel}>관리자</div>
          <div className={s.statValue}>{adminCount}</div>
        </div>
        <div className={`${s.stat} ${s.statPink}`}>
          <div className={s.statLabel}>정지</div>
          <div className={s.statValue}>{suspendedCount}</div>
        </div>

        <div className={`${s.stat} ${s.statSky}`}>
          <div className={s.statLabel}>미열람 문의</div>
          <div className={s.statValue}>{supportUnread}</div>
        </div>
        <div className={`${s.stat} ${s.statBlue}`}>
          <div className={s.statLabel}>전체 문의</div>
          <div className={s.statValue}>{supportTotal}</div>
        </div>
      </div>

      {/* 문의 관리 */}
      <div className={s.panel}>
        <div className={s.sectionHead}>
          <div>
            <div className={s.sectionTitle}>문의 관리</div>
            <div className={s.sectionDesc}>상태별로 바로 확인하고, 답변/처리를 진행하세요.</div>
          </div>
          <div className={s.sectionRight}>
            <Link className={s.goBtn} href="/admin/support">
              문의 관리로 이동
            </Link>
          </div>
        </div>

        <div className={s.supportGrid}>
          <div className={`${s.supportCard} ${s.scA}`}>
            <div className={s.supportLabel}>미열람</div>
            <div className={s.supportValue}>{supportUnread}</div>
          </div>
          <div className={`${s.supportCard} ${s.scB}`}>
            <div className={s.supportLabel}>진행중</div>
            <div className={s.supportValue}>{supportOpen}</div>
          </div>
          <div className={`${s.supportCard} ${s.scC}`}>
            <div className={s.supportLabel}>답변중</div>
            <div className={s.supportValue}>{supportPending}</div>
          </div>
          <div className={`${s.supportCard} ${s.scD}`}>
            <div className={s.supportLabel}>완료</div>
            <div className={s.supportValue}>{supportClosed}</div>
          </div>
        </div>
      </div>

      {/* 배지 현황 */}
      <div className={s.panel}>
        <div className={s.sectionHead}>
          <div>
            <div className={s.sectionTitle}>배지 현황</div>
            <div className={s.sectionDesc}>활동지수 기반 배지(주간 TOP)를 보여줍니다.</div>
          </div>
          <div className={s.sectionRight}>
            <button className={s.goBtnGhost} onClick={() => loadBadgesTop()}>
              배지 새로고침
            </button>
          </div>
        </div>

        {badgeHint ? (
          <div className={s.hintBox}>{badgeHint}</div>
        ) : badgeRows.length === 0 ? (
          <div className={s.empty}>표시할 배지 데이터가 없어요.</div>
        ) : (
          <div className={s.badgeList}>
            {badgeRows.map((r, idx) => {
              const name = r.nickname ?? r.name ?? '(이름 없음)';
              return (
                <div key={`${r.user_id}-${idx}`} className={s.badgeRow}>
                  <div className={s.badgeRank}>TOP {idx + 1}</div>
                  <div className={s.badgeMain}>
                    <div className={s.badgeName}>
                      {r.badge_name ?? '배지'}
                      <span className={s.badgeChip}>{name}</span>
                    </div>
                    <div className={s.badgeMeta}>
                      <span>점수: {typeof r.score === 'number' ? r.score : '-'}</span>
                      <span>주간: {r.week_start ? fmtDate(r.week_start) : '-'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 회원 리스트 */}
      <div className={s.panel}>
        <div className={s.sectionHead}>
          <div>
            <div className={s.sectionTitle}>회원 리스트</div>
            <div className={s.sectionDesc}>정지/복구/관리자 지정은 관리자에게만 보이며 즉시 반영됩니다.</div>
          </div>

          <div className={s.searchBox}>
            <input className={s.search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름/닉네임/이메일/ID 검색" />
          </div>
        </div>

        <div className={s.list}>
          {filtered.length === 0 ? (
            <div className={s.empty}>검색 결과가 없어요.</div>
          ) : (
            filtered.map((p) => {
              const displayName = p.nickname ?? p.name ?? '(이름 없음)';
              const role = p.role ?? 'user';

              return (
                <div key={p.user_id} className={s.userCard}>
                  <div className={s.userLeft}>
                    <div className={s.userNameRow}>
                      <div className={s.userName}>{displayName}</div>

                      {role === 'admin' && <span className={`${s.badge} ${s.badgeAdmin}`}>관리자</span>}
                      {role === 'suspended' && <span className={`${s.badge} ${s.badgeSusp}`}>정지</span>}
                      {role !== 'admin' && role !== 'suspended' && <span className={`${s.badge} ${s.badgeUser}`}>일반</span>}
                    </div>

                    <div className={s.userMeta}>
                      <div className={s.metaItem}>
                        <span className={s.metaKey}>이메일</span>
                        <span className={s.metaVal}>{p.email ?? '-'}</span>
                      </div>
                      <div className={s.metaItem}>
                        <span className={s.metaKey}>가입일</span>
                        <span className={s.metaVal}>{fmtDate(p.created_at)}</span>
                      </div>
                      <div className={s.metaItem}>
                        <span className={s.metaKey}>회원 ID</span>
                        <span className={s.metaValMono}>{p.user_id}</span>
                      </div>
                    </div>
                  </div>

                  <div className={s.userRight}>
                    <div className={s.roleLine}>
                      <span className={s.roleText}>현재 상태: {roleLabel(role)}</span>
                    </div>

                    <div className={s.btnRow}>
                      {role === 'suspended' ? (
                        <button className={`${s.actionBtn} ${s.restore}`} onClick={() => setRole(p.user_id, 'user')}>
                          복구
                        </button>
                      ) : role === 'admin' ? (
                        <button className={`${s.actionBtn} ${s.dim}`} disabled>
                          관리자
                        </button>
                      ) : (
                        <button className={`${s.actionBtn} ${s.suspend}`} onClick={() => setRole(p.user_id, 'suspended')}>
                          정지
                        </button>
                      )}

                      {role !== 'admin' && (
                        <button className={`${s.actionBtn} ${s.promote}`} onClick={() => setRole(p.user_id, 'admin')}>
                          관리자 지정
                        </button>
                      )}
                      {role === 'admin' && (
                        <button className={`${s.actionBtn} ${s.demote}`} onClick={() => setRole(p.user_id, 'user')}>
                          관리자 해제
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className={s.footerNote}>
          ⚠️ 정지/복구가 실패하면 <b>profiles.role 업데이트 RLS 정책</b>이 관리자에게 열려있는지 확인이 필요합니다.
        </div>
      </div>
    </div>
  );
}
