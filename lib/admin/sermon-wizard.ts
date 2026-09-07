export const SERMON_WIZARD_STEPS = ['details', 'source', 'review'] as const;

export type SermonWizardStep = (typeof SERMON_WIZARD_STEPS)[number];

export const SERMON_WIZARD_STEP_COUNT = SERMON_WIZARD_STEPS.length;

export function sermonWizardStepIndex(step: SermonWizardStep): number {
  return SERMON_WIZARD_STEPS.indexOf(step);
}

export function pastorDisplayName(name: string | null | undefined): string {
  const t = name?.trim();
  return t || 'your pastor';
}

function localYmd(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** First calendar day members can open Day 1 after this sermon is live. */
export function firstDevotionalAvailableYmd(
  sermonDate: string | null | undefined,
  now = new Date(),
): string {
  const today = localYmd(now);
  const trimmed = sermonDate?.trim() ?? '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed) && trimmed >= today) return trimmed;
  return today;
}

/** Display as Sep 7, 2026. */
export function formatShortDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function firstDevotionalAvailableLabel(
  sermonDate: string | null | undefined,
  now = new Date(),
): string {
  return formatShortDate(firstDevotionalAvailableYmd(sermonDate, now));
}

export function sermonWizardCopy(
  step: SermonWizardStep,
  opts?: { canApprove?: boolean; pastorName?: string | null },
): { title: string; hint: string } {
  const pastor = pastorDisplayName(opts?.pastorName);
  switch (step) {
    case 'details':
      return {
        title: 'Sermon details',
        hint: 'Name this sermon so your church can find it this week.',
      };
    case 'source':
      return {
        title: 'Add the sermon',
        hint: 'We’ll draft six-day devotionals from this. Nothing is live yet.',
      };
    case 'review':
      return opts?.canApprove
        ? {
            title: 'Review devotionals',
            hint: 'Edit anything that needs a pastor’s voice, then approve when you’re ready.',
          }
        : {
            title: 'Review devotionals',
            hint: `When this looks right, send it to ${pastor} for approval. Members won’t see it until then.`,
          };
  }
}
