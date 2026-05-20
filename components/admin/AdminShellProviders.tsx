'use client';

import { ThemeProvider } from '@/components/admin/ThemeProvider';

export function AdminShellProviders({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
