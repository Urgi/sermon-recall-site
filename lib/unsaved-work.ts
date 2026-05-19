/** Browser confirm when leaving mid–sermon / devotional workflow. */

export const UNSAVED_SERMON_WIZARD_MESSAGE =
  'You have not finished adding this sermon. Your generated devotionals and any draft progress will be lost unless you click Add sermon. Leave anyway?';

export const UNSAVED_SERMON_DETAILS_MESSAGE =
  'You have started a new sermon but have not finished. Your work will be lost unless you continue and add the sermon. Leave anyway?';

export const UNSAVED_DEVOTIONAL_PREVIEW_MESSAGE =
  'You have a devotional preview that is not published to the app yet. Leaving will discard it unless you publish. Leave anyway?';

export const UNSAVED_IN_PROGRESS_MESSAGE =
  'Upload, transcription, or generation is still running. Leaving may interrupt the process and you could lose progress. Leave anyway?';

export function confirmLeaveUnsavedWork(message: string): boolean {
  if (typeof window === 'undefined') return true;
  return window.confirm(message);
}
