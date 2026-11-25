import { tr } from '@/lib/i18n/ui';

/** Browser confirm when leaving mid–sermon / devotional workflow. */

export const unsavedSermonWizardMessage = () => tr('unsaved.sermon');

export const unsavedSermonDetailsMessage = () => tr('unsaved.new');

export const unsavedDevotionalPreviewMessage = () => tr('unsaved.preview');

export const unsavedInProgressMessage = () => tr('unsaved.running');

export function confirmLeaveUnsavedWork(message: string): boolean {
  if (typeof window === 'undefined') return true;
  return window.confirm(message);
}
