'use client';

import { useMemo } from 'react';

export type DealData = {
  product: string;
  issue: string;
  amount?: number;
  manageNote: string;
};

type Props = {
  value: DealData;
  onChange: (next: DealData) => void;
  title?: string;
};

function numToText(n: number | undefined) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '';
  return String(n);
}

function textToNum(raw: string): number | undefined {
  const v = (raw || '').replace(/[,\s]/g, '').trim();
  if (!v) return undefined;
  const n = Number(v);
  if (Number.isNaN(n)) return undefined;
  return n;
}

export default function DealCard({ value, onChange, title = '진행관리' }: Props) {
  const v = value || { product: '', issue: '', amount: undefined, manageNote: '' };

  const amountText = useMemo(() => numToText(v.amount), [v.amount]);

  return (
    <section className="wrap" aria-label="deal-card">
      <div className="head">
        <div className="badge" aria-hidden="true" />
        <div className="ttl">{title}</div>
      </div>

      <div className="grid">
        <label className="field">
          <span className="label">상품</span>
          <input
            className="input"
            value={v.product || ''}
            onChange={(e) => onChange({ ...v, product: (e.target as HTMLInputElement).value })}
            placeholder="예: 종신보험 / 정기 / 펀드 / 렌탈 등"
          />
        </label>

        <label className="field">
          <span className="label">금액</span>
          <input
            className="input"
            inputMode="numeric"
            value={amountText}
            onChange={(e) => {
              const next = textToNum((e.target as HTMLInputElement).value);
              onChange({ ...v, amount: next });
            }}
            placeholder="예: 1000000"
          />
          <span className="hint">숫자만 입력 (빈값 가능)</span>
        </label>

        <label className="field full">
          <span className="label">이슈</span>
          <input
            className="input"
            value={v.issue || ''}
            onChange={(e) => onChange({ ...v, issue: (e.target as HTMLInputElement).value })}
            placeholder="예: 가족반대 / 가격부담 / 기존상품 유지 등"
          />
        </label>

        <label className="field full">
          <span className="label">상담내역</span>
          <textarea
            className="textarea"
            value={v.manageNote || ''}
            onChange={(e) => onChange({ ...v, manageNote: (e.target as HTMLTextAreaElement).value })}
            placeholder="상담 흐름/핵심 포인트/다음 액션을 적어두세요"
          />
        </label>
      </div>

      <style jsx>{`
        .wrap {
          width: 100%;
        }

        .head {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .badge {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: linear-gradient(180deg, #ff6bd6, #a855f7);
          box-shadow: 0 10px 24px rgba(168, 85, 247, 0.25);
        }

        .ttl {
          font-size: 16px;
          font-weight: 900;
          color: #2b1b3a;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        .label {
          font-size: 14px;
          font-weight: 900;
          color: #4a235f;
        }

        .input,
        .textarea {
          width: 100%;
          border-radius: 16px;
          border: 1px solid rgba(168, 85, 247, 0.22);
          background: rgba(255, 255, 255, 0.92);
          padding: 12px 12px;
          font-size: 16px;
          outline: none;
          color: #1f1030;
        }

        .textarea {
          min-height: 110px;
          resize: vertical;
        }

        .input:focus,
        .textarea:focus {
          border-color: rgba(255, 79, 209, 0.55);
          box-shadow: 0 0 0 4px rgba(255, 79, 209, 0.14);
        }

        .hint {
          font-size: 12px;
          font-weight: 800;
          color: rgba(70, 30, 95, 0.6);
          padding-left: 2px;
        }

        @media (max-width: 720px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
