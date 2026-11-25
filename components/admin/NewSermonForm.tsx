'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { TranscriptionJobPoller } from '@/components/admin/TranscriptionJobPoller';
import { TranscribeProgressPanel } from '@/components/admin/TranscribeProgressPanel';
import { SermonDatePicker } from '@/components/admin/SermonDatePicker';
import { SermonWizardProgress } from '@/components/admin/SermonWizardProgress';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import {
  CAPTION_ACCEPT,
  CAPTION_MAX_MB,
  isCaptionFile,
  readCaptionFile,
} from '@/lib/transcription/captions';
import { PDF_MAX_CHARS, PDF_MAX_MB } from '@/lib/transcription/pdf-limits';
import { languageOptionLabel, normalizeAppLanguage } from '@/lib/i18n/languages';
import { localizeApiError } from '@/lib/i18n/api-errors';
import { sermonWizardCopy } from '@/lib/admin/sermon-wizard';
import {
  extractYouTubeUrl,
  parseYouTubeUrl,
} from '@/lib/transcription/constants';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { UiKey } from '@/lib/i18n/ui';
import type { TranscribePhase } from '@/lib/transcribe-progress-estimate';

type Props = {
  churchId: string;
  sermonLanguage?: string | null;
  defaultPastorName?: string | null;
};

type InputKind = 'youtube' | 'file' | 'text' | 'pdf';
type NewSermonStep = 'details' | 'source';

type VideoMeta = {
  title: string;
  authorName: string | null;
  thumbnailUrl: string | null;
};

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'upload';
}

