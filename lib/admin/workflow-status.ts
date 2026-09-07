export type SermonWorkflowStatus =
  | 'draft'
  | 'generated'
  | 'submitted_for_approval'
  | 'changes_requested'
  | 'approved'
  | 'published'
  | 'archived';

export type NotificationStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'cancelled';

export type AudienceType = 'all_members' | 'pastors_only';

export type SermonIngestStatus = 'processing' | 'ready' | 'failed';

export type TranscriptStatus = 'idle' | 'queued' | 'processing' | 'completed' | 'failed';

/** Pastor-facing sermon lifecycle — not the raw workflow enum. */
export type PastorLifecycle =
  | 'processing'
  | 'failed'
  | 'review_needed'
  | 'ready_to_publish'
  | 'published'
  | 'draft'
  | 'archived';

export function pastorLifecycle(opts: {
  workflow: SermonWorkflowStatus;
  ingestStatus?: string | null;
  transcriptStatus?: string | null;
}): PastorLifecycle {
  const ingest = opts.ingestStatus ?? '';
  const transcript = opts.transcriptStatus ?? '';
  if (opts.workflow === 'archived') return 'archived';
  if (ingest === 'failed' || transcript === 'failed') return 'failed';
  if (opts.workflow === 'published') return 'published';
  if (opts.workflow === 'approved') return 'ready_to_publish';
  if (
    opts.workflow === 'generated' ||
    opts.workflow === 'submitted_for_approval' ||
    opts.workflow === 'changes_requested'
  ) {
    return 'review_needed';
  }
  if (ingest === 'processing' || transcript === 'queued' || transcript === 'processing') {
    return 'processing';
  }
  return 'draft';
}

export function pastorLifecycleLabel(life: PastorLifecycle): string {
  switch (life) {
    case 'processing':
      return 'Processing';
    case 'failed':
      return 'Failed';
    case 'review_needed':
      return 'Review needed';
    case 'ready_to_publish':
      return 'Ready to publish';
    case 'published':
      return 'Published';
    case 'archived':
      return 'Archived';
    default:
      return 'Draft';
  }
}

export function pastorLifecycleBadgeClass(life: PastorLifecycle): string {
  switch (life) {
    case 'published':
      return workflowStatusBadgeClass('published');
    case 'ready_to_publish':
      return workflowStatusBadgeClass('approved');
    case 'review_needed':
      return workflowStatusBadgeClass('submitted_for_approval');
    case 'processing':
      return workflowStatusBadgeClass('generated');
    case 'failed':
    case 'archived':
      return workflowStatusBadgeClass('archived');
    default:
      return workflowStatusBadgeClass('draft');
  }
}

export function workflowStatusLabel(status: SermonWorkflowStatus): string {
  return pastorLifecycleLabel(pastorLifecycle({ workflow: status }));
}

export function workflowStatusBadgeClass(status: SermonWorkflowStatus): string {
  switch (status) {
    case 'published':
      return 'admin-badge admin-badge--ready';
    case 'approved':
      return 'admin-badge admin-badge--approved';
    case 'submitted_for_approval':
      return 'admin-badge admin-badge--submitted';
    case 'changes_requested':
      return 'admin-badge admin-badge--changes';
    case 'archived':
      return 'admin-badge admin-badge--failed';
    case 'generated':
      return 'admin-badge admin-badge--generated';
    default:
      return 'admin-badge admin-badge--processing';
  }
}

export function canRegenerateWorkflow(status: SermonWorkflowStatus): boolean {
  return !['submitted_for_approval', 'approved', 'published', 'archived'].includes(status);
}

/** Neutral copy when preview generation is locked by workflow (not a user error). */
export function devotionalPreviewLockedHint(status: SermonWorkflowStatus): string {
  switch (status) {
    case 'submitted_for_approval':
      return 'This sermon is in review. The six-day preview is locked until approval finishes or changes are requested.';
    case 'approved':
      return 'This sermon is approved and ready to publish. The preview is locked until you publish or return it to draft.';
    case 'published':
      return 'This sermon is live in the app. The preview is locked while published.';
    case 'archived':
      return 'This sermon is archived. Restore it to draft to generate a new preview.';
    default:
      return 'The six-day preview is locked in the current workflow state.';
  }
}

export function canSubmitForApproval(status: SermonWorkflowStatus): boolean {
  return ['draft', 'generated', 'changes_requested'].includes(status);
}

export function canPublishWorkflow(status: SermonWorkflowStatus): boolean {
  return status === 'approved';
}
