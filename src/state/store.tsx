import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DEFAULT_LAYOUT,
  DEFAULT_UNITS,
  type FeedbackEntry,
  type LayoutPrefs,
  type ReviewCard,
  type UnitPrefs,
} from '../types/chem';
import { DEFAULT_LANG, LANGUAGES } from '../i18n/languages';

const STORAGE_KEY = 'zperiod.v1';
const SCHEMA_VERSION = 1;

export type ThemeMode = 'light' | 'dark' | 'system';

export interface PersistedState {
  version: number;
  lang: string;
  theme: ThemeMode;
  units: UnitPrefs;
  layout: LayoutPrefs;
  favorites: number[];
  reduceMotion: boolean;
  reduce3d: boolean;
  seenLanding: boolean;
  lastElement: number | null;
  review: Record<string, ReviewCard>;
  lessonsDone: string[];
  feedback: FeedbackEntry[];
  toolToursSeen: string[];
}

const INITIAL: PersistedState = {
  version: SCHEMA_VERSION,
  lang: DEFAULT_LANG,
  theme: 'system',
  units: DEFAULT_UNITS,
  layout: DEFAULT_LAYOUT,
  favorites: [],
  reduceMotion: false,
  reduce3d: false,
  seenLanding: false,
  lastElement: null,
  review: {},
  lessonsDone: [],
  feedback: [],
  toolToursSeen: [],
};

function loadState(): PersistedState {
  if (typeof localStorage === 'undefined') return INITIAL;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return detectDefaults();
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (parsed.version !== SCHEMA_VERSION) return detectDefaults();
    return {
      ...INITIAL,
      ...parsed,
      // Defensive: never let a bad blob crash the app.
      units: { ...DEFAULT_UNITS, ...(parsed.units ?? {}) },
      layout: {
        ...DEFAULT_LAYOUT,
        ...(parsed.layout ?? {}),
        cellFields: { ...DEFAULT_LAYOUT.cellFields, ...(parsed.layout?.cellFields ?? {}) },
        gapRows: Array.isArray(parsed.layout?.gapRows) ? parsed.layout!.gapRows : [],
        gapCols: Array.isArray(parsed.layout?.gapCols) ? parsed.layout!.gapCols : [],
      },
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      review: parsed.review ?? {},
      lessonsDone: Array.isArray(parsed.lessonsDone) ? parsed.lessonsDone : [],
      feedback: Array.isArray(parsed.feedback) ? parsed.feedback : [],
      toolToursSeen: Array.isArray(parsed.toolToursSeen) ? parsed.toolToursSeen : [],
    };
  } catch {
    return detectDefaults();
  }
}

