import type { HTMLAttributes, ReactNode } from 'react';

type Props = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'section' | 'article' | 'aside';
  /** `inner` is the 12px nested card; default is the 20px frosted outer panel. */
  variant?: 'panel' | 'inner';
  padded?: boolean;
  children: ReactNode;
};

/**
 * Frosted surface: translucent fill, 1px light border, backdrop blur.
 * Falls back to a solid panel where backdrop-filter is unsupported (see globals.css).
 */
export function GlassPanel({
  as: Tag = 'div',
  variant = 'panel',
  padded = true,
  className = '',
  children,
  ...rest
}: Props) {
  const base = variant === 'inner' ? 'glass-inner' : 'glass-panel';
  const pad = padded ? (variant === 'inner' ? 'p-4' : 'p-5 sm:p-6') : '';
  return (
    <Tag className={`${base} ${pad} ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}

export function PanelHeader({
  title,
  hint,
  action,
  id,
}: {
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className="text-[15px] font-semibold text-[var(--admin-fg-strong)]">
          {title}
        </h2>
        {hint ? <p className="mt-1 text-[13px] leading-snug text-[var(--admin-muted)]">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}
