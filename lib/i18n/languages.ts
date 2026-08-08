/** Supported product languages (UI preference + church sermon / devotional language). */

export const APP_LANGUAGES = [
  { value: 'en', label: 'English', nativeLabel: 'English' },
  { value: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { value: 'fr', label: 'French', nativeLabel: 'Français' },
] as const;

export type AppLanguage = (typeof APP_LANGUAGES)[number]['value'];

export const DEFAULT_APP_LANGUAGE: AppLanguage = 'en';

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'en' || value === 'es' || value === 'fr';
}

export function normalizeAppLanguage(value: unknown): AppLanguage {
  if (typeof value !== 'string') return DEFAULT_APP_LANGUAGE;
  const trimmed = value.trim().toLowerCase();
  return isAppLanguage(trimmed) ? trimmed : DEFAULT_APP_LANGUAGE;
}

export function languageOptionLabel(code: AppLanguage): string {
  const opt = APP_LANGUAGES.find((o) => o.value === code);
  if (!opt) return code;
  return `${opt.label} (${opt.nativeLabel})`;
}

/** English display name for prompts (e.g. "Spanish"). */
export function languagePromptName(code: AppLanguage): string {
  return APP_LANGUAGES.find((o) => o.value === code)?.label ?? 'English';
}

/**
 * Instruction block for OpenAI devotional prompts.
 * JSON keys stay English; all member-facing string values use the church language.
 */
export function generationLanguageInstruction(code: AppLanguage): string {
  const name = languagePromptName(code);
  if (code === 'en') {
    return `Language: Write all member-facing text in English (titles, main_content, reflection_question, pre_prompt, scripture_text). Keep JSON keys in English.`;
  }
  return `Language (REQUIRED): Write ALL member-facing text in ${name} (${code}) — including title, main_content, reflection_question, pre_prompt, and scripture_text. Use a widely accepted ${name} Bible translation for scripture_text when quoting verses. Keep JSON keys in English (day_number, title, main_content, etc.). Do not mix English into member-facing fields unless a proper noun requires it.`;
}
