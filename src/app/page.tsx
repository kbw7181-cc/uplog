'use client';

import Link from 'next/link';
import s from './page.module.css';

export default function MainLandingPage() {
  return (
    <div className={s.root}>
      <div className={s.bg} />
      <div className={s.overlay} />

      <div className={s.actions}>
        <Link className={`${s.btn} ${s.primary}`} href="/login">
          로그인
        </Link>
        <Link className={`${s.btn} ${s.ghost}`} href="/register">
          회원가입
        </Link>
      </div>
    </div>
  );
}
