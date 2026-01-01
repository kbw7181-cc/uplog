// ✅✅✅ 전체복붙: src/app/admin/layout.tsx
import type { ReactNode } from 'react';
import AdminGuard from './_componts/AdminGuard';
import styles from './admin.module.css';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <div className={styles.page}>
        <main>{children}</main>
      </div>
    </AdminGuard>
  );
}
