'use client';

import { useMemo } from 'react';

import type { StaffRole } from '@/lib/auth/permissions';
import { ROLE_LABELS } from '@/lib/team/role-guide';
import {
  buildPermissionMatrix,
  MATRIX_ROLES,
  type PermissionMatrixRow,
} from '@/lib/team/permission-matrix';

type Props = {
  /** Highlight the signed-in user’s role column */
  highlightRole?: StaffRole | string | null;
};

function CheckIcon() {
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center" aria-hidden>
      <svg
        className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.42 0l-3.25-3.25a1 1 0 111.42-1.42l2.54 2.54 6.54-6.54a1 1 0 011.42 0z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}

function DeniedCell() {
  return (
    <span
      className="inline-flex h-6 w-6 items-center justify-center text-[15px] font-light text-admin-dim/50"
      aria-hidden
    >
      —
    </span>
  );
}

export function TeamPermissionsMatrix({ highlightRole }: Props) {
  const { rows, cells } = useMemo(() => buildPermissionMatrix(), []);
  const highlight = highlightRole as StaffRole | null;

  return (
    <section className="admin-card overflow-hidden">
      <div className="border-b border-admin px-4 py-4 sm:px-6">
        <h2 className="admin-section-title">Role permissions matrix</h2>
        <p className="admin-hint mt-1 max-w-2xl">
          Checkmarks reflect the same rules enforced by the server on every action. Hover a
          permission name for details.
        </p>
        {highlight && MATRIX_ROLES.includes(highlight) ? (
          <p className="mt-2 text-[12px] font-medium text-admin-accent">
            Your role: {ROLE_LABELS[highlight]}
          </p>
        ) : null}
      </div>

      <div className="permissions-matrix-scroll relative overflow-x-auto">
        <table className="permissions-matrix w-full min-w-[720px] border-collapse text-[13px]">
          <thead>
            <tr>
              <th
                scope="col"
                className="permissions-matrix-sticky-col permissions-matrix-sticky-head z-20 min-w-[10.5rem] border-b border-r border-admin bg-admin-card px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-admin-dim"
              >
                Permission
              </th>
              {MATRIX_ROLES.map((role) => {
                const isYou = highlight === role;
                return (
                  <th
                    key={role}
                    scope="col"
                    className={`permissions-matrix-sticky-head z-10 min-w-[5.5rem] border-b border-admin px-2 py-3 text-center text-[11px] font-semibold leading-tight ${
                      isYou
                        ? 'bg-sky-500/12 text-admin-accent ring-1 ring-inset ring-sky-500/35'
                        : 'bg-admin-surface text-admin-muted'
                    }`}
                  >
                    <span className="block px-1">{ROLE_LABELS[role]}</span>
                    {isYou ? (
                      <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                        You
                      </span>
                    ) : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <MatrixRowCells
                key={row.id}
                row={row}
                rowIdx={rowIdx}
                allowed={cells[rowIdx]}
                highlightRole={highlight}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-4 border-t border-admin px-4 py-3 text-[11px] text-admin-dim sm:px-6">
        <span className="inline-flex items-center gap-1.5">
          <CheckIcon /> Allowed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <DeniedCell /> Not allowed
        </span>
      </div>
    </section>
  );
}

function MatrixRowCells({
  row,
  rowIdx,
  allowed,
  highlightRole,
}: {
  row: PermissionMatrixRow;
  rowIdx: number;
  allowed: boolean[];
  highlightRole: StaffRole | null;
}) {
  const zebra = rowIdx % 2 === 1;

  return (
    <tr className={zebra ? 'bg-admin-surface/40' : ''}>
      <th
        scope="row"
        className="permissions-matrix-sticky-col z-10 border-b border-r border-admin bg-admin-card px-4 py-2.5 text-left font-medium text-admin-fg-secondary"
        title={row.tooltip}
      >
        <span className="border-b border-dotted border-admin-muted/60 cursor-help">
          {row.label}
        </span>
      </th>
      {MATRIX_ROLES.map((role, colIdx) => {
        const isYou = highlightRole === role;
        const yes = allowed[colIdx];
        return (
          <td
            key={role}
            className={`border-b border-admin px-2 py-2.5 text-center ${
              isYou ? 'bg-sky-500/8 ring-1 ring-inset ring-sky-500/20' : ''
            }`}
          >
            <span className="sr-only">
              {ROLE_LABELS[role]}: {row.label} — {yes ? 'allowed' : 'not allowed'}
            </span>
            {yes ? <CheckIcon /> : <DeniedCell />}
          </td>
        );
      })}
    </tr>
  );
}
