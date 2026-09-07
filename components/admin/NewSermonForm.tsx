'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { TranscriptionJobPoller } from '@/components/admin/TranscriptionJobPoller';
import { TranscribeProgressPanel } from '@/components/admin/TranscribeProgressPanel';
import { SermonDatePicker } from '@/components/admin/SermonDatePicker';
import { SermonWizardProgress } from '@/components/admin/SermonWizardProgress';
import { languagePromptName, normalizeAppLanguage } from '@/lib/i18n/languages';
import { sermonWizardCopy } from '@/lib/admin/sermon-wizard';
import {
  extractYouTubeUrl,
  parseYouTubeUrl,
} from '@/lib/transcription/constants';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { TranscribePhase } from '@/lib/transcribe-progress-estimate';

type Props = {
  churchId: string;
  sermonLanguage?: string | null;
  defaultPastorName?: string | null;
};

type InputKind = 'youtube' | 'file' | 'text';
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
  const languageLabel = languagePromptName(normalizeAppLanguage(sermonLanguage));
  const [wizardStep, setWizardStep] = useState<NewSermonStep>('details');
  const [inputKind, setInputKind] = useState<InputKind>('text');
  const [title, setTitle] = useState('');
  const [pastorName, setPastorName] = useState(defaultPastorName?.trim() ?? '');
  const [sermonDate, setSermonDate] = useState('');
  const [scriptOrNotes, setScriptOrNotes] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [fileOver, setFileOver] = useState(false);
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
    if (next === 'text') {
      setMediaFile(null);
      setYoutubeUrl('');
      setVideoMeta(null);
      setOwnsRecording(false);
    }
    if (next === 'file') {
      setScriptOrNotes('');
      setYoutubeUrl('');
      setVideoMeta(null);
      setOwnsRecording(false);
    }
    if (next === 'youtube') {
      setScriptOrNotes('');
      setMediaFile(null);
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
        setError('Clipboard was empty.');
        return;
      }
      applyYoutubePaste(text);
    } catch {
      setError('Could not read the clipboard. Paste with ⌘V instead.');
    }
  }

  function goToSource() {
    setError(null);
    if (!title.trim()) {
      setError('Title is required.');
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
      setError(json.error ?? 'Could not queue transcription.');
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
      setError('Title is required.');
      setWizardStep('details');
      return;
    }

    const supabase = createBrowserSupabaseClient();
    setPending(true);

    try {
      if (inputKind === 'text') {
        const notes = scriptOrNotes.trim();
        if (!notes) {
          setError('Paste sermon text, or choose another source.');
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
          setError(insertError.message);
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
          setError('Enter a valid YouTube URL.');
          return;
        }
        if (!ownsRecording) {
          setError('Confirm this is a recording your church has the right to use.');
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
          setError(insertError?.message ?? 'Could not create sermon.');
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
        setError('Choose a .txt, audio, or video file.');
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('Not signed in.');
        return;
      }

      const isPlainText =
        mediaFile.type.startsWith('text/') || mediaFile.name.toLowerCase().endsWith('.txt');

      if (isPlainText) {
        const text = (await mediaFile.text()).trim();
        if (!text) {
          setError('That text file was empty.');
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
          setError(insertError.message);
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
        setError(insertError?.message ?? 'Could not create sermon.');
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
        setError(upStorage.message);
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
      setError('Something went wrong.');
    } finally {
      setMediaProgress(null);
      setPending(false);
    }
  }

  function fileNeedsTranscribe(f: File) {
    if (f.name.toLowerCase().endsWith('.txt')) return false;
    if (f.type.startsWith('text/')) return false;
    return true;
  }

  const submitLabel =
    pending && inputKind === 'file' && mediaFile && fileNeedsTranscribe(mediaFile)
      ? 'Uploading…'
      : pending && inputKind === 'youtube'
        ? 'Queuing…'
        : pending
          ? 'Saving…'
          : 'Create devotionals';

  const sourceModes: { id: InputKind; label: string }[] = [
    { id: 'text', label: 'Paste text' },
    { id: 'file', label: 'Upload' },
  ];

  const sourceReady =
    inputKind === 'youtube'
      ? Boolean(ownsRecording && parseYouTubeUrl(youtubeUrl))
      : inputKind === 'file'
        ? Boolean(mediaFile)
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
              Title <span className="text-red-500">*</span>
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
              Pastor name
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
            <span className="admin-label">Sermon date</span>
            <p className="admin-hint mt-1">Optional — pick from the calendar or leave unset.</p>
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
            Continue
          </button>
        </div>
      ) : (
        <form onSubmit={(ev) => void onSubmit(ev)} className="space-y-4">
          <div className="space-y-3">
            <div
              role="radiogroup"
              aria-label="Sermon source"
              className="grid grid-cols-2 rounded-full border border-[var(--admin-border-strong)] bg-[var(--admin-surface-bg)] p-1"
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
                    className={`rounded-full py-2 text-[13px] font-semibold transition-colors ${
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

            {inputKind === 'youtube' ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="sermon-youtube" className="admin-label">
                    YouTube URL <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="sermon-youtube"
                      name="youtubeUrl"
                      type="text"
                      inputMode="url"
                      autoComplete="url"
                      placeholder="Paste a YouTube link to this week’s sermon"
                      value={youtubeUrl}
                      onChange={(e) => applyYoutubePaste(e.target.value)}
                      className="admin-input pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => void pasteFromClipboard()}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-[var(--admin-muted)] hover:bg-[var(--admin-nav-hover-bg)] hover:text-[var(--admin-accent)]"
                      aria-label="Paste from clipboard"
                      title="Paste from clipboard"
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
                          Use this title
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <p className="admin-hint">
                  Transcription language:{' '}
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
                    I confirm this is a recording our church has the right to use (our sermon, or we
                    have permission).
                  </span>
                </label>
              </div>
            ) : null}

            {inputKind === 'text' ? (
              <div>
                <label htmlFor="sermon-script" className="sr-only">
                  Sermon text
                </label>
                <textarea
                  id="sermon-script"
                  name="scriptOrNotes"
                  rows={10}
                  required
                  placeholder="Paste manuscript, outline, or bullets…"
                  value={scriptOrNotes}
                  onChange={(e) => setScriptOrNotes(e.target.value)}
                  className="admin-input min-h-[10rem] resize-y leading-relaxed placeholder:text-[var(--admin-dim)]"
                />
              </div>
            ) : null}

            {inputKind === 'file' ? (
              <div>
                <label htmlFor="sermon-file" className="admin-label">
                  File <span className="text-red-500">*</span>
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
                    if (f) {
                      setMediaFile(f);
                      setError(null);
                    }
                  }}
                  className={`mt-1.5 flex min-h-[9.5rem] w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center transition-colors ${
                    fileOver || mediaFile
                      ? 'border-[var(--admin-accent)] bg-[color-mix(in_srgb,var(--admin-accent)_8%,var(--admin-surface-bg))]'
                      : 'border-[var(--admin-border-strong)] bg-[var(--admin-surface-bg)] hover:border-[var(--admin-accent)]'
                  }`}
                >
                  <input
                    id="sermon-file"
                    type="file"
                    accept="audio/*,video/*,.txt,text/plain"
                    className="sr-only"
                    disabled={pending}
                    onChange={(ev) => {
                      const f = ev.target.files?.[0] ?? null;
                      setMediaFile(f);
                      setError(null);
                      ev.target.value = '';
                    }}
                  />
                  {mediaFile ? (
                    <>
                      <span className="max-w-full truncate text-[14px] font-medium text-[var(--admin-fg-strong)]">
                        {mediaFile.name}
                      </span>
                      <span className="admin-hint mt-1">Tap to replace</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[14px] font-semibold text-[var(--admin-fg-strong)]">
                        Choose file
                      </span>
                      <span className="admin-hint mt-1">
                        Choose any audio, video, or text file.
                      </span>
                    </>
                  )}
                </label>
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
