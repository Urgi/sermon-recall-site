/** Re-mounts on every admin navigation so each page fades in (no-op under reduced motion). */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <div className="admin-page-enter">{children}</div>;
}
