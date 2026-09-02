import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@/lib/public-site/config';

type Props = {
  className?: string;
  /** Compact for footer / support; default is homepage-sized. */
  size?: 'default' | 'compact';
};

export function MemberAppStoreLinks({ className = '', size = 'default' }: Props) {
  const linkClass =
    size === 'compact'
      ? 'inline-flex items-center rounded-lg border border-[rgba(56,189,248,0.35)] bg-[#0a0f18] px-3 py-2 text-[13px] font-semibold text-[#38bdf8] hover:bg-[#0f172a]'
      : 'inline-flex items-center justify-center rounded-lg border border-[rgba(56,189,248,0.35)] bg-[#0a0f18] px-4 py-2.5 text-[14px] font-semibold text-[#38bdf8] hover:bg-[#0f172a]';

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`.trim()}>
      <a
        href={GOOGLE_PLAY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        Get it on Google Play
      </a>
      {APP_STORE_URL ? (
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          Download on the App Store
        </a>
      ) : (
        <span
          className={
            size === 'compact'
              ? 'text-[13px] text-[#64748b]'
              : 'text-[14px] text-[#64748b]'
          }
        >
          iPhone coming soon
        </span>
      )}
    </div>
  );
}
