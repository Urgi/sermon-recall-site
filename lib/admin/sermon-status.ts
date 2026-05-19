/** Theme-aware status pill classes (see globals.css `.admin-badge--*`). */
export function sermonStatusBadgeClass(status: string): string {
  switch (status) {
    case 'ready':
      return 'admin-badge admin-badge--ready';
    case 'failed':
      return 'admin-badge admin-badge--failed';
    default:
      return 'admin-badge admin-badge--processing';
  }
}
