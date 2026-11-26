'use client';

import { QrCode } from 'lucide-react';

import { DashboardShareCard } from '@/components/admin/DashboardShareCard';
import { AccordionRow } from '@/components/admin/ui/AccordionRow';
import { useLanguage } from '@/components/i18n/LanguageProvider';

type Props = {
  churchName: string;
  churchCode: string | null;
  joinUrl: string | null;
  qrDataUrl: string | null;
};

/** Invite card (code, QR, email) folded below the roster on the Members page. */
export function MembersInviteAccordion({ churchName, churchCode, joinUrl, qrDataUrl }: Props) {
  const { t } = useLanguage();
  const ready = Boolean(churchCode && joinUrl && qrDataUrl);
  return (
    <AccordionRow
      id="invite"
      title={t('members.inviteHeading')}
      icon={QrCode}
      summary={ready ? t('dash.summaryInvite', { code: churchCode ?? '' }) : t('members.noCode')}
    >
      {ready ? (
        <DashboardShareCard
          churchName={churchName}
          churchCode={churchCode as string}
          joinUrl={joinUrl as string}
          qrDataUrl={qrDataUrl as string}
          headingKey="members.inviteHeading"
          hintKey="members.inviteHint"
          size="lg"
          bare
        />
      ) : (
        <p className="admin-body p-5">{t('members.noCode')}</p>
      )}
    </AccordionRow>
  );
}
