export function AdminPageFallback() {
  return (
    <div className="mx-auto max-w-6xl space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-40 rounded-md bg-[var(--admin-border)]" />
      <div className="h-4 w-64 rounded-md bg-[var(--admin-border)]" />
      <div className="admin-card h-52 animate-pulse" />
    </div>
  );
}
