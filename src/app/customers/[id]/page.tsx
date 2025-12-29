'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ClientShell from '@/app/components/ClientShell';
import { supabase } from '@/lib/supabaseClient';

type CustomerRow = {
  id: string;
  user_id: string;

  name: string | null;
  phone: string | null;

  stage?: string | null;
  grade?: string | null;
  propensity?: number | null;

  address?: string | null;
  birth?: string | null;
  gender?: string | null;
  married?: boolean | null;
  children?: boolean | null;
  family?: string | null;
  job?: string | null;
  medical?: string | null;

  memo?: string | null;
  notes_json?: any | null;

  created_at?: string | null;
};

function safeNum(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toCustomerRow(data: unknown): CustomerRow | null {
  // ✅ TS 빨간줄 제거 핵심: unknown → CustomerRow로 “한 번만” 안전 캐스팅
  if (!data || typeof data !== 'object') return null;
  return data as CustomerRow;
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const customerId = params?.id;

  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState<string | null>(null);

  const [row, setRow] = useState<CustomerRow | null>(null);

  // 폼 상태
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [stage, setStage] = useState('');
  const [grade, setGrade] = useState('');
  const [propensity, setPropensity] = useState(3);

  const [address, setAddress] = useState('');
  const [birth, setBirth] = useState('');
  const [gender, setGender] = useState('');
  const [married, setMarried] = useState(false);
  const [children, setChildren] = useState(false);
  const [family, setFamily] = useState('');
  const [job, setJob] = useState('');
  const [medical, setMedical] = useState('');

  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const headerTitle = useMemo(() => {
    const n = (name || row?.name || '').trim();
    return n ? `${n} 고객 상세` : '고객 상세';
  }, [name, row]);

  useEffect(() => {
    let alive = true;

    async function boot() {
      setLoading(true);
      setErr(null);

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id || null;
      if (!alive) return;
      setMeId(uid);

      if (!customerId) {
        setErr('고객 ID가 없습니다.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('customers')
        .select(
          [
            'id',
            'user_id',
            'name',
            'phone',
            'stage',
            'grade',
            'propensity',
            'address',
            'birth',
            'gender',
            'married',
            'children',
            'family',
            'job',
            'medical',
            'memo',
            'notes_json',
            'created_at',
          ].join(',')
        )
        .eq('id', customerId)
        .maybeSingle();

      if (!alive) return;

      if (error) {
        setErr(error.message);
        setRow(null);
        setLoading(false);
        return;
      }

      const cust = toCustomerRow(data);

      if (!cust) {
        setErr('해당 고객을 찾을 수 없습니다.');
        setRow(null);
        setLoading(false);
        return;
      }

      // ✅ 이제부터는 cust.xxx로만 접근 → 빨간줄 사라짐
      setRow(cust);

      setName((cust.name || '').trim());
      setPhone((cust.phone || '').trim());
      setStage((cust.stage || '').trim());
      setGrade((cust.grade || '').trim());
      setPropensity(safeNum(cust.propensity, 3));

      setAddress((cust.address || '').trim());
      setBirth((cust.birth || '').trim());
      setGender((cust.gender || '').trim());
      setMarried(!!cust.married);
      setChildren(!!cust.children);
      setFamily((cust.family || '').trim());
      setJob((cust.job || '').trim());
      setMedical((cust.medical || '').trim());

      setMemo((cust.memo || '').trim());

      setLoading(false);
    }

    boot();
    return () => {
      alive = false;
    };
  }, [customerId]);

  async function onSave() {
    if (!customerId) return;
    setSaving(true);
    setErr(null);

    const patch: Partial<CustomerRow> = {
      name: name.trim() || null,
      phone: phone.trim() || null,
      stage: stage.trim() || null,
      grade: grade.trim() || null,
      propensity: safeNum(propensity, 3),

      address: address.trim() || null,
      birth: birth.trim() || null,
      gender: gender.trim() || null,
      married: !!married,
      children: !!children,
      family: family.trim() || null,
      job: job.trim() || null,
      medical: medical.trim() || null,

      memo: memo.trim() || null,
    };

    const { error } = await supabase.from('customers').update(patch).eq('id', customerId);

    if (error) {
      setErr(error.message);
      setSaving(false);
      return;
    }

    const { data: data2, error: error2 } = await supabase
      .from('customers')
      .select(
        [
          'id',
          'user_id',
          'name',
          'phone',
          'stage',
          'grade',
          'propensity',
          'address',
          'birth',
          'gender',
          'married',
          'children',
          'family',
          'job',
          'medical',
          'memo',
          'notes_json',
          'created_at',
        ].join(',')
      )
      .eq('id', customerId)
      .maybeSingle();

    if (!error2) {
      const cust2 = toCustomerRow(data2);
      if (cust2) setRow(cust2);
    }

    setSaving(false);
  }

  return (
    <ClientShell>
      <div className="wrap">
        <div className="topBar">
          <button type="button" className="backBtn" onClick={() => router.back()}>
            ←
          </button>
          <div className="title">{headerTitle}</div>
          <div className="right">
            <button type="button" className="saveBtn" onClick={onSave} disabled={saving || loading}>
              {saving ? '저장중…' : '저장'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="card">불러오는 중…</div>
        ) : err ? (
          <div className="card err">{err}</div>
        ) : (
          <>
            <div className="card">
              <div className="secTitle">기본 정보</div>
              <div className="grid">
                <label className="field">
                  <span>고객명</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 김하나" />
                </label>

                <label className="field">
                  <span>전화번호</span>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="예: 010-0000-0000" />
                </label>

                <label className="field">
                  <span>진행 단계</span>
                  <input value={stage} onChange={(e) => setStage(e.target.value)} placeholder="예: 신규 / 가망1 / 계약2" />
                </label>

                <label className="field">
                  <span>등급</span>
                  <input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="예: A / VIP" />
                </label>

                <label className="field">
                  <span>성향(1~5)</span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={propensity}
                    onChange={(e) => setPropensity(safeNum(e.target.value, 3))}
                  />
                </label>
              </div>
            </div>

            <div className="card">
              <div className="secTitle">상세 정보</div>
              <div className="grid">
                <label className="field">
                  <span>주소</span>
                  <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="예: 대전 유성구…" />
                </label>

                <label className="field">
                  <span>생년월일</span>
                  <input value={birth} onChange={(e) => setBirth(e.target.value)} placeholder="예: 1990-01-01" />
                </label>

                <label className="field">
                  <span>성별</span>
                  <input value={gender} onChange={(e) => setGender(e.target.value)} placeholder="예: 여성/남성" />
                </label>

                <div className="toggles">
                  <button type="button" className={`toggle ${married ? 'on' : ''}`} onClick={() => setMarried((v) => !v)}>
                    {married ? '기혼' : '미혼'}
                  </button>
                  <button type="button" className={`toggle ${children ? 'on' : ''}`} onClick={() => setChildren((v) => !v)}>
                    {children ? '자녀 있음' : '자녀 없음'}
                  </button>
                </div>

                <label className="field">
                  <span>가족</span>
                  <input value={family} onChange={(e) => setFamily(e.target.value)} placeholder="예: 2인 가족" />
                </label>

                <label className="field">
                  <span>직업</span>
                  <input value={job} onChange={(e) => setJob(e.target.value)} placeholder="예: 회사원" />
                </label>

                <label className="field">
                  <span>병력/특이사항</span>
                  <input value={medical} onChange={(e) => setMedical(e.target.value)} placeholder="예: 알레르기…" />
                </label>
              </div>
            </div>

            <div className="card">
              <div className="secTitle">메모</div>
              <textarea
                className="textarea"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="고객 고민/특이사항/관리 포인트를 적어두세요."
              />
            </div>

            <div className="bottom">
              <button type="button" className="ghostBtn" onClick={() => router.push('/customers')}>
                고객목록
              </button>
              <button type="button" className="saveBtn2" onClick={onSave} disabled={saving}>
                {saving ? '저장중…' : '저장'}
              </button>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .wrap {
          max-width: 920px;
          margin: 0 auto;
          padding: 18px 16px 40px;
        }

        .topBar {
          display: grid;
          grid-template-columns: 50px 1fr auto;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }
        .backBtn {
          width: 46px;
          height: 42px;
          border-radius: 14px;
          border: 1px solid rgba(160, 120, 255, 0.28);
          background: rgba(255, 255, 255, 0.72);
          color: #2a0c3a;
          font-weight: 950;
          cursor: pointer;
        }
        .title {
          font-size: 18px;
          font-weight: 950;
          color: #2a0c3a;
          letter-spacing: -0.2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .right {
          display: flex;
          justify-content: flex-end;
        }
        .saveBtn {
          height: 42px;
          padding: 0 14px;
          border-radius: 14px;
          border: 0;
          background: linear-gradient(135deg, rgba(255, 92, 172, 0.96), rgba(155, 98, 255, 0.92));
          color: white;
          font-weight: 950;
          cursor: pointer;
          box-shadow: 0 12px 24px rgba(120, 60, 220, 0.18);
        }
        .saveBtn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .card {
          border-radius: 22px;
          border: 1px solid rgba(120, 80, 200, 0.18);
          background: rgba(255, 255, 255, 0.84);
          box-shadow: 0 18px 45px rgba(40, 10, 70, 0.08);
          padding: 16px;
          margin-bottom: 14px;
          color: #250b34;
          font-weight: 850;
        }
        .card.err {
          border-color: rgba(255, 90, 150, 0.35);
          background: rgba(255, 240, 248, 0.92);
          color: #7a0f3a;
        }

        .secTitle {
          font-size: 15px;
          font-weight: 950;
          margin-bottom: 10px;
          letter-spacing: -0.2px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field span {
          font-size: 12px;
          font-weight: 950;
          color: rgba(30, 10, 40, 0.68);
        }
        input {
          height: 44px;
          border-radius: 14px;
          border: 1px solid rgba(160, 120, 255, 0.22);
          background: rgba(255, 255, 255, 0.78);
          padding: 0 12px;
          font-size: 15px;
          font-weight: 900;
          color: #250b34;
          outline: none;
        }

        .toggles {
          display: flex;
          gap: 10px;
          align-items: center;
          padding-top: 22px;
        }
        .toggle {
          height: 44px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid rgba(160, 120, 255, 0.22);
          background: rgba(255, 255, 255, 0.72);
          font-weight: 950;
          color: #2a0c3a;
          cursor: pointer;
        }
        .toggle.on {
          border: 0;
          background: linear-gradient(135deg, rgba(255, 92, 172, 0.96), rgba(155, 98, 255, 0.92));
          color: white;
          box-shadow: 0 12px 22px rgba(120, 60, 220, 0.16);
        }

        .textarea {
          width: 100%;
          min-height: 120px;
          border-radius: 18px;
          border: 1px solid rgba(160, 120, 255, 0.22);
          background: rgba(255, 255, 255, 0.78);
          padding: 12px;
          font-size: 14px;
          font-weight: 850;
          color: #250b34;
          outline: none;
          resize: vertical;
        }

        .bottom {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 10px;
        }
        .ghostBtn {
          height: 46px;
          padding: 0 14px;
          border-radius: 16px;
          border: 1px solid rgba(160, 120, 255, 0.22);
          background: rgba(255, 255, 255, 0.72);
          font-weight: 950;
          color: #2a0c3a;
          cursor: pointer;
        }
        .saveBtn2 {
          height: 46px;
          padding: 0 16px;
          border-radius: 16px;
          border: 0;
          background: linear-gradient(135deg, rgba(255, 92, 172, 0.96), rgba(155, 98, 255, 0.92));
          color: white;
          font-weight: 950;
          cursor: pointer;
          box-shadow: 0 12px 24px rgba(120, 60, 220, 0.18);
        }

        @media (max-width: 720px) {
          .grid {
            grid-template-columns: 1fr;
          }
          .toggles {
            padding-top: 0;
          }
        }
      `}</style>
    </ClientShell>
  );
}
