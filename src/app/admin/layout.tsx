'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import AdminGuard from './_componts/AdminGuard'; // ✅ 폴더명이 _componts 라서 이게 정답
import AdminHeaderUnread from '../components/AdminHeaderUnread'; // ✅ src/app/components

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={[
        'px-3 py-2 rounded-xl text-sm font-semibold transition',
        active ? 'bg-white text-purple-700' : 'bg-white/10 text-white hover:bg-white/15',
      ].join(' ')}
    >
      {label}
    </Link>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#B982FF]">
        <div className="sticky top-0 z-40">
          <div className="mx-auto max-w-[980px] px-4 pt-4">
            <div className="rounded-3xl bg-white/10 border border-white/15 backdrop-blur-xl p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="text-white font-extrabold tracking-wide">UPLOG ADMIN</div>
                  <span className="text-white/70 text-xs">관리 콘솔</span>
                </div>

                <AdminHeaderUnread />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <NavItem href="/admin" label="대시보드" />
                <NavItem href="/admin/support" label="문의 관리" />
                <NavItem href="/admin/users" label="회원 관리" />
                <NavItem href="/home" label="홈으로" />
              </div>
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-[980px] px-4 py-6">{children}</main>
      </div>
    </AdminGuard>
  );
}
