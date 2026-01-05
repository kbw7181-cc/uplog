'use client';

import { FormEvent, useMemo, useRef, useState } from 'react';
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
      !loading
    );
  }, [name, nickname, phone, company, team, email, pw, pw2, birth, addressText, industry, industryCustom, loading]);

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
    if (!canSubmit) return;

    setLoading(true);
    setMsg(null);

    const addr = regionToLatLon(addressText.trim());
    const finalIndustry = industryCustom.trim().length >= 1 ? industryCustom.trim() : industry;

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pw.trim(),
      });

      if (error) {
        setMsg(error.message || '회원가입(계정 생성)에 실패했어요.');
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        setMsg('계정은 만들어졌는데 사용자 ID를 못 가져왔어요. 다시 시도해 주세요.');
        return;
      }

      let avatarPath: string | null = null;
      if (avatarFile) avatarPath = await uploadAvatarIfAny(avatarFile, userId);

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
      };

      const { error: upsertErr } = await supabase.from('profiles').upsert(payload, { onConflict: 'user_id' });

      if (upsertErr) {
        setMsg(`프로필 저장 실패: ${upsertErr.message}`);
        return;
      }

      if (data.session) {
        router.replace('/home');
        return;
      }

      setMsg('회원가입 완료! 이메일 인증 후 로그인해 주세요.');
      setTimeout(() => router.replace('/login'), 900);
    } catch (err: any) {
      setMsg(err?.message || '회원가입 중 오류가 발생했어요.');
    } finally {
      setLoading(false);
    }
  }

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
            <div className="sub">회원가입</div>
          </div>
        </header>

        <form className="form" onSubmit={onSubmit}>
          <div className="avatarRow">
            <div className="avatar">
              {avatarPreview ? <img src={avatarPreview} alt="" className="avatarImg" /> : <div className="avatarPh">🙂</div>}
            </div>
            <div className="avatarBtns">
              <button type="button" className="miniBtn" onClick={() => fileRef.current?.click()} disabled={loading}>
                프로필 이미지 선택
              </button>
              <button
                type="button"
                className="miniBtn ghost"
                onClick={() => {
                  setAvatarFile(null);
                  setAvatarPreview(null);
                  if (fileRef.current) fileRef.current.value = '';
                }}
                disabled={loading}
              >
                제거
              </button>
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
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" />
            </label>
            <label className="label">
              <span>닉네임</span>
              <input className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="닉네임" />
            </label>
          </div>

          <div className="grid2">
            <label className="label">
              <span>전화번호</span>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01012345678" inputMode="tel" />
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

          {/* ✅ 업종 + 직접입력(옆) */}
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
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" inputMode="email" />
            </label>
            <label className="label">
              <span>주소(날씨 연동)</span>
              <input className="input" value={addressText} onChange={(e) => setAddressText(e.target.value)} onBlur={onAddressBlur} placeholder="예: 대전 서구…" />
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
              <input className="input" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="8자 이상" type="password" />
            </label>
            <label className="label">
              <span>비밀번호 확인</span>
              <input className="input" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="한 번 더" type="password" />
            </label>
          </div>

          {msg ? <div className="msg">{msg}</div> : null}

          <button className="btn primary" disabled={!canSubmit} type="submit">
            {loading ? '처리 중…' : '회원가입 완료'}
          </button>

          <Link className="btn ghost" href="/login">
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
            radial-gradient(circle at 88% 18%, rgba(145, 80, 255, 0.40), transparent 52%),
            radial-gradient(circle at 45% 95%, rgba(255, 170, 235, 0.22), transparent 50%),
            linear-gradient(135deg, #a23ea7 0%, #7b3fe6 100%);
          filter: saturate(1.05);
          z-index: 0;
        }

        .card {
          width: min(980px, 96vw);
          border-radius: 28px;
          padding: 24px 22px 22px;
          background: rgba(0, 0, 0, 0.22); /* ✅ 더 진하게(가독성) */
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 18px 70px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(12px);
          z-index: 1;
        }

        .head {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 6px 6px 14px;
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
        }

        .brand {
          font-size: 26px;
          font-weight: 1000;
          letter-spacing: 0.4px;
          color: #ffffff; /* ✅ 완전 흰색 */
          text-shadow: 0 8px 22px rgba(0, 0, 0, 0.35);
        }

        .sub {
          margin-top: 4px;
          font-size: 16px;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.88); /* ✅ 더 밝게 */
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 6px;
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
        }

        .miniBtn {
          height: 40px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: rgba(0, 0, 0, 0.18);
          color: #ffffff;
          font-weight: 950;
          cursor: pointer;
          width: 220px;
          max-width: 100%;
        }

        .miniBtn.ghost {
          opacity: 0.88;
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
          color: rgba(255, 255, 255, 0.92); /* ✅ 더 밝게 */
          margin: 10px 0 8px;
        }

        .input {
          width: 100%;
          height: 54px;
          border-radius: 18px;
          padding: 0 16px;
          font-size: 16px;
          color: #ffffff;

          /* ✅ 입력칸 더 밝게(안 보인다는 문제 해결) */
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.30);
          outline: none;
          display: block;
        }

        .select {
          appearance: none;
        }

        .input::placeholder {
          color: rgba(255, 255, 255, 0.72);
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
        }

        .btn {
          height: 56px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          font-size: 18px;
          font-weight: 1000;
          text-decoration: none;
          user-select: none;
          width: 100%;

          border: 2px solid rgba(255, 255, 255, 0.34);
          transition: transform 0.14s ease, filter 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease;
        }

        .primary {
          margin-top: 6px;
          background: linear-gradient(90deg, #ff4db8 0%, #b86bff 55%, #7c3aed 100%);
          color: #fff;
          box-shadow: 0 18px 42px rgba(255, 77, 184, 0.2);
          cursor: pointer;
        }

        .primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 24px 58px rgba(0, 0, 0, 0.45), 0 0 18px rgba(255, 77, 184, 0.22), 0 0 22px rgba(184, 107, 255, 0.18);
          filter: brightness(1.05);
          border-color: rgba(255, 255, 255, 0.55);
        }

        .primary:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .ghost {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.95);
        }

        .ghost:hover {
          transform: translateY(-1px);
          border-color: rgba(255, 255, 255, 0.55);
          box-shadow: 0 18px 44px rgba(0, 0, 0, 0.35);
          filter: brightness(1.05);
        }
      `}</style>
    </main>
  );
}
