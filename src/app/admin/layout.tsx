// ✅ 파일: src/app/admin/layout.tsx
import type { ReactNode } from 'react';
import AdminGuard from './_componts/AdminGuard';
import AdminHeaderUnread from '../components/AdminHeaderUnread';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        <AdminHeaderUnread />
        {children}
      </div>
    </AdminGuard>
  );
}
