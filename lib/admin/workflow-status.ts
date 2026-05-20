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

export function workflowStatusLabel(status: SermonWorkflowStatus): string {
  return status.replace(/_/g, ' ');
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

export function canSubmitForApproval(status: SermonWorkflowStatus): boolean {
  return ['draft', 'generated', 'changes_requested'].includes(status);
}

export function canPublishWorkflow(status: SermonWorkflowStatus): boolean {
  return status === 'approved';
}
