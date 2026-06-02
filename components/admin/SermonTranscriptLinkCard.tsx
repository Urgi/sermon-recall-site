import Link from 'next/link';

type Props = {
  sermonId: string;
  characterCount: number;
};

export function SermonTranscriptLinkCard({ sermonId, characterCount }: Props) {
  return (
    <Link
      href={`/sermons/${sermonId}/transcript`}
      className="admin-card block p-5 transition hover:border-[rgba(56,189,248,0.35)] hover:bg-admin-surface/60"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-admin-accent">
            Source transcript
          </p>
          <p className="admin-body mt-1">
            Open the full transcript to read or edit. This text powers devotional generation.
          </p>
          <p className="admin-hint mt-2 text-[12px]">
            {characterCount.toLocaleString()} characters
          </p>
        </div>
        <span className="shrink-0 text-[13px] font-medium text-sky-400">View →</span>
      </div>
    </Link>
  );
}
