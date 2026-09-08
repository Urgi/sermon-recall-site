export type ChurchMemberRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  joined_at: string | null;
  last_active_at: string | null;
};

export type ChurchMembersPayload = {
  member_count: number;
  members: ChurchMemberRow[];
};

function asText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function asIso(value: unknown): string | null {
  if (typeof value === 'string') return asText(value);
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return null;
}

export function parseChurchMembers(data: unknown): ChurchMembersPayload | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  const raw = Array.isArray(o.members) ? o.members : [];
  const members: ChurchMemberRow[] = raw.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id ?? ''),
      full_name: asText(r.full_name),
      email: asText(r.email),
      phone_number: asText(r.phone_number),
      joined_at: asIso(r.joined_at),
      last_active_at: asIso(r.last_active_at),
    };
  }).filter((m) => m.id);

  const counted = Number(o.member_count);
  return {
    member_count: Number.isFinite(counted) ? counted : members.length,
    members,
  };
}
