export type DayCompletionRow = {
  day_number: number;
  opened_count: number;
  completed_count: number;
};

export type SermonEngagementRow = {
  sermon_id: string;
  title: string;
  days: DayCompletionRow[];
};

export type PastorEngagementPayload = {
  member_count: number;
  active_this_week: number;
  inactive_this_week: number;
  opened_this_week: number;
  sermons: SermonEngagementRow[];
  sample_commitments: string[];
};

export function parsePastorEngagement(data: unknown): PastorEngagementPayload | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  const member_count = Number(o.member_count);
  const active_this_week = Number(o.active_this_week);
  const inactive_this_week = Number(o.inactive_this_week);
  const opened_this_week = Number(o.opened_this_week);
  if (!Number.isFinite(member_count)) return null;

  const sermonsRaw = Array.isArray(o.sermons) ? o.sermons : [];
  const sermons: SermonEngagementRow[] = sermonsRaw.map((s) => {
    const r = s as Record<string, unknown>;
    const daysRaw = Array.isArray(r.days) ? r.days : [];
    const days: DayCompletionRow[] = daysRaw.map((d) => {
      const x = d as Record<string, unknown>;
      const opened = Number(x.opened_count);
      return {
        day_number: Number(x.day_number),
        opened_count: Number.isFinite(opened) ? opened : 0,
        completed_count: Number.isFinite(Number(x.completed_count)) ? Number(x.completed_count) : 0,
      };
    });
    return {
      sermon_id: String(r.sermon_id ?? ''),
      title: String(r.title ?? ''),
      days,
    };
  });

  const scRaw = Array.isArray(o.sample_commitments) ? o.sample_commitments : [];
  const sample_commitments = scRaw.map((x) => String(x)).filter(Boolean);

  return {
    member_count,
    active_this_week: Number.isFinite(active_this_week) ? active_this_week : 0,
    inactive_this_week: Number.isFinite(inactive_this_week) ? inactive_this_week : 0,
    opened_this_week: Number.isFinite(opened_this_week) ? opened_this_week : 0,
    sermons,
    sample_commitments,
  };
}
