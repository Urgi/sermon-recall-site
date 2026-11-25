import { cookies } from 'next/headers';

import { LANGUAGE_COOKIE, normalizeAppLanguage } from './languages';
import { translateUi, type UiKey } from './ui';

/** Page/tab title in the language remembered for this visitor (server-side, for generateMetadata). */
export function localizedTitle(key: UiKey): string {
  const language = normalizeAppLanguage(cookies().get(LANGUAGE_COOKIE)?.value);
  return translateUi(language, key);
}
