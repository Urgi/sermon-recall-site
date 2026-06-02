import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local'), override: true });

import { createClient } from '@supabase/supabase-js';

import { supabaseNodeWebSocketTransport } from '@/lib/supabase/node-ws-transport';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error('Missing Supabase URL or service role key.');
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: supabaseNodeWebSocketTransport },
});

async function main() {
  const { data: stuck, error } = await admin
    .from('sermon_transcription_jobs')
    .select('id, sermon_id, status, source_type, storage_path, source_url')
    .in('status', ['pending', 'processing']);

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const bad = (stuck ?? []).filter(
    (j) =>
      (j.source_type === 'storage' && !j.storage_path) ||
      (j.source_type === 'youtube' && !j.source_url),
  );

  if (bad.length === 0) {
    console.info('No invalid stuck jobs.');
    return;
  }

  for (const job of bad) {
    await admin
      .from('sermon_transcription_jobs')
      .update({
        status: 'failed',
        error_message: 'Invalid job row (missing source). Re-queue from admin.',
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);
    if (job.sermon_id) {
      await admin
        .from('sermons')
        .update({ transcript_status: 'failed', status: 'failed' })
        .eq('id', job.sermon_id);
    }
    console.info('Failed invalid job', job.id);
  }
}

void main();
