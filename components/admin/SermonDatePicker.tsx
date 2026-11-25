'use client';

import { format, parse } from 'date-fns';
import { enUS, es, fr } from 'date-fns/locale';
import { useEffect, useId, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';

import { useLanguage } from '@/components/i18n/LanguageProvider';

import 'react-day-picker/style.css';

type Props = {
  id?: string;
  /** yyyy-MM-dd or empty string */
  value: string;
  onChange: (yyyyMmDd: string) => void;
};

export function SermonDatePicker({ id, value, onChange }: Props) {
  const { t, language } = useLanguage();
  const dateLocale = language === 'es' ? es : language === 'fr' ? fr : enUS;
  const autoId = useId();
  const buttonId = id ?? `sermon-date-${autoId}`;
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;
  const displayLabel = value
    ? format(parse(value, 'yyyy-MM-dd', new Date()), 'PP', { locale: dateLocale })
    : t('ns.chooseDate');

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const y = new Date().getFullYear();

  return (
    <div ref={wrapRef} className="relative mt-1">
      <button
        type="button"
        id={buttonId}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className="admin-input mt-0 flex w-full items-center sm:max-w-xs justify-between gap-2 text-left"
      >
        <span className={value ? 'text-[var(--admin-fg-strong)]' : 'text-[var(--admin-dim)]'}>
          {displayLabel}
        </span>
        <span className="text-[var(--admin-dim)]" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={buttonId}
          className="sermon-rdp absolute left-0 top-full z-50 mt-2 rounded-xl p-3"
        >
          <DayPicker
            mode="single"
            locale={dateLocale}
            selected={selected}
            onSelect={(d) => {
              onChange(d ? format(d, 'yyyy-MM-dd') : '');
              setOpen(false);
            }}
            defaultMonth={selected ?? new Date()}
            captionLayout="dropdown"
            fromYear={1990}
            toYear={y + 2}
            className="rounded-lg"
          />
          {value ? (
            <div className="mt-2 border-t border-[rgba(56,189,248,0.12)] pt-2">
              <button
                type="button"
                className="inline-flex min-h-8 items-center text-[13px] font-medium text-[var(--admin-muted)] hover:text-[var(--admin-accent)]"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
              >
                {t('ns.clearDate')}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
