export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-theme="dark"
      className="flex min-h-screen flex-col items-center justify-center bg-[#05070a] px-4 py-8 sm:py-12"
    >
      {children}
    </div>
  );
}
