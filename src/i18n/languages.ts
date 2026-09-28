/**
 * Language registry — the 40 locales Zperiod ships in.
 *
 * `dir` drives RTL layout, `name` is the endonym shown in the language picker
 * (each language should be able to find itself), and `dateLocale` is passed to
 * Intl for number/date formatting.
 */

export type Direction = 'ltr' | 'rtl';

export interface LanguageDef {
  /** BCP-47 tag used for Intl and for the element-name lookup file. */
  code: string;
  /** Endonym — how this language names itself. */
  name: string;
  dir: Direction;
}

export const LANGUAGES: LanguageDef[] = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'zh-Hans', name: '简体中文', dir: 'ltr' },
  { code: 'zh-Hant', name: '繁體中文', dir: 'ltr' },
  { code: 'fr', name: 'Français', dir: 'ltr' },
  { code: 'ru', name: 'Русский', dir: 'ltr' },
  { code: 'fa', name: 'فارسی', dir: 'rtl' },
  { code: 'ur', name: 'اردو', dir: 'rtl' },
  { code: 'tl', name: 'Tagalog', dir: 'ltr' },
  { code: 'es', name: 'Español', dir: 'ltr' },
  { code: 'vi', name: 'Tiếng Việt', dir: 'ltr' },
  { code: 'ja', name: '日本語', dir: 'ltr' },
  { code: 'ko', name: '한국어', dir: 'ltr' },
  { code: 'ar', name: 'العربية', dir: 'rtl' },
  { code: 'de', name: 'Deutsch', dir: 'ltr' },
  { code: 'tr', name: 'Türkçe', dir: 'ltr' },
  { code: 'pt-BR', name: 'Português (Brasil)', dir: 'ltr' },
  { code: 'hi', name: 'हिन्दी', dir: 'ltr' },
  { code: 'id', name: 'Bahasa Indonesia', dir: 'ltr' },
  { code: 'th', name: 'ไทย', dir: 'ltr' },
  { code: 'it', name: 'Italiano', dir: 'ltr' },
  { code: 'nl', name: 'Nederlands', dir: 'ltr' },
  { code: 'pl', name: 'Polski', dir: 'ltr' },
  { code: 'cs', name: 'Čeština', dir: 'ltr' },
  { code: 'no', name: 'Norsk', dir: 'ltr' },
  { code: 'uk', name: 'Українська', dir: 'ltr' },
  { code: 'hu', name: 'Magyar', dir: 'ltr' },
  { code: 'sv', name: 'Svenska', dir: 'ltr' },
  { code: 'ro', name: 'Română', dir: 'ltr' },
  { code: 'el', name: 'Ελληνικά', dir: 'ltr' },
  { code: 'da', name: 'Dansk', dir: 'ltr' },
  { code: 'fi', name: 'Suomi', dir: 'ltr' },
  { code: 'he', name: 'עברית', dir: 'rtl' },
  { code: 'sk', name: 'Slovenčina', dir: 'ltr' },
  { code: 'bg', name: 'Български', dir: 'ltr' },
  { code: 'hr', name: 'Hrvatski', dir: 'ltr' },
  { code: 'sr', name: 'Српски', dir: 'ltr' },
  { code: 'lt', name: 'Lietuvių', dir: 'ltr' },
  { code: 'bn', name: 'বাংলা', dir: 'ltr' },
  { code: 'ms', name: 'Bahasa Melayu', dir: 'ltr' },
  { code: 'ta', name: 'தமிழ்', dir: 'ltr' },
];

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

export const DEFAULT_LANG = 'en';

export function getLanguage(code: string): LanguageDef {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

export function dirOf(code: string): Direction {
  return getLanguage(code).dir;
}

/**
 * Languages the translation worker delivered a COMPLETE UI dictionary for.
 * Everything else falls back to English per-key at runtime.
 */
export const RTL_LANGUAGES = LANGUAGES.filter((l) => l.dir === 'rtl').map((l) => l.code);