/** First-run: honour the browser locale if we ship that language. */
function detectDefaults(): PersistedState {
  if (typeof navigator === 'undefined') return INITIAL;
  const nav = navigator.language || 'en';
  const exact = LANGUAGES.find((l) => l.code.toLowerCase() === nav.toLowerCase());
  if (exact) return { ...INITIAL, lang: exact.code };
  const base = nav.split('-')[0].toLowerCase();
  const loose = LANGUAGES.find((l) => l.code.split('-')[0].toLowerCase() === base);
  return { ...INITIAL, lang: loose ? loose.code : DEFAULT_LANG };
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

interface Store extends PersistedState {
  setLang: (c: string) => void;
  setTheme: (t: ThemeMode) => void;
  setUnits: (u: Partial<UnitPrefs>) => void;
  setLayout: (l: Partial<LayoutPrefs>) => void;
  resetLayout: () => void;
  toggleFavorite: (z: number) => void;
  isFavorite: (z: number) => boolean;
  setReduceMotion: (v: boolean) => void;
  setReduce3d: (v: boolean) => void;
  markLandingSeen: () => void;
  setLastElement: (z: number | null) => void;
  reviewCard: (z: number) => ReviewCard;
  gradeReview: (z: number, quality: 0 | 1 | 2 | 3) => void;
  markLessonDone: (id: string) => void;
  addFeedback: (f: Omit<FeedbackEntry, 'id' | 'createdAt' | 'status'>) => void;
  markTourSeen: (id: string) => void;
  exportAll: () => string;
  importAll: (json: string) => boolean;
  clearAll: () => void;
}

const Ctx = createContext<Store | null>(null);

const today = () => new Date().toISOString().slice(0, 10);

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(loadState);
  const first = useRef(true);

  // Actions must keep a STABLE identity for the lifetime of the provider.
  // Reading state through a ref instead of closing over it means a component
  // can safely list e.g. `setLastElement` in a dependency array: an unstable
  // action would re-run the effect on every state change, and if that effect
  // writes state you get an infinite render loop.
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota or private mode — the app still works, it just won't remember */
    }
  }, [state]);

  // ---- theme ------------------------------------------------------------
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = state.theme === 'dark' || (state.theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [state.theme]);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = state.reduceMotion ? 'auto' : '';
  }, [state.reduceMotion]);

  // ---- language ---------------------------------------------------------
  useEffect(() => {
    const def = LANGUAGES.find((l) => l.code === state.lang) ?? LANGUAGES[0];
    document.documentElement.lang = def.code;
    document.documentElement.dir = def.dir;
  }, [state.lang]);

  const patch = useCallback((p: Partial<PersistedState>) => {
    setState((s) => ({ ...s, ...p }));
  }, []);

  const setLang = useCallback((lang: string) => patch({ lang }), [patch]);
  const setTheme = useCallback((theme: ThemeMode) => patch({ theme }), [patch]);
  const setUnits = useCallback((u: Partial<UnitPrefs>) => {
    setState((s) => ({ ...s, units: { ...s.units, ...u } }));
  }, []);
  const setLayout = useCallback((l: Partial<LayoutPrefs>) => {
    setState((s) => ({
      ...s,
      layout: {
        ...s.layout,
        ...l,
        cellFields: { ...s.layout.cellFields, ...(l.cellFields ?? {}) },
      },
    }));
  }, []);
  const resetLayout = useCallback(() => patch({ layout: DEFAULT_LAYOUT }), [patch]);
  const setReduceMotion = useCallback((v: boolean) => patch({ reduceMotion: v }), [patch]);
  const setReduce3d = useCallback((v: boolean) => patch({ reduce3d: v }), [patch]);
  const markLandingSeen = useCallback(() => patch({ seenLanding: true }), [patch]);
  const setLastElement = useCallback((z: number | null) => patch({ lastElement: z }), [patch]);

  const isFavorite = useCallback(
    (z: number) => stateRef.current.favorites.includes(z),
    [],
  );

  const toggleFavorite = useCallback((z: number) => {
    setState((s) => ({
      ...s,
      favorites: s.favorites.includes(z)
        ? s.favorites.filter((x) => x !== z)
        : [...s.favorites, z].sort((a, b) => a - b),
    }));
  }, []);

  const reviewCard = useCallback((z: number): ReviewCard => {
    const existing = stateRef.current.review[String(z)];
    if (existing) return existing;
    return { atomicNumber: z, ease: 2.5, interval: 0, lastReviewed: null, reps: 0, lapses: 0 };
  }, []);

  // SM-2 lite: quality 0-3, intervals 1 → 3 → round(ease * prev).
  const gradeReview = useCallback((z: number, quality: 0 | 1 | 2 | 3) => {
    setState((s) => {
      const key = String(z);
      const card =
        s.review[key] ??
        ({ atomicNumber: z, ease: 2.5, interval: 0, lastReviewed: null, reps: 0, lapses: 0 } as ReviewCard);
      const passed = quality >= 2;
      const ease = Math.max(
        1.3,
        Math.min(3.0, card.ease + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02))),
      );
      let interval: number;
      if (!passed) interval = 0; // back into the learning pile today
      else if (card.reps === 0) interval = 1;
      else if (card.reps === 1) interval = 3;
      else interval = Math.max(1, Math.round(ease * card.interval));
      return {
        ...s,
        review: {
          ...s.review,
          [key]: {
            atomicNumber: z,
            ease,
            interval,
            lastReviewed: today(),
            reps: passed ? card.reps + 1 : 0,
            lapses: passed ? card.lapses : card.lapses + 1,
          },
        },
      };
    });
  }, []);

  const markLessonDone = useCallback((id: string) => {
    setState((s) => (s.lessonsDone.includes(id) ? s : { ...s, lessonsDone: [...s.lessonsDone, id] }));
  }, []);

  const addFeedback = useCallback((f: Omit<FeedbackEntry, 'id' | 'createdAt' | 'status'>) => {
    setState((s) => ({
      ...s,
      feedback: [
        {
          ...f,
          id: `fb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
          createdAt: new Date().toISOString(),
          status: 'new' as const,
        },
        ...s.feedback,
      ].slice(0, 200),
    }));
  }, []);

  const markTourSeen = useCallback((id: string) => {
    setState((s) =>
      s.toolToursSeen.includes(id) ? s : { ...s, toolToursSeen: [...s.toolToursSeen, id].slice(-50) },
    );
  }, []);

  const exportAll = useCallback(() => JSON.stringify(stateRef.current, null, 2), []);

  const importAll = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json) as Partial<PersistedState>;
      if (!parsed || typeof parsed !== 'object' || !('lang' in parsed)) return false;
      setState({ ...loadState(), ...parsed, version: SCHEMA_VERSION });
      return true;
    } catch {
      return false;
    }
  }, []);

  const clearAll = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setState(detectDefaults());
  }, []);

  const value = useMemo<Store>(
    () => ({
      ...state,
      setLang,
      setTheme,
      setUnits,
      setLayout,
      resetLayout,
      toggleFavorite,
      isFavorite,
      setReduceMotion,
      setReduce3d,
      markLandingSeen,
      setLastElement,
      reviewCard,
      gradeReview,
      markLessonDone,
      addFeedback,
      markTourSeen,
      exportAll,
      importAll,
      clearAll,
    }),
    [
      state,
      setLang,
      setTheme,
      setUnits,
      setLayout,
      resetLayout,
      toggleFavorite,
      isFavorite,
      setReduceMotion,
      setReduce3d,
      markLandingSeen,
      setLastElement,
      reviewCard,
      gradeReview,
      markLessonDone,
      addFeedback,
      markTourSeen,
      exportAll,
      importAll,
      clearAll,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside <StoreProvider>');
  return v;
}

/** Cards that are due today, plus the ones never seen. */
export function useDueReviews(): { due: number[]; learning: number[] } {
  const { review } = useStore();
  return useMemo(() => {
    const now = today();
    const due: number[] = [];
    const learning: number[] = [];
    for (const [k, card] of Object.entries(review)) {
      if (!card.lastReviewed || card.interval === 0) learning.push(card.atomicNumber);
      else if (daysBetween(card.lastReviewed, now) >= card.interval) due.push(card.atomicNumber);
    }
    return { due: due.sort((a, b) => a - b), learning: learning.sort((a, b) => a - b) };
  }, [review]);
}
