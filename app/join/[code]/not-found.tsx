import Link from 'next/link';

export default function JoinNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#05070a] px-4 text-center text-[#e2e8f0]">
      <h1 className="text-xl font-bold text-white">Church code not found</h1>
      <p className="mt-2 max-w-sm text-[15px] text-[#94a3b8]">
        Double-check the code with your pastor. Codes look like GRACE001.
      </p>
      <Link href="/login" className="mt-6 text-[#38bdf8] hover:underline">
        Pastor admin sign in
      </Link>
    </div>
  );
}
