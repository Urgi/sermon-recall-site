'use client';

import { useMemo } from 'react';

import { normalizeChurchCode } from '@/lib/church/member-join';

type Props = {
  churchName: string;
  churchCode: string;
  qrDataUrl: string;
};

export function ChurchMemberQrInline({ churchName, churchCode, qrDataUrl }: Props) {
  const code = normalizeChurchCode(churchCode);
  const downloadName = useMemo(
    () => `sermon-recall-${code.replace(/[^a-zA-Z0-9_-]/g, '_')}-qr.png`,
    [code],
  );

  function downloadPng() {
    const anchor = document.createElement('a');
    anchor.href = qrDataUrl;
    anchor.download = downloadName;
    anchor.click();
  }

  return (
    <div className="flex shrink-0 flex-col items-center text-center sm:items-end sm:text-right">
      <h3 className="admin-hint text-sm font-semibold uppercase tracking-wide">
        Member QR Code
      </h3>
      <div className="mt-2 rounded-lg border border-admin bg-white p-2 dark:bg-[#f8fafc]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt={`QR code to join ${churchName}`}
          width={120}
          height={120}
          className="block h-[120px] w-[120px]"
        />
      </div>
      <button
        type="button"
        onClick={downloadPng}
        className="mt-2 text-[14px] font-medium text-admin-link hover:underline"
      >
        download
      </button>
    </div>
  );
}
