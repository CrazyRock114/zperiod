import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { DEFAULT_LANG, LANGUAGES, getLanguage, type Direction } from './languages';
import { ELEMENT_NAMES, UI_DICTIONARIES } from './registry';
import { useStore } from '../state/store';

/* ------------------------------------------------------------------ */
/* Dictionaries                                                        */
/* ------------------------------------------------------------------ */

const dictCache = new Map<string, Record<string, string>>();
const nameCache = new Map<string, Record<string, string>>();

async function loadDict(code: string): Promise<Record<string, string> | null> {
  if (dictCache.has(code)) return dictCache.get(code)!;
  const loader = UI_DICTIONARIES[code];
  if (!loader) return null;
  try {
    const mod = await loader();
    const d = mod.default as Record<string, string>;
    dictCache.set(code, d);
    return d;
  } catch (err) {
    console.warn(`[i18n] failed to load UI dictionary for "${code}"`, err);
    dictCache.set(code, {});
    return {};
  }
}

async function loadNames(code: string): Promise<Record<string, string> | null> {
  if (nameCache.has(code)) return nameCache.get(code)!;
  const loader = ELEMENT_NAMES[code];
  if (!loader) return null;
  try {
    const mod = await loader();
    const d = mod.default as Record<string, string>;
    nameCache.set(code, d);
    return d;
  } catch (err) {
    console.warn(`[i18n] failed to load element names for "${code}"`, err);
    nameCache.set(code, {});
    return {};
  }
}

/** Last-resort rendering so a missing key never shows up as a raw slug. */
function humanize(key: string): string {
  const last = key.split('.').pop() ?? key;
  return last
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

const PLACEHOLDER = /\{([a-zA-Z0-9_]+)\}/g;

/**
 * Substitute `{name}` slots. A slot with no supplied value is DROPPED rather
 * than left in place: a dictionary that documents a slot the call site does
 * not fill would otherwise render literal "{n}" to the user. In dev we warn so
 * the real bug still surfaces.
 */
function interpolate(template: string, vars?: Record<string, string | number>, key?: string): string {
  if (!template.includes('{')) return template;
  const missing: string[] = [];
  const out = template.replace(PLACEHOLDER, (m, name: string) => {
    if (vars && name in vars) return String(vars[name]);
    missing.push(name);
    return '';
  });
  if (import.meta.env?.DEV && missing.length) {
    console.warn(`[i18n] ${key ?? template}: unfilled placeholder(s) ${missing.join(', ')}`);
  }
  return out.replace(/\s{2,}/g, ' ').trim();
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

export type TFunc = (key: string, vars?: Record<string, string | number>) => string;

/**
 * Translate with an explicit fallback.
 *
 * Used for lesson content, which ships its own English copy alongside the key
 * (see `Lesson.questions[].text`). If a locale has not translated the lesson
 * yet, the student still reads real teaching material instead of a humanised
 * slug — and once a translation lands, the dictionary wins automatically.
 */
export type TFuncFallback = (key: string, fallback: string, vars?: Record<string, string | number>) => string;

interface I18nValue {
  t: TFunc;
  tf: TFuncFallback;
  lang: string;
  locale: string;
  dir: Direction;
  /** Localized element name, falling back to the English name from the data file. */
  elementName: (atomicNumber: number, fallback: string) => string;
  /** Format a number in the active locale. */
  num: (v: number, opts?: Intl.NumberFormatOptions) => string;
  /** Date as YYYY-MM-DD for `<input type="date">`. */
  dateISO: () => string;
  ready: boolean;
}

const Ctx = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useStore();
  const [dict, setDict] = useState<Record<string, string>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const gen = useRef(0);

  useEffect(() => {
    const mine = ++gen.current;
    let alive = true;

    (async () => {
      // The English dictionary is ALWAYS the base layer, including when the
      // active language is English — otherwise an English session falls back
      // to humanised keys for every string ("app.name" -> "Name").
      const [mine_dict, en_dict, mine_names] = await Promise.all([
        lang === DEFAULT_LANG ? Promise.resolve(null) : loadDict(lang),
        loadDict(DEFAULT_LANG),
        loadNames(lang),
      ]);
      if (!alive || mine !== gen.current) return;

      // Merge once: locale over English, so a partial translation still renders.
      const merged: Record<string, string> = { ...(en_dict ?? {}), ...(mine_dict ?? {}) };
      setDict(merged);
      setNames(mine_names ?? {});
      setReady(true);
    })();

    return () => {
      alive = false;
    };
  }, [lang]);

  const def = useMemo(() => getLanguage(lang), [lang]);

  const t = useCallback<TFunc>(
    (key, vars) => {
      const v = dict[key];
      if (typeof v === 'string' && v.length) return interpolate(v, vars, key);
      return interpolate(humanize(key), vars, key);
    },
    [dict],
  );

  const tf = useCallback<TFuncFallback>(
    (key, fallback, vars) => {
      const v = dict[key];
      if (typeof v === 'string' && v.length) return interpolate(v, vars, key);
      return interpolate(fallback, vars, key);
    },
    [dict],
  );

  const elementName = useCallback(
    (z: number, fallback: string) => {
      const v = names[String(z)];
      return typeof v === 'string' && v.length ? v : fallback;
    },
    [names],
  );

  const num = useCallback(
    (v: number, opts?: Intl.NumberFormatOptions) => {
      try {
        return new Intl.NumberFormat(lang, opts).format(v);
      } catch {
        return String(v);
      }
    },
    [lang],
  );

  const value = useMemo<I18nValue>(
    () => ({
      t,
      tf,
      lang,
      locale: lang,
      dir: def.dir,
      elementName,
      num,
      dateISO: () => new Date().toISOString().slice(0, 10),
      ready,
    }),
    [t, tf, lang, def.dir, elementName, num, ready],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n must be used inside <I18nProvider>');
  return v;
}

/** Re-export so components can import from one place. */
export { LANGUAGES, getLanguage };
export type { Direction };
