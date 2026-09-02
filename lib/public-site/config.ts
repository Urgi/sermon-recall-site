/** Public marketing site copy and contact info (Apple / App Store business verification). */

export function publicSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}

export function supportEmail(): string {
  return process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || 'support@sermonrecall.com';
}

export const PUBLIC_SITE = {
  productName: 'Sermon Recall',
  legalName: 'Sermon Recall',
  tagline: 'Listen. Remember. Grow.',
  shortDescription:
    "Sermon Recall helps churches turn Saturday/Sunday's message into a six-day devotional journey so members remember and apply what they heard.",
} as const;

/** Member app store links (override via env if the listing URL changes). */
export const GOOGLE_PLAY_URL =
  process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL?.trim() ||
  'https://play.google.com/store/apps/details?id=com.antoineassociates.sermonrecall';

/** Set when the App Store listing is live (Apple ID 6798402169). */
export const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL?.trim() || '';

/** Homepage + FAQ page — curated list from ministry positioning doc (12 key objections). */
export const PUBLIC_FAQ = [
  {
    question: 'What is Sermon Recall?',
    answer:
      "Sermon Recall is a sermon follow-up and devotional engagement system that helps churches turn one Saturday/Sunday message into several days of guided reflection, recall, prayer, and application. Instead of the message ending when the service ends, Sermon Recall helps members carry it into the week.",
  },
  {
    question: 'What problem does Sermon Recall solve?',
    answer:
      'Many people hear a powerful sermon, feel moved in the moment, and then forget most of it within a few days. Sermon Recall helps churches bridge the gap between hearing the Word and living the Word by creating structured follow-up content based on the sermon.',
  },
  {
    question: 'How does Sermon Recall work?',
    answer:
      'Your church uploads or provides sermon content. Sermon Recall helps create a structured six-day follow-up experience — daily devotionals, reflection questions, prayer points, and application prompts. Members access content through the mobile app; pastors review and publish from the web admin portal.',
  },
  {
    question: 'Does Sermon Recall replace the pastor?',
    answer:
      'No. Sermon Recall does not replace the pastor, preacher, or ministry leader — it supports them. The sermon still comes from the pastor; spiritual direction still comes from the church. Sermon Recall simply helps extend the life of the message after it has been preached.',
  },
  {
    question: 'Will Sermon Recall change the meaning of the sermon?',
    answer:
      'The goal is to preserve the sermon’s message, not rewrite it. Sermon Recall works from the sermon content your church provides and converts it into follow-up material. Pastors and staff review and approve every devotional before members see it.',
  },
  {
    question: 'Can the pastor approve content before it goes out?',
    answer:
      'Yes. Review and approval are built into the workflow. Pastors or assigned ministry leaders can review, edit, and approve devotional content before it is published — for theological accuracy, tone, and alignment with your church’s message.',
  },
  {
    question: 'How does Sermon Recall help church members?',
    answer:
      "It helps members remember Saturday/Sunday's sermon, reflect on it, pray through it, and apply it in real life. Instead of depending only on memory, members receive guided prompts that help them revisit the message during the week through the mobile app.",
  },
  {
    question: 'Does Sermon Recall use AI?',
    answer:
      'Yes. Sermon Recall uses AI-assisted tools to help transform sermon content into structured devotional material. The AI is not the spiritual authority — your church remains responsible for review, approval, and final messaging.',
  },
  {
    question: 'Can Sermon Recall help visitors?',
    answer:
      'Yes. Visitors who hear a sermon can join through your church’s shareable link or code and follow the same sermon-based devotional journey. This helps keep them connected to the message and your church after their first visit.',
  },
  {
    question: 'Can it connect with our church’s existing communication system?',
    answer:
      'Sermon Recall delivers devotionals through the member app with optional push reminders. You promote join links and codes through whatever channels you already use — email, bulletin, SMS, social, or in person. The app handles the follow-up experience once members are connected.',
  },
  {
    question: 'What does the church need to get started?',
    answer:
      'At minimum: sermon content, someone to approve devotionals, and a way to invite members. Content can come from a transcript, notes, recording, or manuscript. Create a church account, upload your first sermon, review the generated cycle, and share your join code.',
  },
  {
    question: 'Is Sermon Recall mainly a technology tool or a discipleship tool?',
    answer:
      'It is a discipleship tool powered by technology. The purpose is not to impress people with AI — it is to help people remember, reflect, and respond to the message God has already allowed them to hear.',
  },
] as const;
