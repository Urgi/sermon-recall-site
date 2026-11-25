'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { useLanguage } from '@/components/i18n/LanguageProvider';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export type DevotionalForAdmin = {
  id: string;
  day_number: number;
  title: string | null;
  main_content: string | null;
  scripture_reference: string | null;
  scripture_text: string | null;
  reflection_question: string | null;
  estimated_minutes: number;
  pre_prompt: string | null;
};

const EXCERPT_LEN = 240;

type Props = {
  sermonTitle: string;
  devotional: DevotionalForAdmin;
  canEdit: boolean;
};

export function EditableDevotionalPreview({ sermonTitle, devotional, canEdit }: Props) {
  const router = useRouter();
  const { t } = useLanguage();
  const [title, setTitle] = useState(devotional.title ?? '');
  const [scriptureRef, setScriptureRef] = useState(devotional.scripture_reference ?? '');
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(devotional.title ?? '');
    setScriptureRef(devotional.scripture_reference ?? '');
  }, [devotional.id, devotional.title, devotional.scripture_reference]);

  const dirty = useMemo(
    () =>
      title !== (devotional.title ?? '') ||
      scriptureRef !== (devotional.scripture_reference ?? ''),
    [title, scriptureRef, devotional.title, devotional.scripture_reference],
  );

  const headline =
    title.trim() || devotional.title?.trim() || t('dev.dailyDevotional');
  const scrPreview =
    (scriptureRef.trim() || devotional.scripture_reference || '').trim();
  const body = devotional.main_content?.trim() ?? '';
  const excerpt =
    body.length > EXCERPT_LEN && !expanded ? `${body.slice(0, EXCERPT_LEN).trim()}…` : body;

  async function save() {
    setError(null);
    setSaving(true);
    const supabase = createBrowserSupabaseClient();
    const { error: uErr } = await supabase
      .from('devotionals')
      .update({
        title: title.trim() || null,
        scripture_reference: scriptureRef.trim() || null,
      })
      .eq('id', devotional.id);
    setSaving(false);
    if (uErr) {
      setError(t('settings.saveFailed'));
      return;
    }
    router.refresh();
  }

  return (
    <li className="admin-card p-5">
      <div className="grid gap-8 wide:grid-cols-2 wide:items-start">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
            {t('dev.memberPreviewTitle')}
          </p>
          <p className="mt-1 text-[12px] text-[#64748b]">
            {t('dev.approxLayout')}
          </p>

          <div className="mx-auto mt-4 max-w-[360px] rounded-2xl border border-[rgba(56,189,248,0.2)] bg-[#05070a] p-5 shadow-inner">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#38bdf8]">
              {t('dev.day', { n: devotional.day_number })}
            </p>
            <p className="mt-1 text-[13px] text-[#64748b]">{sermonTitle}</p>
            <h3 className="mt-3 text-[19px] font-bold leading-snug text-white">{headline}</h3>

            {devotional.pre_prompt?.trim() ? (
              <div className="mt-4 rounded-lg border border-violet-500/25 bg-violet-950/30 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-200">
                  {t('dev.preSession')}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-[#e2e8f0]">{devotional.pre_prompt}</p>
              </div>
            ) : null}

            <p className="mt-2 text-[12px] text-[#64748b]">{t('dev.minShort', { n: devotional.estimated_minutes })}</p>

            {scrPreview ? (
              <p className="mt-4 text-[14px] font-semibold text-sky-300">{scrPreview}</p>
            ) : null}

            {devotional.scripture_text ? (
              <p className="mt-2 text-[13px] italic leading-relaxed text-[#94a3b8]">
                {devotional.scripture_text}
              </p>
            ) : null}

            {excerpt ? (
              <p className="mt-4 whitespace-pre-wrap text-[14px] leading-relaxed text-[#cbd5e1]">
                {excerpt}
              </p>
            ) : (
              <p className="mt-4 text-[14px] italic text-[#64748b]">{t('dev.noBody')}</p>
            )}

            {body.length > EXCERPT_LEN ? (
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="mt-2 text-[13px] font-medium text-[#38bdf8] hover:underline"
              >
                {expanded ? t('dev.showLess') : t('dev.showFull')}
              </button>
            ) : null}

            {devotional.reflection_question ? (
              <div className="mt-5 border-t border-[rgba(56,189,248,0.12)] pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
                  {t('dev.reflectionLabel')}
                </p>
                <p className="mt-1 text-[14px] leading-relaxed text-[#e2e8f0]">
                  {devotional.reflection_question}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
            {canEdit ? t('dev.editLabels') : t('dev.labelsReadOnly')}
          </p>
          {canEdit ? (
            <>
              <div>
                <label
                  htmlFor={`dv-title-${devotional.id}`}
                  className="block text-[13px] font-medium text-[#94a3b8]"
                >
                  {t('dev.dayTitle')}
                </label>
                <p className="mt-0.5 text-[12px] text-[#64748b]">
                  {t('dev.dayTitleHint')}
                </p>
                <input
                  id={`dv-title-${devotional.id}`}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="admin-input mt-2"
                  placeholder={t('dev.dayTitlePlaceholder')}
                  autoComplete="off"
                />
              </div>
              <div>
                <label
                  htmlFor={`dv-scr-${devotional.id}`}
                  className="admin-label"
                >
                  {t('dev.scriptureLine')}
                </label>
                <p className="admin-hint mt-0.5 text-[12px]">
                  {t('dev.scriptureLineHint')}
                </p>
                <input
                  id={`dv-scr-${devotional.id}`}
                  type="text"
                  value={scriptureRef}
                  onChange={(e) => setScriptureRef(e.target.value)}
                  className="admin-input mt-2"
                  placeholder={t('dev.scripturePlaceholder')}
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  disabled={!dirty || saving}
                  onClick={() => void save()}
                  className="admin-btn-primary"
                >
                  {saving ? t('common.saving') : t('dev.saveChanges')}
                </button>
                <button
                  type="button"
                  disabled={!dirty || saving}
                  onClick={() => {
                    setTitle(devotional.title ?? '');
                    setScriptureRef(devotional.scripture_reference ?? '');
                  }}
                  className="admin-btn-secondary"
                >
                  {t('dev.reset')}
                </button>
              </div>
              {error ? (
                <p className="text-[13px] text-red-500" role="alert">
                  {error}
                </p>
              ) : null}
            </>
          ) : (
            <div className="admin-card-nested p-4 text-[14px] text-admin-muted">
              <p>
                <span className="text-[#64748b]">{t('dev.titleLabel')}</span>
                {devotional.title?.trim() || '—'}
              </p>
              <p className="mt-2">
                <span className="text-[#64748b]">{t('dev.scriptureLabel')}</span>
                {devotional.scripture_reference?.trim() || '—'}
              </p>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
