import { type AppLanguage, normalizeAppLanguage } from './languages';

export type UiVars = Record<string, string | number>;

const EN = {
  'nav.overview': 'Overview',
  'nav.sermons': 'Sermons',
  'nav.members': 'Members',
  'nav.team': 'Team',
  'nav.notifications': 'Notifications',
  'nav.notifyShort': 'Notify',
  'nav.settings': 'Settings',
  'nav.churchAdmin': 'Church admin',
  'settings.title': 'Settings',
  'settings.intro': 'Church workspace and your personal preferences for the admin portal.',
  'settings.church': 'Church',
  'settings.churchTitle': 'Church settings',
  'settings.churchHint': 'How members join, what language devotionals use, and who can publish.',
  'settings.churchLocked':
    'Your role cannot change church-wide settings. Ask an owner or admin pastor if something needs updating.',
  'settings.yourAccount': 'Your account',
  'settings.language': 'Language',
  'settings.languageHint':
    'Your personal language in Sermon Recall. This does not change the church default.',
  'settings.appearance': 'Appearance',
  'settings.appearanceHint':
    'Dark for evening work, or a brighter theme during the day. Saved on this device.',
  'settings.preferredLanguage': 'Preferred language',
  'settings.saveLanguage': 'Save language',
  'settings.saving': 'Saving…',
  'settings.languageSaved': 'Language preference saved.',
  'settings.signInAgain': 'Sign in again to update language.',
  'settings.networkError': 'Network error. Try again.',
  'settings.loading': 'Loading…',
  'settings.churchLanguage': 'Church language',
  'dash.goodMorning': 'Good morning',
  'dash.goodAfternoon': 'Good afternoon',
  'dash.goodEvening': 'Good evening',
} as const;

type UiKey = keyof typeof EN;

const ES: Record<UiKey, string> = {
  'nav.overview': 'Resumen',
  'nav.sermons': 'Sermones',
  'nav.members': 'Miembros',
  'nav.team': 'Equipo',
  'nav.notifications': 'Notificaciones',
  'nav.notifyShort': 'Avisos',
  'nav.settings': 'Ajustes',
  'nav.churchAdmin': 'Admin de iglesia',
  'settings.title': 'Ajustes',
  'settings.intro': 'Espacio de la iglesia y tus preferencias personales del portal.',
  'settings.church': 'Iglesia',
  'settings.churchTitle': 'Ajustes de la iglesia',
  'settings.churchHint': 'Cómo se unen los miembros, el idioma de los devocionales y quién publica.',
  'settings.churchLocked':
    'Tu rol no puede cambiar los ajustes de toda la iglesia. Pide a un dueño o pastor admin.',
  'settings.yourAccount': 'Tu cuenta',
  'settings.language': 'Idioma',
  'settings.languageHint':
    'Tu idioma personal en Sermon Recall. No cambia el idioma predeterminado de la iglesia.',
  'settings.appearance': 'Apariencia',
  'settings.appearanceHint':
    'Oscuro para trabajar de noche, o un tema más claro de día. Se guarda en este dispositivo.',
  'settings.preferredLanguage': 'Idioma preferido',
  'settings.saveLanguage': 'Guardar idioma',
  'settings.saving': 'Guardando…',
  'settings.languageSaved': 'Preferencia de idioma guardada.',
  'settings.signInAgain': 'Inicia sesión de nuevo para actualizar el idioma.',
  'settings.networkError': 'Error de red. Inténtalo de nuevo.',
  'settings.loading': 'Cargando…',
  'settings.churchLanguage': 'Idioma de la iglesia',
  'dash.goodMorning': 'Buenos días',
  'dash.goodAfternoon': 'Buenas tardes',
  'dash.goodEvening': 'Buenas noches',
};

const FR: Record<UiKey, string> = {
  'nav.overview': 'Aperçu',
  'nav.sermons': 'Prédications',
  'nav.members': 'Membres',
  'nav.team': 'Équipe',
  'nav.notifications': 'Notifications',
  'nav.notifyShort': 'Alertes',
  'nav.settings': 'Réglages',
  'nav.churchAdmin': 'Admin église',
  'settings.title': 'Réglages',
  'settings.intro': 'Espace de l’église et vos préférences personnelles du portail.',
  'settings.church': 'Église',
  'settings.churchTitle': 'Réglages de l’église',
  'settings.churchHint':
    'Comment les membres rejoignent, la langue des dévotions, et qui peut publier.',
  'settings.churchLocked':
    'Votre rôle ne peut pas modifier les réglages de l’église. Demandez à un propriétaire ou pasteur admin.',
  'settings.yourAccount': 'Votre compte',
  'settings.language': 'Langue',
  'settings.languageHint':
    'Votre langue personnelle dans Sermon Recall. Cela ne change pas la langue de l’église.',
  'settings.appearance': 'Apparence',
  'settings.appearanceHint':
    'Sombre pour le soir, ou un thème plus clair le jour. Enregistré sur cet appareil.',
  'settings.preferredLanguage': 'Langue préférée',
  'settings.saveLanguage': 'Enregistrer la langue',
  'settings.saving': 'Enregistrement…',
  'settings.languageSaved': 'Préférence de langue enregistrée.',
  'settings.signInAgain': 'Reconnectez-vous pour modifier la langue.',
  'settings.networkError': 'Erreur réseau. Réessayez.',
  'settings.loading': 'Chargement…',
  'settings.churchLanguage': 'Langue de l’église',
  'dash.goodMorning': 'Bonjour',
  'dash.goodAfternoon': 'Bon après-midi',
  'dash.goodEvening': 'Bonsoir',
};

const TABLES: Record<AppLanguage, Record<UiKey, string>> = { en: EN, es: ES, fr: FR };

function interpolate(template: string, vars?: UiVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

export function translateUi(language: unknown, key: UiKey, vars?: UiVars): string {
  const lang = normalizeAppLanguage(language);
  return interpolate(TABLES[lang][key] ?? EN[key], vars);
}

export type { UiKey };
