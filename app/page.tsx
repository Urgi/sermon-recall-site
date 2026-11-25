import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { HomeContent } from '@/components/public/HomeContent';
import { JsonLd } from '@/components/public/JsonLd';
import { PublicShell } from '@/components/public/PublicShell';
import {
  faqPageJsonLd,
  organizationJsonLd,
  softwareApplicationJsonLd,
} from '@/lib/public-site/ai-discoverability';
import { PUBLIC_SITE } from '@/lib/public-site/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Sermon Recall — Church devotional app',
  description: PUBLIC_SITE.shortDescription,
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Sermon Recall',
    description: PUBLIC_SITE.shortDescription,
    type: 'website',
    url: '/',
  },
};

export default async function PublicHomePage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <PublicShell>
      <JsonLd data={[organizationJsonLd(), softwareApplicationJsonLd(), faqPageJsonLd()]} />
      <HomeContent />
    </PublicShell>
  );
}
