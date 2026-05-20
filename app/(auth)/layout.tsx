import { AuthLayoutShell } from '@/components/auth/AuthLayoutShell';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthLayoutShell>
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#05070a] px-4 py-12">
        {children}
      </div>
    </AuthLayoutShell>
  );
}
