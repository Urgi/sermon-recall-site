'use client';

import { AdminNavProvider } from '@/components/admin/AdminNavContext';
import { ThemeProvider } from '@/components/admin/ThemeProvider';

export function AdminShellProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AdminNavProvider>{children}</AdminNavProvider>
    </ThemeProvider>
  );
}
