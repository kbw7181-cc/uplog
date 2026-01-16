// ✅✅✅ 전체복붙: src/app/register/page.tsx
'use client';

import { FormEvent, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Industry =
  | '보험'
  | '금융'
  | '부동산'
  | '피부/화장품'
  | '교육'
  | '유통/리테일'
  | 'IT/서비스'
  | '기타';

const INDUSTRY_LIST: Industry[] = ['보험', '금융', '부동산', '피부/화장품', '교육', '유통/리테일', 'IT/서비스', '기타'];

function onlyDigits(s: string) {
  return (s || '').replace(/\D/g, '');
}

function regionToLatLon(addressText: string): { lat: number; lon: number; label: string } {
  const t = (addressText || '').replace(/\s+/g, '').toLowerCase();
  if (t.includes('서울')) return { lat: 37.5665, lon: 126.978, label: '서울' };
  if (t.includes('부산')) return { lat: 35.1796, lon: 129.0756, label: '부산' };
  if (t.includes('대전')) return { lat: 36.3504, lon: 127.3845, label: '대전' };
  if (t.includes('대구')) return { lat: 35.8714, lon: 128.6014, label: '대구' };
  if (t.includes('광주')) return { lat: 35.1595, lon: 126.8526, label: '광주' };
  if (t.includes('인천')) return { lat: 37.4563, lon: 126.7052, label: '인천' };
  if (t.includes('울산')) return { lat: 35.5384, lon: 129.3114, label: '울산' };
  if (t.includes('세종')) return { lat: 36.4801, lon: 127.289, label: '세종' };
  return { lat: 37.5665, lon: 126.978, label: '서울(기본)' };
}

async function uploadAvatarIfAny(file: File, userId: string): Promise<string> {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `avatars/${userId}_${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || 'image/png',
  });

  if (error) throw error;
  return path;
}

export default function RegisterPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');

  const [company, setCompany] = useState('');
  const [team, setTeam] = useState('');

  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');

  const [birth, setBirth] = useState('');
  const [industry, setIndustry] = useState<Industry>('보험');
  const [industryCustom, setIndustryCustom] = useState('');

  const [addressText, setAddressText] = useState('');
  const [addrPreview, setAddrPreview] = useState<{ lat: number; lon: number; label: string } | null>(null);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // ✅ 약관/개인정보 동의
  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false); // 이용약관(필수)
  const [agreePrivacy, setAgreePrivacy] = useState(false); // 개인정보처리방침(필수)
  const [agreeMarketing, setAgreeMarketing] = useState(false); // 마케팅(선택)

  // ✅ 버튼 네온 hover state(게이트와 동일 컨셉)
  const [hoverBtn, setHoverBtn] = useState<'primary' | 'ghost' | 'mini' | 'miniGhost' | null>(null);

  // ✅ 전체동의 상태 자동 동기(3개가 모두 true일 때만 전체동의 true)
  useEffect(() => {
    const nextAll = agreeTerms && agreePrivacy && agreeMarketing;
    setAgreeAll((prev) => (prev === nextAll ? prev : nextAll));
  }, [agreeTerms, agreePrivacy, agreeMarketing]);

  function toggleAll(next: boolean) {
    setAgreeAll(next);
    setAgreeTerms(next);
    setAgreePrivacy(next);
    setAgreeMarketing(next);
  }

  const canSubmit = useMemo(() => {
    const e = email.trim();
    const p = pw.trim();
    const p2 = pw2.trim();

    const phoneDigits = onlyDigits(phone);
    const okPhone = phoneDigits.length >= 10;

    const finalIndustry = industryCustom.trim().length >= 1 ? industryCustom.trim() : industry;

    return (
      name.trim().length >= 1 &&
      nickname.trim().length >= 1 &&
      okPhone &&
      company.trim().length >= 1 &&
      team.trim().length >= 1 &&
      e.includes('@') &&
      p.length >= 8 &&
      p === p2 &&
      birth.trim().length >= 8 &&
      addressText.trim().length >= 2 &&
      String(finalIndustry).trim().length >= 1 &&
      agreeTerms &&
      agreePrivacy &&
      !loading
    );
  }, [
    name,
    nickname,
    phone,
    company,
    team,
    email,
    pw,
    pw2,
    birth,
    addressText,
    industry,
    industryCustom,
    agreeTerms,
    agreePrivacy,
    loading,
  ]);

  function onAddressBlur() {
    const t = addressText.trim();
    if (!t) {
      setAddrPreview(null);
      return;
    }
    setAddrPreview(regionToLatLon(t));
  }

  function onPickAvatar(file: File) {
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setMsg(null);

    const addr = regionToLatLon(addressText.trim());
    const finalIndustry = industryCustom.trim().length >= 1 ? industryCustom.trim() : industry;

    try {
      // 1) Auth 계정 생성
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pw.trim(),
      });

      if (error) {
        setMsg(error.message || '회원가입(계정 생성)에 실패했어요.');
        return;
      }

      const userId = data.user?.id;

      // ✅ signUp 직후 user가 null일 수 있음
      if (!userId) {
        setMsg('회원가입 요청은 완료됐어요. 이메일 인증을 확인하고 로그인해 주세요.');
        setTimeout(() => router.replace('/login'), 900);
        return;
      }

      // 2) 아바타 업로드(실패해도 가입 흐름은 계속)
      let avatarPath: string | null = null;
      if (avatarFile) {
        try {
          avatarPath = await uploadAvatarIfAny(avatarFile, userId);
        } catch (avatarErr: any) {
          setMsg(`(참고) 프로필 이미지 업로드 실패: ${avatarErr?.message || '업로드 오류'}`);
          avatarPath = null;
        }
      }

      // 3) profiles upsert(실패해도 가입 성공 흐름은 유지)
      const now = new Date().toISOString();
      const payload: any = {
        user_id: userId,
        email: email.trim(),
        name: name.trim(),
        nickname: nickname.trim(),
        phone: onlyDigits(phone),
        company: company.trim(),
        team: team.trim(),
        industry: finalIndustry,
        birth,
        address_text: addressText.trim(),
        lat: addr.lat,
        lon: addr.lon,
        avatar_url: avatarPath,
        role: 'user',

        terms_agreed_at: agreeTerms ? now : null,
        privacy_agreed_at: agreePrivacy ? now : null,
        marketing_agreed_at: agreeMarketing ? now : null,
        consent_version: '2026-01-16',
      };

      const { error: upsertErr } = await supabase.from('profiles').upsert(payload, { onConflict: 'user_id' });

      const profileWarn = upsertErr ? ` (프로필 저장은 실패했어요: ${upsertErr.message})` : '';

      // 4) 세션 유무 분기
      if (data.session) {
        setMsg(`회원가입 완료!${profileWarn}`);
        router.replace('/home');
        return;
      }

      setMsg(`회원가입 요청 완료! 이메일 인증 후 로그인해 주세요.${profileWarn}`);
      setTimeout(() => router.replace('/login'), 1100);
    } catch (err: any) {
      setMsg(err?.message || '회원가입 중 오류가 발생했어요.');
    } finally {
      setLoading(false);
    }
  }

  // ✅ 게이트와 같은 “무조건 보이는” 네온 버튼 스타일(인라인)
  const baseNeonBtn: CSSProperties = useMemo(
    () => ({
      width: '100%',
      height: 58,
      borderRadius: 999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textDecoration: 'none',
      color: '#fff',
      fontFamily: "Pretendard, SUIT, system-ui, -apple-system, 'Segoe UI', sans-serif",
      fontSize: 18,
      fontWeight: 1000,
      letterSpacing: '-0.2px',
      userSelect: 'none',
      WebkitTapHighlightColor: 'transparent',
      border: '2px solid rgba(255,255,255,0.34)',
      textShadow: '0 2px 14px rgba(0,0,0,0.45)',
      transition: 'transform .18s ease, filter .18s ease, box-shadow .22s ease, border-color .18s ease',
    }),
    []
  );

  const primaryBtnStyle: CSSProperties = useMemo(() => {
    const on = hoverBtn === 'primary';
    return {
      ...baseNeonBtn,
      background:
        'linear-gradient(90deg, rgba(255,77,184,0.96) 0%, rgba(184,107,255,0.92) 55%, rgba(124,58,237,0.92) 100%)',
      boxShadow: on
        ? '0 0 0 2px rgba(255,255,255,1), 0 0 40px rgba(255,77,184,0.92), 0 0 90px rgba(168,85,247,0.70), 0 28px 70px rgba(0,0,0,0.55)'
        : '0 0 0 1px rgba(255,255,255,0.58), 0 0 14px rgba(255,77,184,0.28), 0 0 22px rgba(168,85,247,0.20), 0 16px 34px rgba(0,0,0,0.42)',
      borderColor: on ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.34)',
      transform: on ? 'translateY(-2px) scale(1.02)' : 'translateY(0px) scale(1)',
      filter: on ? 'brightness(1.10)' : 'brightness(1)',
      cursor: loading ? 'not-allowed' : 'pointer',
      opacity: !canSubmit ? 0.55 : 1,
    };
  }, [baseNeonBtn, hoverBtn, loading, canSubmit]);

  const ghostBtnStyle: CSSProperties = useMemo(() => {
    const on = hoverBtn === 'ghost';
    return {
      ...baseNeonBtn,
      height: 54,
      background: 'rgba(255,255,255,0.10)',
      boxShadow: on
        ? '0 0 0 2px rgba(255,255,255,0.95), 0 0 34px rgba(168,85,247,0.55), 0 0 70px rgba(255,77,184,0.35), 0 22px 54px rgba(0,0,0,0.45)'
        : '0 0 0 1px rgba(255,255,255,0.42), 0 16px 34px rgba(0,0,0,0.38)',
      borderColor: on ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.26)',
      transform: on ? 'translateY(-2px) scale(1.01)' : 'translateY(0px) scale(1)',
      filter: on ? 'brightness(1.08)' : 'brightness(1)',
      cursor: 'pointer',
    };
  }, [baseNeonBtn, hoverBtn]);

  const miniBase: CSSProperties = useMemo(
    () => ({
      height: 40,
      borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.28)',
      background: 'rgba(0,0,0,0.18)',
      color: '#fff',
      fontWeight: 950,
      cursor: 'pointer',
      width: 220,
      maxWidth: '100%',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      textShadow: '0 2px 12px rgba(0,0,0,0.45)',
      transition: 'transform .16s ease, filter .16s ease, box-shadow .20s ease, border-color .16s ease',
      userSelect: 'none',
      WebkitTapHighlightColor: 'transparent',
    }),
    []
  );

  const miniBtnStyle: CSSProperties = useMemo(() => {
    const on = hoverBtn === 'mini';
    return {
      ...miniBase,
      borderColor: on ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.28)',
      boxShadow: on ? '0 0 0 2px rgba(255,255,255,0.75), 0 0 22px rgba(255,77,184,0.35), 0 0 44px rgba(168,85,247,0.28)' : 'none',
      transform: on ? 'translateY(-1px)' : 'translateY(0px)',
      filter: on ? 'brightness(1.06)' : 'brightness(1)',
      opacity: loading ? 0.7 : 1,
      cursor: loading ? 'not-allowed' : 'pointer',
    };
  }, [miniBase, hoverBtn, loading]);

  const miniGhostStyle: CSSProperties = useMemo(() => {
    const on = hoverBtn === 'miniGhost';
    return {
      ...miniBase,
      opacity: 0.9,
      borderColor: on ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.28)',
      boxShadow: on ? '0 0 0 2px rgba(255,255,255,0.65), 0 0 18px rgba(168,85,247,0.28)' : 'none',
      transform: on ? 'translateY(-1px)' : 'translateY(0px)',
      filter: on ? 'brightness(1.06)' : 'brightness(1)',
      cursor: loading ? 'not-allowed' : 'pointer',
    };
  }, [miniBase, hoverBtn, loading]);

  return (
    <main className="auth">
      <div className="bg" aria-hidden="true" />

      <section className="card" aria-label="회원가입">
        <header className="head">
          <div className="logo" aria-hidden="true">
            <img src="/gogo.png" alt="" className="logoImg" />
          </div>
          <div className="titles">
            <div className="brand">UPLOG</div>
            <div className="subTitle">회원가입</div>
          </div>
        </header>

        <form className="form" onSubmit={onSubmit}>
          <div className="avatarRow">
            <div className="avatar">
              {avatarPreview ? <img src={avatarPreview} alt="" className="avatarImg" /> : <div className="avatarPh">🙂</div>}
            </div>

            <div className="avatarBtns">
              <div className="avatarBtnRow">
                <button
                  type="button"
                  style={miniBtnStyle}
                  onMouseEnter={() => setHoverBtn('mini')}
                  onMouseLeave={() => setHoverBtn(null)}
                  onFocus={() => setHoverBtn('mini')}
                  onBlur={() => setHoverBtn(null)}
                  onClick={() => fileRef.current?.click()}
                  disabled={loading}
                >
                  프로필 이미지 선택
                </button>

                <button
                  type="button"
                  style={miniGhostStyle}
                  onMouseEnter={() => setHoverBtn('miniGhost')}
                  onMouseLeave={() => setHoverBtn(null)}
                  onFocus={() => setHoverBtn('miniGhost')}
                  onBlur={() => setHoverBtn(null)}
                  onClick={() => {
                    setAvatarFile(null);
                    setAvatarPreview(null);
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                  disabled={loading}
                >
                  제거
                </button>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPickAvatar(f);
                }}
              />

              <div className="hint">선택사항</div>
            </div>
          </div>

          <div className="grid2">
            <label className="label">
              <span>이름</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" autoComplete="name" />
            </label>
            <label className="label">
              <span>닉네임</span>
              <input className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="닉네임" />
            </label>
          </div>

          <div className="grid2">
            <label className="label">
              <span>전화번호</span>
              <input
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01012345678"
                inputMode="tel"
                autoComplete="tel"
              />
            </label>
            <label className="label">
              <span>생년월일</span>
              <input className="input" value={birth} onChange={(e) => setBirth(e.target.value)} placeholder="YYYY-MM-DD" />
            </label>
          </div>

          <div className="grid2">
            <label className="label">
              <span>회사명</span>
              <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="회사명" />
            </label>
            <label className="label">
              <span>팀명</span>
              <input className="input" value={team} onChange={(e) => setTeam(e.target.value)} placeholder="팀명" />
            </label>
          </div>

          <div className="grid2">
            <label className="label">
              <span>업종</span>
              <select className="input select" value={industry} onChange={(e) => setIndustry(e.target.value as Industry)}>
                {INDUSTRY_LIST.map((it) => (
                  <option key={it} value={it}>
                    {it}
                  </option>
                ))}
              </select>
            </label>

            <label className="label">
              <span>업종 직접입력</span>
              <input className="input" value={industryCustom} onChange={(e) => setIndustryCustom(e.target.value)} placeholder="직접 입력(선택)" />
            </label>
          </div>

          <div className="grid2">
            <label className="label">
              <span>이메일</span>
              <input
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@email.com"
                inputMode="email"
                autoComplete="email"
              />
            </label>
            <label className="label">
              <span>주소(날씨 연동)</span>
              <input
                className="input"
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                onBlur={onAddressBlur}
                placeholder="예: 대전 서구…"
                autoComplete="street-address"
              />
            </label>
          </div>

          {addrPreview ? (
            <div className="addrPreview">
              지역 <b>{addrPreview.label}</b> · lat {addrPreview.lat} · lon {addrPreview.lon}
            </div>
          ) : null}

          <div className="grid2">
            <label className="label">
              <span>비밀번호</span>
              <input className="input" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="8자 이상" type="password" autoComplete="new-password" />
            </label>
            <label className="label">
              <span>비밀번호 확인</span>
              <input className="input" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="한 번 더" type="password" autoComplete="new-password" />
            </label>
          </div>

          {msg ? <div className="msg">{msg}</div> : null}

          <div className="agreeBox">
            <label className="agreeRow">
              <input type="checkbox" checked={agreeAll} onChange={(e) => toggleAll(e.target.checked)} disabled={loading} />
              <span className="agreeText">
                전체 동의 <span className="agreeSub">(선택 포함)</span>
              </span>
            </label>

            <div className="agreeDivider" />

            <label className="agreeRow">
              <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} disabled={loading} />
              <span className="agreeText">
                (필수) 이용약관 동의
                <a className="agreeLink" href="/terms" target="_blank" rel="noreferrer">
                  보기
                </a>
              </span>
            </label>

            <label className="agreeRow">
              <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} disabled={loading} />
              <span className="agreeText">
                (필수) 개인정보처리방침 동의
                <a className="agreeLink" href="/privacy" target="_blank" rel="noreferrer">
                  보기
                </a>
              </span>
            </label>

            <label className="agreeRow">
              <input type="checkbox" checked={agreeMarketing} onChange={(e) => setAgreeMarketing(e.target.checked)} disabled={loading} />
              <span className="agreeText">
                (선택) 마케팅 정보 수신 동의 <span className="agreeSub">(이메일/푸시)</span>
              </span>
            </label>

            {!agreeTerms || !agreePrivacy ? <div className="agreeHint">⚠️ 회원가입을 위해 필수 항목에 동의해 주세요.</div> : null}
          </div>

          <button
            type="submit"
            style={primaryBtnStyle}
            disabled={!canSubmit || loading}
            onMouseEnter={() => setHoverBtn('primary')}
            onMouseLeave={() => setHoverBtn(null)}
            onFocus={() => setHoverBtn('primary')}
            onBlur={() => setHoverBtn(null)}
          >
            {loading ? '처리 중…' : '회원가입 완료'}
          </button>

          <Link
            href="/login"
            style={ghostBtnStyle}
            onMouseEnter={() => setHoverBtn('ghost')}
            onMouseLeave={() => setHoverBtn(null)}
            onFocus={() => setHoverBtn('ghost')}
            onBlur={() => setHoverBtn(null)}
          >
            로그인 하러가기
          </Link>
        </form>
      </section>

      <style jsx>{`
        :global(*),
        :global(*::before),
        :global(*::after) {
          box-sizing: border-box;
        }

        .auth {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 26px 16px;
          position: relative;
          overflow: hidden;
          background: #120022;
        }

        .bg {
          position: fixed;
          inset: 0;
          background: radial-gradient(circle at 18% 10%, rgba(255, 90, 210, 0.34), transparent 55%),
            radial-gradient(circle at 88% 18%, rgba(145, 80, 255, 0.4), transparent 52%),
            radial-gradient(circle at 45% 95%, rgba(255, 170, 235, 0.22), transparent 50%),
            linear-gradient(135deg, #a23ea7 0%, #7b3fe6 100%);
          filter: saturate(1.05);
          z-index: 0;
        }

        /* ✅ 카드 중앙/대칭 고정 */
        .card {
          width: min(980px, 96vw);
          margin: 0 auto;
          border-radius: 28px;
          padding: 22px 22px 20px; /* ✅ 좌우 동일 */
          background: rgba(0, 0, 0, 0.22);
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 18px 70px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(12px);
          z-index: 1;
        }

        /* ✅ 헤더도 grid로 “미세 쏠림” 제거 */
        .head {
          display: grid;
          grid-template-columns: 46px 1fr;
          gap: 12px;
          align-items: center;
          padding: 4px 4px 12px;
        }

        .logo {
          width: 46px;
          height: 46px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.28);
          display: grid;
          place-items: center;
          overflow: hidden;
          flex: 0 0 auto;
        }

        .logoImg {
          width: 32px;
          height: 32px;
          object-fit: contain;
          display: block;
          filter: drop-shadow(0 10px 18px rgba(255, 77, 184, 0.18));
        }

        .titles {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
          min-width: 0;
        }

        .brand {
          font-size: 26px;
          font-weight: 1000;
          letter-spacing: 0.4px;
          color: #ffffff;
          text-shadow: 0 8px 22px rgba(0, 0, 0, 0.35);
        }

        /* ✅ 기존 .sub 클래스명 충돌 방지 위해 subTitle로 분리 */
        .subTitle {
          margin-top: 4px;
          font-size: 16px;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.88);
        }

        /* ✅ form 내부 padding “애매한 6px” 제거 → 좌우 대칭 */
        .form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 8px 4px 4px; /* ✅ 좌우 균형 */
        }

        .avatarRow {
          display: grid;
          grid-template-columns: 74px 1fr;
          gap: 12px;
          align-items: center;
          padding: 8px 0 6px;
        }

        .avatar {
          width: 74px;
          height: 74px;
          border-radius: 22px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: rgba(0, 0, 0, 0.22);
          display: grid;
          place-items: center;
        }

        .avatarImg {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .avatarPh {
          font-size: 28px;
          color: rgba(255, 255, 255, 0.95);
        }

        .avatarBtns {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }

        .avatarBtnRow {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }

        .hint {
          font-size: 12px;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.82);
        }

        .grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        @media (max-width: 680px) {
          .grid2 {
            grid-template-columns: 1fr;
          }
        }

        .label span {
          display: block;
          font-size: 14px;
          font-weight: 950;
          color: rgba(255, 255, 255, 0.92);
          margin: 10px 0 8px;
        }

        .input {
          width: 100%;
          height: 54px;
          border-radius: 18px;
          padding: 0 16px;
          font-size: 16px;
          color: #ffffff;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.3);
          outline: none;
          display: block;
        }

        .select {
          appearance: none;
        }

        .input.select {
          color: #ffffff !important;
          background: linear-gradient(
            90deg,
            rgba(255, 77, 184, 0.34) 0%,
            rgba(184, 107, 255, 0.26) 55%,
            rgba(124, 58, 237, 0.28) 100%
          ) !important;
          border-color: rgba(255, 255, 255, 0.34) !important;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.18), 0 10px 30px rgba(0, 0, 0, 0.2);
          color-scheme: dark;
        }

        .input.select option {
          background: #ffffff !important;
          color: #111111 !important;
        }

        .input.select option:checked,
        .input.select option:hover {
          background: #f3e8ff !important;
          color: #111111 !important;
        }

        .input:focus {
          border-color: rgba(255, 77, 184, 0.75);
          box-shadow: 0 0 0 3px rgba(255, 77, 184, 0.22);
        }

        .addrPreview {
          margin-top: 2px;
          padding: 10px 12px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.22);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: rgba(255, 255, 255, 0.92);
          font-size: 13px;
          font-weight: 950;
        }

        .msg {
          margin-top: 2px;
          padding: 10px 12px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.26);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
          font-size: 14px;
          font-weight: 950;
          white-space: pre-wrap;
        }

        .agreeBox {
          margin-top: 6px;
          padding: 12px 12px;
          border-radius: 18px;
          background: rgba(0, 0, 0, 0.22);
          border: 1px solid rgba(255, 255, 255, 0.18);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .agreeRow {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          cursor: pointer;
          user-select: none;
        }

        .agreeRow input {
          margin-top: 2px;
          width: 18px;
          height: 18px;
          accent-color: rgba(255, 77, 184, 0.95);
        }

        .agreeText {
          font-size: 13px;
          font-weight: 950;
          color: rgba(255, 255, 255, 0.92);
          line-height: 1.35;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .agreeSub {
          font-size: 12px;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.7);
        }

        .agreeLink {
          margin-left: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.92);
          text-decoration: none;
          font-weight: 1000;
          font-size: 12px;
        }

        .agreeLink:hover {
          filter: brightness(1.08);
          border-color: rgba(255, 255, 255, 0.4);
        }

        .agreeDivider {
          height: 1px;
          background: rgba(255, 255, 255, 0.14);
          margin: 2px 0;
        }

        .agreeHint {
          margin-top: 2px;
          font-size: 12px;
          font-weight: 950;
          color: rgba(255, 220, 160, 0.95);
        }

        @media (max-width: 520px) {
          .card {
            padding: 18px 16px 16px; /* ✅ 모바일에서도 중앙 고정 */
          }
          .form {
            padding: 8px 2px 4px;
          }
        }
      `}</style>
    </main>
  );
}
