import { NextResponse } from 'next/server';

import { writeAuditLog } from '@/lib/audit/log';
import { authorizeApiPermission } from '@/lib/auth/server';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  extractPdfText,
  PDF_MAX_BYTES,
  PdfExtractError,
} from '@/lib/transcription/pdf-extract';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function fail(code: string, error: string, status: number) {
  return NextResponse.json({ code, error }, { status });
}

/**
 * Extracts text from an uploaded PDF so the pastor can review it, then save it
 * as a normal pasted-text sermon. Writes nothing to the database except an audit row.
 */
export async function POST(req: Request) {
  const auth = await authorizeApiPermission('can_generate_devotionals');
  if (!auth.ok) return auth.response;

  const userId = auth.ctx.user.id;
  const limit = await checkRateLimit(`pdf-extract:${userId}`, 20, 60 * 60 * 1000);
  if (!limit.allowed) {
    return fail('rate_limit', 'PDF upload limit reached. Try again later.', 429);
  }

  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get('file');
  } catch {
    return fail('no_file', 'Choose a PDF file.', 400);
  }
  if (!file || typeof file === 'string') return fail('no_file', 'Choose a PDF file.', 400);
  if (file.size === 0) return fail('empty_file', 'That file is empty.', 400);
  if (file.size > PDF_MAX_BYTES) return fail('too_large', 'That PDF is too large.', 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const magic = Buffer.from(bytes.subarray(0, 1024)).toString('latin1');
  if (!magic.includes('%PDF-')) return fail('not_pdf', 'That file is not a PDF.', 400);

  try {
    const result = await extractPdfText(bytes);
    await writeAuditLog({
      churchId: auth.ctx.profile.church_id ?? null,
      actorUserId: userId,
      action: 'sermon.pdf_extracted',
      entityType: 'sermon_source',
      metadata: { pages: result.pages, chars: result.text.length, truncated: result.truncated },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof PdfExtractError) {
      const msg: Record<string, string> = {
        password: 'This PDF is password-protected.',
        no_text: 'No readable text found in this PDF.',
        corrupt: 'This PDF could not be read.',
      };
      return fail(e.code, msg[e.code], 422);
    }
    return fail('corrupt', 'This PDF could not be read.', 422);
  }
}