export function NewSermonForm({ churchId, sermonLanguage, defaultPastorName }: Props) {
  const router = useRouter();
  const { t: tr } = useLanguage();
  const languageLabel = languageOptionLabel(normalizeAppLanguage(sermonLanguage));
  const [wizardStep, setWizardStep] = useState<NewSermonStep>('details');
  const [inputKind, setInputKind] = useState<InputKind>('text');
  const [title, setTitle] = useState('');
  const [pastorName, setPastorName] = useState(defaultPastorName?.trim() ?? '');
  const [sermonDate, setSermonDate] = useState('');
  const [scriptOrNotes, setScriptOrNotes] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [fileOver, setFileOver] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState('');
  const [pdfNote, setPdfNote] = useState<string | null>(null);
  const [pdfReading, setPdfReading] = useState(false);
  /** Caption files (.srt/.vtt/.sbv) in Upload mode become editable text, like PDFs. */
  const [captionText, setCaptionText] = useState('');
  const [captionNote, setCaptionNote] = useState<string | null>(null);
  const [captionReading, setCaptionReading] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [ownsRecording, setOwnsRecording] = useState(false);
  const [videoMeta, setVideoMeta] = useState<VideoMeta | null>(null);
  const [queuedJobId, setQueuedJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [mediaProgress, setMediaProgress] = useState<{
    phase: TranscribePhase;
    phaseStartedAt: number;
    bytes: number;
  } | null>(null);

  const copy = sermonWizardCopy(wizardStep);

  useEffect(() => {
    if (wizardStep !== 'source' || inputKind !== 'youtube') return;
    const normalized = parseYouTubeUrl(youtubeUrl);
    if (!normalized) {
      setVideoMeta(null);
      return;
    }

    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/youtube/metadata?url=${encodeURIComponent(normalized)}`, {
            credentials: 'include',
            signal: ac.signal,
          });
          const json = (await res.json()) as {
            title?: string;
            authorName?: string | null;
            thumbnailUrl?: string | null;
          };
          if (!res.ok || !json.title) {
            setVideoMeta(null);
            return;
          }
          setVideoMeta({
            title: json.title,
            authorName: json.authorName ?? null,
            thumbnailUrl: json.thumbnailUrl ?? null,
          });
          setTitle((current) => (current.trim() ? current : json.title ?? current));
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          setVideoMeta(null);
        }
      })();
    }, 400);

    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [youtubeUrl, inputKind, wizardStep]);

  function onModeChange(next: InputKind) {
    setInputKind(next);
    setError(null);
    setMediaProgress(null);
    setQueuedJobId(null);
    setPdfFile(null);
    setPdfText('');
    setPdfNote(null);
    setCaptionText('');
    setCaptionNote(null);
    if (next === 'text') {
      setMediaFile(null);
      setYoutubeUrl('');
      setVideoMeta(null);
      setOwnsRecording(false);
    }
    if (next === 'file' || next === 'pdf') {
      setScriptOrNotes('');
      if (next === 'pdf') setMediaFile(null);
      setYoutubeUrl('');
      setVideoMeta(null);
      setOwnsRecording(false);
    }
    if (next === 'youtube') {
      setScriptOrNotes('');
      setMediaFile(null);
    }
  }

  /** Upload mode: caption files are read here in the browser; other files wait for submit. */
  async function onMediaPicked(f: File | null) {
    setMediaFile(f);
    setError(null);
    setCaptionText('');
    setCaptionNote(null);
    if (!f || !isCaptionFile(f)) return;
    setCaptionReading(true);
    try {
      const result = await readCaptionFile(f);
      if (!result.ok) {
        setError(tr(`cap.err.${result.code}` as UiKey, { mb: CAPTION_MAX_MB }));
        return;
      }
      setCaptionText(result.text);
      setCaptionNote(
        result.truncated ? tr('cap.truncated', { chars: PDF_MAX_CHARS.toLocaleString() }) : null,
      );
    } catch {
      setError(tr('cap.err.read'));
    } finally {
      setCaptionReading(false);
    }
  }

  async function onPdfPicked(f: File | null) {
    setError(null);
    setPdfNote(null);
    setPdfText('');
    setPdfFile(f);
    if (!f) return;
    if (f.size > PDF_MAX_MB * 1024 * 1024) {
      setError(tr('pdf.err.too_large', { mb: PDF_MAX_MB }));
      return;
    }
    setPdfReading(true);
    try {
      const body = new FormData();
      body.append('file', f);
      const res = await fetch('/api/sermons/extract-pdf', {
        method: 'POST',
        credentials: 'include',
        body,
      });
      const json = (await res.json().catch(() => ({}))) as {
        code?: string;
        error?: string;
        text?: string;
        pages?: number;
        truncated?: boolean;
      };
      if (!res.ok || !json.text) {
        const known = ['not_pdf', 'too_large', 'empty_file', 'password', 'corrupt', 'no_text', 'rate_limit'];
        setError(
          known.includes(json.code ?? '')
            ? tr(`pdf.err.${json.code}` as UiKey, { mb: PDF_MAX_MB })
            : res.status === 401 || res.status === 403
              ? (json.error ?? tr('pdf.err.generic'))
              : tr('pdf.err.generic'),
        );
        return;
      }
      setPdfText(json.text);
      setPdfNote(
        [
          json.pages ? (json.pages === 1 ? tr('pdf.page1') : tr('pdf.pages', { pages: json.pages })) : '',
          json.truncated ? tr('pdf.truncated', { chars: PDF_MAX_CHARS.toLocaleString() }) : '',
        ]
          .filter(Boolean)
          .join(' '),
      );
    } catch {
      setError(tr('pdf.err.generic'));
    } finally {
      setPdfReading(false);
    }
  }

  function applyYoutubePaste(raw: string) {
    const extracted = extractYouTubeUrl(raw);
    setYoutubeUrl(extracted ?? raw.trim());
    setError(null);
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setError(tr('ns.err.clipEmpty'));
        return;
      }
      applyYoutubePaste(text);
    } catch {
      setError(tr('ns.err.clipRead'));
    }
  }

  function goToSource() {
    setError(null);
    if (!title.trim()) {
      setError(tr('ns.err.title'));
      return;
    }
    setWizardStep('source');
  }

  function onWizardBack() {
    if (wizardStep === 'source') {
      setError(null);
      setWizardStep('details');
      return;
    }
    router.push('/sermons');
  }

  async function queueTranscription(
    sermonId: string,
    payload: { sourceType: 'storage'; storagePath: string } | { sourceType: 'youtube'; youtubeUrl: string },
  ): Promise<string | null> {
    const res = await fetch('/api/transcription/jobs', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sermonId, ...payload }),
    });
    const json = (await res.json()) as { error?: string; jobId?: string };
    if (!res.ok) {
      setError(json.error ? localizeApiError(json.error) : tr('ns.err.queue'));
      return null;
    }
    return json.jobId ?? null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (wizardStep !== 'source') return;
    setError(null);
    setQueuedJobId(null);

    const t = title.trim();
    if (!t) {
      setError(tr('ns.err.title'));
      setWizardStep('details');
      return;
    }

    const supabase = createBrowserSupabaseClient();
    setPending(true);

    try {
      const captionUpload = inputKind === 'file' && mediaFile !== null && isCaptionFile(mediaFile);
      if (inputKind === 'text' || inputKind === 'pdf' || captionUpload) {
        // Pasted text, PDF text and caption text all go straight in: no transcription job.
        const notes = (
          inputKind === 'pdf' ? pdfText : captionUpload ? captionText : scriptOrNotes
        ).trim();
        if (!notes) {
          setError(
            inputKind === 'pdf'
              ? tr('pdf.err.generic')
              : captionUpload
                ? tr('cap.err.no_text')
                : tr('ns.err.paste'),
          );
          return;
        }

        const { data, error: insertError } = await supabase
          .from('sermons')
          .insert({
            church_id: churchId,
            title: t,
            pastor_name: pastorName.trim() || null,
            sermon_date: sermonDate || null,
            transcript: notes,
            status: 'processing' as const,
            transcript_status: 'completed',
          })
          .select('id')
          .single();

        if (insertError) {
          setError(tr('ns.err.create'));
          return;
        }
        if (data?.id) {
          router.push(`/sermons/${data.id}`);
          router.refresh();
        }
        return;
      }

      if (inputKind === 'youtube') {
        const normalized = parseYouTubeUrl(youtubeUrl);
        if (!normalized) {
          setError(tr('ns.err.youtube'));
          return;
        }
        if (!ownsRecording) {
          setError(tr('ns.err.rights'));
          return;
        }

        const { data: created, error: insertError } = await supabase
          .from('sermons')
          .insert({
            church_id: churchId,
            title: t,
            pastor_name: pastorName.trim() || null,
            sermon_date: sermonDate || null,
            transcript: null,
            status: 'processing' as const,
            transcript_status: 'queued',
            source_url: normalized,
          })
          .select('id')
          .single();

        if (insertError || !created?.id) {
          setError(tr('ns.err.create'));
          return;
        }

        const jobId = await queueTranscription(created.id, {
          sourceType: 'youtube',
          youtubeUrl: normalized,
        });
        if (!jobId) {
          await supabase.from('sermons').delete().eq('id', created.id);
          return;
        }
        setQueuedJobId(jobId);
        router.push(`/sermons/${created.id}`);
        return;
      }

      if (!mediaFile) {
        setError(tr('ns.err.fileType'));
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError(tr('ns.err.signedOut'));
        return;
      }

      const isPlainText =
        mediaFile.type.startsWith('text/') || mediaFile.name.toLowerCase().endsWith('.txt');

      if (isPlainText) {
        const text = (await mediaFile.text()).trim();
        if (!text) {
          setError(tr('ns.err.emptyText'));
          return;
        }

        const { data, error: insertError } = await supabase
          .from('sermons')
          .insert({
            church_id: churchId,
            title: t,
            pastor_name: pastorName.trim() || null,
            sermon_date: sermonDate || null,
            transcript: text,
            status: 'processing' as const,
            transcript_status: 'completed',
          })
          .select('id')
          .single();

        if (insertError) {
          setError(tr('ns.err.create'));
          return;
        }
        if (data?.id) {
          router.push(`/sermons/${data.id}`);
          router.refresh();
        }
        return;
      }

      const { data: created, error: insertError } = await supabase
        .from('sermons')
        .insert({
          church_id: churchId,
          title: t,
          pastor_name: pastorName.trim() || null,
          sermon_date: sermonDate || null,
          transcript: null,
          status: 'processing' as const,
          transcript_status: 'queued',
        })
        .select('id')
        .single();

      if (insertError || !created?.id) {
        setError(tr('ns.err.create'));
        return;
      }
      const sermonId = created.id;

      setMediaProgress({
        phase: 'upload',
        phaseStartedAt: Date.now(),
        bytes: mediaFile.size,
      });

      const path = `${user.id}/${sermonId}/${Date.now()}-${safeFileName(mediaFile.name)}`;
      const { error: upStorage } = await supabase.storage.from('sermon-media').upload(path, mediaFile, {
        upsert: false,
        contentType: mediaFile.type || undefined,
      });
      if (upStorage) {
        setError(tr('ns.err.queue'));
        return;
      }

      setMediaProgress({
        phase: 'transcribe',
        phaseStartedAt: Date.now(),
        bytes: mediaFile.size,
      });

      const jobId = await queueTranscription(sermonId, {
        sourceType: 'storage',
        storagePath: path,
      });
      if (!jobId) return;
      setQueuedJobId(jobId);
      router.push(`/sermons/${sermonId}`);
    } catch {
      setError(tr('common.error'));
    } finally {
      setMediaProgress(null);
      setPending(false);
    }
  }

  function fileNeedsTranscribe(f: File) {
    if (isCaptionFile(f)) return false;
    if (f.name.toLowerCase().endsWith('.txt')) return false;
    if (f.type.startsWith('text/')) return false;
    return true;
  }

  const submitLabel =
    pending && inputKind === 'file' && mediaFile && fileNeedsTranscribe(mediaFile)
      ? tr('ns.uploading')
      : pending && inputKind === 'youtube'
        ? tr('ns.queuing')
        : pending
          ? tr('common.saving')
          : tr('ns.submit');

  const sourceModes: { id: InputKind; label: string }[] = [
    { id: 'text', label: tr('ns.modePaste') },
    { id: 'file', label: tr('ns.modeUpload') },
    { id: 'pdf', label: tr('pdf.mode') },
  ];

  const sourceReady =
    inputKind === 'youtube'
      ? Boolean(ownsRecording && parseYouTubeUrl(youtubeUrl))
      : inputKind === 'file'
        ? mediaFile !== null && isCaptionFile(mediaFile)
          ? Boolean(captionText.trim()) && !captionReading
          : Boolean(mediaFile)
        : inputKind === 'pdf'
          ? Boolean(pdfText.trim()) && !pdfReading
          : Boolean(scriptOrNotes.trim());

  return (
    <div className="mx-auto max-w-md space-y-6">
      <SermonWizardProgress
        step={wizardStep}
        title={copy.title}
        hint={copy.hint}
        onBack={onWizardBack}
      />

      {wizardStep === 'details' ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="sermon-title" className="admin-label">
              {tr('ns.title')} <span className="text-red-500">*</span>
            </label>
            <input
              id="sermon-title"
              name="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  goToSource();
                }
              }}
              className="admin-input mt-1"
            />
          </div>
          <div>
            <label htmlFor="sermon-pastor" className="admin-label">
              {tr('ns.pastor')}
            </label>
            <input
              id="sermon-pastor"
              name="pastorName"
              type="text"
              value={pastorName}
              onChange={(e) => setPastorName(e.target.value)}
              className="admin-input mt-1"
            />
          </div>
          <div>
            <span className="admin-label">{tr('ns.date')}</span>
            <p className="admin-hint mt-1">{tr('ns.dateHint')}</p>
            <SermonDatePicker id="sermon-date" value={sermonDate} onChange={setSermonDate} />
          </div>
          {error ? (
            <p className="text-[13px] text-red-500 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={goToSource}
            disabled={!title.trim()}
            className="admin-btn-primary mt-2 h-12 w-full rounded-full text-[15px]"
          >
            {tr('ns.continue')}
          </button>
        </div>
      ) : (
        <form onSubmit={(ev) => void onSubmit(ev)} className="space-y-4">
          <div className="space-y-3">
            <div
              role="radiogroup"
              aria-label={tr('ns.sourceAria')}
              className="grid grid-cols-3 rounded-full border border-[var(--admin-border-strong)] bg-[var(--admin-surface-bg)] p-1"
            >
              {sourceModes.map((mode) => {
                const selected = inputKind === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onModeChange(mode.id)}
                    className={`min-h-10 rounded-full py-2 text-[13px] font-semibold transition-colors duration-fast ${
                      selected
                        ? 'bg-[var(--admin-fg-strong)] text-[var(--admin-card-bg)]'
                        : 'text-[var(--admin-muted)] hover:text-[var(--admin-fg-strong)]'
                    }`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>

            {inputKind === 'text' || inputKind === 'file' ? (
              <details className="group rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-bg)] px-4 py-3 text-[13px] leading-relaxed text-[var(--admin-muted)]">
                <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 font-semibold text-[var(--admin-fg-strong)]">
                  {tr('cap.guideTitle')}
                  <span aria-hidden className="transition-transform duration-fast group-open:rotate-180">
                    ▾
                  </span>
                </summary>
                <p className="mt-2">{tr('cap.guideNoLinks')}</p>
                <p className="mt-3 font-semibold text-[var(--admin-fg)]">{tr('cap.guidePasteTitle')}</p>
                <p className="mt-1">{tr('cap.guidePasteSteps', { paste: tr('ns.modePaste') })}</p>
                <p className="mt-3 font-semibold text-[var(--admin-fg)]">{tr('cap.guideFileTitle')}</p>
                <p className="mt-1">{tr('cap.guideFileSteps', { upload: tr('ns.modeUpload') })}</p>
              </details>
            ) : null}

            {inputKind === 'youtube' ? (
              <div className="admin-page-enter space-y-4">
                <div>
                  <label htmlFor="sermon-youtube" className="admin-label">
                    {tr('ns.youtubeUrl')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="sermon-youtube"
                      name="youtubeUrl"
                      type="text"
                      inputMode="url"
                      autoComplete="url"
                      placeholder={tr('ns.youtubePlaceholder')}
                      value={youtubeUrl}
                      onChange={(e) => applyYoutubePaste(e.target.value)}
                      className="admin-input pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => void pasteFromClipboard()}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2.5 text-[var(--admin-muted)] transition-colors duration-fast hover:bg-[var(--admin-nav-hover-bg)] hover:text-[var(--admin-accent)]"
                      aria-label={tr('ns.pasteClipboard')}
                      title={tr('ns.pasteClipboard')}
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                        <path
                          d="M9 5h6a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1V7a2 2 0 0 1 2-2Z"
                          stroke="currentColor"
                          strokeWidth="1.75"
                        />
                        <rect
                          x="9"
                          y="3"
                          width="6"
                          height="4"
                          rx="1"
                          stroke="currentColor"
                          strokeWidth="1.75"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {videoMeta ? (
                  <div className="flex items-center gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-bg)] p-3">
                    {videoMeta.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={videoMeta.thumbnailUrl}
                        alt=""
                        className="h-14 w-24 shrink-0 rounded-md object-cover"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-[var(--admin-fg-strong)]">
                        {videoMeta.title}
                      </p>
                      {videoMeta.authorName ? (
                        <p className="admin-hint mt-0.5 truncate">{videoMeta.authorName}</p>
                      ) : null}
                      {videoMeta.title && videoMeta.title !== title.trim() ? (
                        <button
                          type="button"
                          className="mt-1 text-[12px] font-medium text-[var(--admin-link)] hover:underline"
                          onClick={() => setTitle(videoMeta.title)}
                        >
                          {tr('ns.useTitle')}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <p className="admin-hint">
                  {tr('ns.transLang')}{' '}
                  <a href="/settings" className="text-[var(--admin-link)] hover:underline">
                    {languageLabel}
                  </a>
                </p>

                <label className="flex items-start gap-3 rounded-xl border border-[var(--admin-border)] bg-[color-mix(in_srgb,var(--admin-accent)_8%,var(--admin-card-bg))] p-4 text-[13px] leading-relaxed text-[var(--admin-fg)]">
                  <input
                    type="checkbox"
                    checked={ownsRecording}
                    onChange={(e) => setOwnsRecording(e.target.checked)}
                    required
                    className="mt-0.5"
                  />
                  <span>
                    {tr('ns.rights')}
                  </span>
                </label>
              </div>
            ) : null}

            {inputKind === 'text' ? (
              <div className="admin-page-enter">
                <label htmlFor="sermon-script" className="sr-only">
                  {tr('ns.sermonText')}
                </label>
                <textarea
                  id="sermon-script"
                  name="scriptOrNotes"
                  rows={10}
                  required
                  placeholder={tr('ns.textPlaceholder')}
                  value={scriptOrNotes}
                  onChange={(e) => setScriptOrNotes(e.target.value)}
                  className="admin-input min-h-[10rem] resize-y leading-relaxed placeholder:text-[var(--admin-dim)]"
                />
              </div>
            ) : null}

            {inputKind === 'pdf' ? (
              <div className="admin-page-enter space-y-4">
                <div>
                  <label htmlFor="sermon-pdf" className="admin-label">
                    PDF <span className="text-red-500">*</span>
                  </label>
                  <label
                    htmlFor="sermon-pdf"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setFileOver(true);
                    }}
                    onDragLeave={() => setFileOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setFileOver(false);
                      void onPdfPicked(e.dataTransfer.files?.[0] ?? null);
                    }}
                    className={`mt-1.5 flex min-h-[7.5rem] w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center transition-colors duration-fast focus-within:border-[var(--admin-accent)] focus-within:shadow-[0_0_0_2px_rgba(14,165,233,0.25)] ${
                      fileOver || pdfFile
                        ? 'border-[var(--admin-accent)] bg-[color-mix(in_srgb,var(--admin-accent)_8%,var(--admin-surface-bg))]'
                        : 'border-[var(--admin-border-strong)] bg-[var(--admin-surface-bg)] hover:border-[var(--admin-accent)]'
                    }`}
                  >
                    <input
                      id="sermon-pdf"
                      type="file"
                      accept="application/pdf,.pdf"
                      className="sr-only"
                      disabled={pending || pdfReading}
                      onChange={(ev) => {
                        const f = ev.target.files?.[0] ?? null;
                        ev.target.value = '';
                        void onPdfPicked(f);
                      }}
                    />
                    {pdfReading ? (
                      <span className="text-[14px] font-medium text-[var(--admin-fg-strong)]" role="status">
                        {tr('pdf.reading')}
                      </span>
                    ) : pdfFile ? (
                      <>
                        <span className="max-w-full truncate text-[14px] font-medium text-[var(--admin-fg-strong)]">
                          {pdfFile.name}
                        </span>
                        <span className="admin-hint mt-1">{tr('pdf.replace')}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[14px] font-semibold text-[var(--admin-fg-strong)]">
                          {tr('pdf.choose')}
                        </span>
                        <span className="admin-hint mt-1">{tr('pdf.drop', { mb: PDF_MAX_MB })}</span>
                      </>
                    )}
                  </label>
                </div>
                {pdfText ? (
                  <div>
                    <label htmlFor="sermon-pdf-text" className="admin-label">
                      {tr('pdf.review')}
                    </label>
                    <p className="admin-hint mt-1">
                      {tr('pdf.reviewHint')}
                      {pdfNote ? ` ${pdfNote}` : ''}
                    </p>
                    <textarea
                      id="sermon-pdf-text"
                      rows={12}
                      value={pdfText}
                      onChange={(e) => setPdfText(e.target.value)}
                      className="admin-input mt-1 min-h-[12rem] resize-y leading-relaxed"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {inputKind === 'file' ? (
              <div className="admin-page-enter">
                <label htmlFor="sermon-file" className="admin-label">
                  {tr('ns.file')} <span className="text-red-500">*</span>
                </label>
                <label
                  htmlFor="sermon-file"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setFileOver(true);
                  }}
                  onDragLeave={() => setFileOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setFileOver(false);
                    const f = e.dataTransfer.files?.[0] ?? null;
                    if (f) void onMediaPicked(f);
                  }}
                  className={`mt-1.5 flex min-h-[9.5rem] w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center transition-colors duration-fast focus-within:border-[var(--admin-accent)] focus-within:shadow-[0_0_0_2px_rgba(14,165,233,0.25)] ${
                    fileOver || mediaFile
                      ? 'border-[var(--admin-accent)] bg-[color-mix(in_srgb,var(--admin-accent)_8%,var(--admin-surface-bg))]'
                      : 'border-[var(--admin-border-strong)] bg-[var(--admin-surface-bg)] hover:border-[var(--admin-accent)]'
                  }`}
                >
                  <input
                    id="sermon-file"
                    type="file"
                    accept={`audio/*,video/*,.txt,text/plain,${CAPTION_ACCEPT}`}
                    className="sr-only"
                    disabled={pending || captionReading}
                    onChange={(ev) => {
                      const f = ev.target.files?.[0] ?? null;
                      ev.target.value = '';
                      void onMediaPicked(f);
                    }}
                  />
                  {captionReading ? (
                    <span className="text-[14px] font-medium text-[var(--admin-fg-strong)]" role="status">
                      {tr('cap.reading')}
                    </span>
                  ) : mediaFile ? (
                    <>
                      <span className="max-w-full truncate text-[14px] font-medium text-[var(--admin-fg-strong)]">
                        {mediaFile.name}
                      </span>
                      <span className="admin-hint mt-1">{tr('ns.fileReplace')}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[14px] font-semibold text-[var(--admin-fg-strong)]">
                        {tr('ns.fileChoose')}
                      </span>
                      <span className="admin-hint mt-1">
                        {tr('ns.fileDrop')}
                      </span>
                    </>
                  )}
                </label>
                {captionText ? (
                  <div className="mt-4">
                    <label htmlFor="sermon-caption-text" className="admin-label">
                      {tr('cap.review')}
                    </label>
                    <p className="admin-hint mt-1">
                      {tr('cap.reviewHint')}
                      {captionNote ? ` ${captionNote}` : ''}
                    </p>
                    <textarea
                      id="sermon-caption-text"
                      rows={12}
                      value={captionText}
                      onChange={(e) => setCaptionText(e.target.value)}
                      className="admin-input mt-1 min-h-[12rem] resize-y leading-relaxed"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="text-[13px] text-red-500 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          {mediaProgress && pending ? (
            <TranscribeProgressPanel
              phase={mediaProgress.phase}
              phaseStartedAt={mediaProgress.phaseStartedAt}
              fileBytes={mediaProgress.bytes}
            />
          ) : null}
          {queuedJobId ? (
            <TranscriptionJobPoller
              jobId={queuedJobId}
              fileBytes={mediaFile?.size}
              onComplete={() => router.refresh()}
            />
          ) : null}
          <button
            type="submit"
            disabled={pending || !sourceReady}
            className="admin-btn-primary mt-2 h-12 w-full rounded-full text-[15px]"
          >
            {submitLabel}
          </button>
        </form>
      )}
    </div>
  );
}
