import { NextResponse } from 'next/server';

import { authorizeApiWithChurch, getChurchForProfile } from '@/lib/auth/server';
import { buildMemberJoinUrl } from '@/lib/church/member-join';
import { qrPngBuffer } from '@/lib/church/qr';

export async function GET() {
  const auth = await authorizeApiWithChurch();
  if (!auth.ok) return auth.response;

  const church = await getChurchForProfile(auth.ctx.profile.church_id);
  if (!church?.church_code) {
    return NextResponse.json({ error: 'Church not found.' }, { status: 404 });
  }

  const joinUrl = buildMemberJoinUrl(church.church_code);
  const png = await qrPngBuffer(joinUrl);
  const safeCode = church.church_code.replace(/[^a-zA-Z0-9_-]/g, '_');

  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="sermon-recall-${safeCode}-qr.png"`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
