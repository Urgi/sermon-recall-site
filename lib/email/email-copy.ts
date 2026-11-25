import { normalizeAppLanguage, type AppLanguage } from '@/lib/i18n/languages';

/** Copy for emails the portal sends on a church's behalf, in the church language. */

type MemberJoinCopy = {
  subject: (church: string) => string;
  intro: (churchHtml: string) => string;
  introText: (church: string) => string;
  step1Html: (linkHtml: string) => string;
  step1Text: (url: string) => string;
  step2: string;
  step3Html: (codeHtml: string) => string;
  step3Text: (code: string) => string;
  qrAlt: (church: string) => string;
  questions: string;
  openLink: string;
  qrNote: string;
};

const MEMBER_JOIN: Record<AppLanguage, MemberJoinCopy> = {
  en: {
    subject: (c) => `Join ${c} on Sermon Recall`,
    intro: (c) => `Join ${c} on Sermon Recall.`,
    introText: (c) => `Join ${c} on Sermon Recall`,
    step1Html: (l) => `1. Install Sermon Recall from ${l}.`,
    step1Text: (u) => `1. Install Sermon Recall from Google Play: ${u}`,
    step2: '2. Sign in with your email (one-time code).',
    step3Html: (c) => `3. Enter church code ${c} or scan the QR code below.`,
    step3Text: (c) => `3. Enter church code: ${c}`,
    qrAlt: (c) => `QR code to join ${c}`,
    questions: 'Questions? Contact your pastor.',
    openLink: 'Or open this link:',
    qrNote: 'Your pastor can also send a QR image you can scan from your camera app.',
  },
  es: {
    subject: (c) => `Únete a ${c} en Sermon Recall`,
    intro: (c) => `Únete a ${c} en Sermon Recall.`,
    introText: (c) => `Únete a ${c} en Sermon Recall`,
    step1Html: (l) => `1. Instala Sermon Recall desde ${l}.`,
    step1Text: (u) => `1. Instala Sermon Recall desde Google Play: ${u}`,
    step2: '2. Inicia sesión con tu correo electrónico (código de un solo uso).',
    step3Html: (c) => `3. Escribe el código de la iglesia ${c} o escanea el código QR de abajo.`,
    step3Text: (c) => `3. Escribe el código de la iglesia: ${c}`,
    qrAlt: (c) => `Código QR para unirse a ${c}`,
    questions: '¿Preguntas? Habla con tu pastor.',
    openLink: 'O abre este enlace:',
    qrNote: 'Tu pastor también puede enviarte una imagen con el código QR para escanearla con la cámara.',
  },
  fr: {
    subject: (c) => `Rejoignez ${c} sur Sermon Recall`,
    intro: (c) => `Rejoignez ${c} sur Sermon Recall.`,
    introText: (c) => `Rejoignez ${c} sur Sermon Recall`,
    step1Html: (l) => `1. Installez Sermon Recall depuis ${l}.`,
    step1Text: (u) => `1. Installez Sermon Recall depuis Google Play : ${u}`,
    step2: '2. Connectez-vous avec votre adresse e-mail (code à usage unique).',
    step3Html: (c) => `3. Saisissez le code de l’église ${c} ou scannez le code QR ci-dessous.`,
    step3Text: (c) => `3. Saisissez le code de l’église : ${c}`,
    qrAlt: (c) => `Code QR pour rejoindre ${c}`,
    questions: 'Des questions ? Contactez votre pasteur.',
    openLink: 'Ou ouvrez ce lien :',
    qrNote: 'Votre pasteur peut aussi vous envoyer une image du code QR à scanner avec l’appareil photo.',
  },
};

export function memberJoinCopy(language: unknown): MemberJoinCopy {
  return MEMBER_JOIN[normalizeAppLanguage(language)];
}

type InviteCopy = {
  subject: (church: string) => string;
  bodyHtml: (inviter: string, church: string, role: string) => string;
  accept: string;
  expiry: string;
  hi: string;
};

const ROLE_NAMES: Record<AppLanguage, Record<string, string>> = {
  en: {},
  es: {
    owner: 'propietario',
    admin_pastor: 'pastor administrador',
    associate_pastor: 'pastor asociado',
    elder: 'anciano',
    contributor: 'colaborador',
    viewer: 'lector',
  },
  fr: {
    owner: 'propriétaire',
    admin_pastor: 'pasteur administrateur',
    associate_pastor: 'pasteur associé',
    elder: 'ancien',
    contributor: 'contributeur',
    viewer: 'lecteur',
  },
};

const INVITE: Record<AppLanguage, InviteCopy> = {
  en: {
    subject: (c) => `You're invited to ${c} on Sermon Recall`,
    hi: 'Hi,',
    bodyHtml: (i, c, r) => `${i} invited you to join <strong>${c}</strong> as <strong>${r}</strong>.`,
    accept: 'Accept invitation',
    expiry: 'This link expires in 7 days. If you did not expect this, you can ignore this email.',
  },
  es: {
    subject: (c) => `Te invitaron a ${c} en Sermon Recall`,
    hi: 'Hola:',
    bodyHtml: (i, c, r) => `${i} te invitó a unirte a <strong>${c}</strong> como <strong>${r}</strong>.`,
    accept: 'Aceptar invitación',
    expiry: 'Este enlace caduca en 7 días. Si no esperabas este mensaje, puedes ignorarlo.',
  },
  fr: {
    subject: (c) => `Vous êtes invité à rejoindre ${c} sur Sermon Recall`,
    hi: 'Bonjour,',
    bodyHtml: (i, c, r) => `${i} vous invite à rejoindre <strong>${c}</strong> en tant que <strong>${r}</strong>.`,
    accept: 'Accepter l’invitation',
    expiry: 'Ce lien expire dans 7 jours. Si vous n’attendiez pas ce message, vous pouvez l’ignorer.',
  },
};

export function inviteCopy(language: unknown): InviteCopy {
  return INVITE[normalizeAppLanguage(language)];
}

export function inviteRoleName(language: unknown, role: string): string {
  const lang = normalizeAppLanguage(language);
  return ROLE_NAMES[lang][role] ?? role.replace(/_/g, ' ');
}
