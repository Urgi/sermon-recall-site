import { notFound } from 'next/navigation';

import { SermonTranscriptEditor } from '@/components/admin/SermonTranscriptEditor';
import { canManageSermonsWithStaff } from '@/lib/auth/profile';
import { requireAdminSession } from '@/lib/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type Props = { params: { id: string } };

export default async function SermonTranscriptPage({ params }: Props) {
  const { profile, staffRole } = await requireAdminSession();
  const supabase = createServerSupabaseClient();

  const { data: sermon } = await supabase
    .from('sermons')
    .select('id, title, pastor_name, sermon_date, transcript')
    .eq('id', params.id)
    .single();

  if (!sermon) {
    notFound();
  }

  const transcript = sermon.transcript?.trim() ?? '';
  if (!transcript) {
    notFound();
  }

  const canEdit = canManageSermonsWithStaff(profile, staffRole);
  const pastorLine = [sermon.pastor_name, sermon.sermon_date].filter(Boolean).join(' · ');

  return (
    <SermonTranscriptEditor
      sermonId={sermon.id}
      sermonTitle={sermon.title}
      pastorLine={pastorLine}
      transcript={transcript}
      canEdit={canEdit}
    />
  );
}
