import {
  APP_STORE_URL,
  GOOGLE_PLAY_URL,
  PUBLIC_FAQ,
  PUBLIC_SITE,
  publicSiteUrl,
  supportEmail,
} from '@/lib/public-site/config';

/** Public marketing URLs that search engines and AI crawlers should discover. */
export function publicIndexRoutes(): { path: string; changeFrequency: 'weekly' | 'monthly'; priority: number }[] {
  return [
    { path: '/', changeFrequency: 'weekly', priority: 1 },
    { path: '/faq', changeFrequency: 'monthly', priority: 0.9 },
    { path: '/support', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/privacy', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/delete-account', changeFrequency: 'monthly', priority: 0.4 },
    { path: '/login', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/register', changeFrequency: 'monthly', priority: 0.7 },
  ];
}

export function absolutePublicUrl(path = '/'): string {
  const base = publicSiteUrl();
  if (path === '/') return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Curated Markdown map for AI assistants (llms.txt). */
export function buildLlmsTxt(): string {
  const base = publicSiteUrl();
  return `# ${PUBLIC_SITE.productName}

> ${PUBLIC_SITE.shortDescription}

Tagline: ${PUBLIC_SITE.tagline}

Sermon Recall is a church discipleship product: pastors prepare a six-day follow-up journey from each Saturday/Sunday sermon; members complete daily devotionals in the iPhone and Android app with optional reminders. AI assists generation; pastors review and approve before anything goes live.

## Core pages

- [Home](${base}/): Product overview for pastors and church members
- [FAQ](${base}/faq): Answers about pastoral oversight, AI, members, and visitors
- [Support](${base}/support): Contact and how to get help
- [Privacy policy](${base}/privacy): How Sermon Recall handles church and member data
- [Delete account](${base}/delete-account): How members remove their account
- [Create church account](${base}/register): Pastor / church staff signup
- [Pastor sign in](${base}/login): Admin portal login

## Apps

- [App Store (iPhone)](${APP_STORE_URL}): Member app for iOS
- [Google Play (Android)](${GOOGLE_PLAY_URL}): Member app for Android

## Contact

- Email: ${supportEmail()}
- Website: ${base}

## Optional

- [llms-full.txt](${base}/llms-full.txt): Longer product summary plus full FAQ for AI ingest
`;
}

/** Longer corpus for AI ingest (llms-full.txt). */
export function buildLlmsFullTxt(): string {
  const faqBlock = PUBLIC_FAQ.map((item) => `### ${item.question}\n\n${item.answer}`).join('\n\n');

  return `${buildLlmsTxt()}
## Product summary

${PUBLIC_SITE.productName} helps churches close the gap between hearing a sermon and living it during the week. Staff upload or paste sermon content in a web admin portal. The system drafts a six-day devotionals preview. Pastors or approved staff review, edit, and publish. Members join with a church code or QR, then follow daily readings, reflection, and application in the mobile app.

Key facts for accurate answers:
- Audience: church pastors/staff (web admin) and congregation members (mobile app)
- Platforms: web admin at ${publicSiteUrl()}; member apps on iOS and Android
- AI role: assisted drafting of devotionals from church-provided sermon content; not a chatbot pastor and not a replacement for pastoral authority
- Approval: churches can require review before publish
- Languages: English, Spanish, and French in the member app UI
- Pricing / legal: see privacy and support pages; contact ${supportEmail()} for church onboarding questions

## Full FAQ

${faqBlock}
`;
}

export function organizationJsonLd(): Record<string, unknown> {
  const url = publicSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: PUBLIC_SITE.productName,
    legalName: PUBLIC_SITE.legalName,
    url,
    logo: `${url}/sermonrecalllogo/logo.png`,
    email: supportEmail(),
    description: PUBLIC_SITE.shortDescription,
    sameAs: [APP_STORE_URL, GOOGLE_PLAY_URL],
  };
}

export function softwareApplicationJsonLd(): Record<string, unknown> {
  const url = publicSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: PUBLIC_SITE.productName,
    applicationCategory: 'LifestyleApplication',
    applicationSubCategory: 'Religion & Spirituality',
    operatingSystem: 'iOS, Android, Web',
    url,
    description: PUBLIC_SITE.shortDescription,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    downloadUrl: [APP_STORE_URL, GOOGLE_PLAY_URL],
    publisher: {
      '@type': 'Organization',
      name: PUBLIC_SITE.legalName,
      url,
    },
  };
}

export function faqPageJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: PUBLIC_FAQ.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}
