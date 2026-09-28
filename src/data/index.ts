import { useEffect, useMemo, useRef, useState } from 'react';
import type { Element, ElementCategory, Ion, Phase, SolubilityRule } from '../types/chem';

/* ------------------------------------------------------------------ */
/* Category metadata                                                   */
/* ------------------------------------------------------------------ */

export interface CategoryMeta {
  key: ElementCategory;
  /** CSS custom property, e.g. "var(--c-halogen)". */
  color: string;
  /** i18n key for the label. */
  labelKey: string;
}

/** Display order matters: it drives the legend and the filter bar. */
export const CATEGORIES: CategoryMeta[] = [
  { key: 'alkali-metal', color: 'var(--c-alkali)', labelKey: 'category.alkali-metal' },
  { key: 'alkaline-earth-metal', color: 'var(--c-alkaline)', labelKey: 'category.alkaline-earth-metal' },
  { key: 'transition-metal', color: 'var(--c-transition)', labelKey: 'category.transition-metal' },
  { key: 'post-transition-metal', color: 'var(--c-post)', labelKey: 'category.post-transition-metal' },
  { key: 'metalloid', color: 'var(--c-metalloid)', labelKey: 'category.metalloid' },
  { key: 'nonmetal', color: 'var(--c-nonmetal)', labelKey: 'category.nonmetal' },
  { key: 'halogen', color: 'var(--c-halogen)', labelKey: 'category.halogen' },
  { key: 'noble-gas', color: 'var(--c-noble)', labelKey: 'category.noble-gas' },
  { key: 'lanthanide', color: 'var(--c-lanthanide)', labelKey: 'category.lanthanide' },
  { key: 'actinide', color: 'var(--c-actinide)', labelKey: 'category.actinide' },
  { key: 'unknown', color: 'var(--c-unknown)', labelKey: 'category.unknown' },
];

const CATEGORY_MAP = new Map(CATEGORIES.map((c) => [c.key, c]));

export function categoryColor(cat: ElementCategory): string {
  return CATEGORY_MAP.get(cat)?.color ?? 'var(--c-unknown)';
}

export function categoryLabelKey(cat: ElementCategory): string {
  return CATEGORY_MAP.get(cat)?.labelKey ?? 'category.unknown';
}

/** Blend a category colour toward the surface so text stays readable. */
export function categorySurface(cat: ElementCategory, dark: boolean): string {
  const hex = RESOLVED[cat] ?? '#98a0b8';
  return dark ? withAlpha(hex, 0.2) : withAlpha(hex, 0.26);
}

const RESOLVED: Partial<Record<ElementCategory, string>> = {
  'alkali-metal': '#ff6b6b',
  'alkaline-earth-metal': '#ff9f43',
  'transition-metal': '#f5c518',
  'post-transition-metal': '#4bb8d8',
  metalloid: '#2bb98a',
  nonmetal: '#17b0a6',
  halogen: '#4d8ef0',
  'noble-gas': '#7c5cf0',
  lanthanide: '#e05fc4',
  actinide: '#e2564f',
  unknown: '#98a0b8',
};

export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Readable text colour on top of a category colour. */
export function textOn(cat: ElementCategory, dark: boolean): string {
  return dark ? '#eef1fa' : '#14182a';
}

/* ------------------------------------------------------------------ */
/* Phase helpers                                                       */
/* ------------------------------------------------------------------ */

export const PHASE_LABEL_KEY: Record<Phase, string> = {
  solid: 'phase.solid',
  liquid: 'phase.liquid',
  gas: 'phase.gas',
  plasma: 'phase.plasma',
  unknown: 'phase.unknown',
};

/* ------------------------------------------------------------------ */
/* Grid layout                                                         */
/* ------------------------------------------------------------------ */

export const GRID_COLS = 18;
export const GRID_ROWS = 10;

export interface GridSlot {
  row: number;
  col: number;
}

/**
 * Map an element to its cell in the classic 10×18 grid.
 * Rows 9 and 10 hold the detached f-block (lanthanides / actinides).
 */
export function slotFor(e: Element): GridSlot {
  if (e.atomicNumber >= 57 && e.atomicNumber <= 71) {
    return { row: 9, col: 3 + (e.atomicNumber - 57) };
  }
  if (e.atomicNumber >= 89 && e.atomicNumber <= 103) {
    return { row: 10, col: 3 + (e.atomicNumber - 89) };
  }
  return { row: e.period, col: e.group };
}

/** Group headers and the f-block markers rendered above the grid. */
export const GROUP_HEADERS: Array<number | null> = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
];

export const PERIOD_LABELS: Array<number | null> = [1, 2, 3, 4, 5, 6, 7, null, null, null];

/* ------------------------------------------------------------------ */
/* Loading                                                             */
/* ------------------------------------------------------------------ */

type LoadState<T> = { data: T | null; loading: boolean; error: string | null };

/**
 * Code-splits a JSON chunk and extracts a single field from it.
 *
 * The `loader` stays a static specifier so Vite can split it; only the
 * extraction is late.
 *
 * IMPORTANT: the loader is a new arrow function on every render, so it cannot
 * be used directly as an effect dependency. Guarding with a `started` ref plus
 * an `alive` flag was subtly wrong: any re-render between mount and the chunk
 * resolving ran the first cleanup, set `alive = false`, and the resolution
 * handler then returned without ever calling setState — leaving the view
 * spinning forever until the user reloaded. A generation counter gives the
 * same stale-result protection without cancelling a load that is still valid.
 */
function useLazyJson<T>(
  loader: () => Promise<{ default: unknown }>,
  pick: (mod: { default: unknown }) => T[] | null,
): LoadState<T[]> {
  const [state, setState] = useState<LoadState<T[]>>({ data: null, loading: true, error: null });
  const generation = useRef(0);

  useEffect(() => {
    const mine = ++generation.current;
    loader()
      .then((mod) => {
        if (mine !== generation.current) return;
        const picked = pick(mod);
        setState({ data: picked, loading: false, error: picked ? null : 'empty dataset' });
      })
      .catch((err: unknown) => {
        if (mine !== generation.current) return;
        console.error('[data] load failed', err);
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : String(err),
        });
      });
  }, [loader, pick]);

  return state;
}

const pickElements = (m: { default: unknown }) =>
  ((m as { default: { elements?: Element[] } }).default?.elements ?? null) as Element[] | null;
const pickIons = (m: { default: unknown }) =>
  ((m as { default: { ions?: Ion[] } }).default?.ions ?? null) as Ion[] | null;
const pickRules = (m: { default: unknown }) =>
  ((m as { default: { rules?: SolubilityRule[] } }).default?.rules ?? null) as SolubilityRule[] | null;

/**
 * The 118-element dataset, code-split so the landing page doesn't pay for it.
 */
export function useElements() {
  return useLazyJson<Element>(() => import('./elements.json'), pickElements);
}

export function useIons() {
  return useLazyJson<Ion>(() => import('./ions.json'), pickIons);
}

export function useSolubilityRules() {
  return useLazyJson<SolubilityRule>(() => import('./solubility.json'), pickRules);
}

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

export interface ElementIndex {
  all: Element[];
  byZ: Map<number, Element>;
  bySymbol: Map<string, Element>;
  byName: Map<string, Element>;
  slots: Map<number, GridSlot>;
  categories: ElementCategory[];
}

export function indexElements(all: Element[]): ElementIndex {
  const byZ = new Map<number, Element>();
  const bySymbol = new Map<string, Element>();
  const byName = new Map<string, Element>();
  const slots = new Map<number, GridSlot>();
  const cats = new Set<ElementCategory>();

  for (const e of all) {
    byZ.set(e.atomicNumber, e);
    bySymbol.set(e.symbol.toLowerCase(), e);
    byName.set(e.name.toLowerCase(), e);
    slots.set(e.atomicNumber, slotFor(e));
    cats.add(e.category);
  }
  return {
    all,
    byZ,
    bySymbol,
    byName,
    slots,
    categories: CATEGORIES.map((c) => c.key).filter((c) => cats.has(c)),
  };
}

export function indexIons(all: Ion[]) {
  const byId = new Map<string, Ion>();
  const byElement = new Map<number, Ion[]>();
  for (const i of all) {
    byId.set(i.id, i);
    const list = byElement.get(i.atomicNumber) ?? [];
    list.push(i);
    byElement.set(i.atomicNumber, list);
  }
  return { all, byId, byElement };
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

export interface Filters {
  query: string;
  categories: Set<ElementCategory>;
  phases: Set<Phase>;
  blocks: Set<string>;
  groups: Set<number>;
  periods: Set<number>;
  favoritesOnly: boolean;
}

export const EMPTY_FILTERS: Filters = {
  query: '',
  categories: new Set(),
  phases: new Set(),
  blocks: new Set(),
  groups: new Set(),
  periods: new Set(),
  favoritesOnly: false,
};

export function filtersActive(f: Filters): boolean {
  return (
    f.query.trim().length > 0 ||
    f.categories.size > 0 ||
    f.phases.size > 0 ||
    f.blocks.size > 0 ||
    f.groups.size > 0 ||
    f.periods.size > 0 ||
    f.favoritesOnly
  );
}

export function countActiveFilters(f: Filters): number {
  return (
    (f.query.trim() ? 1 : 0) +
    f.categories.size +
    f.phases.size +
    f.blocks.size +
    f.groups.size +
    f.periods.size +
    (f.favoritesOnly ? 1 : 0)
  );
}

/** Fuzzy-ish matcher: exact → prefix → substring → symbol → atomic number. */
export function matchesQuery(e: Element, qRaw: string, localName?: string): boolean {
  const q = qRaw.trim().toLowerCase();
  if (!q) return true;
  const name = (localName ?? e.name).toLowerCase();
  const sym = e.symbol.toLowerCase();
  if (sym === q) return true;
  if (String(e.atomicNumber) === q) return true;
  if (name === q) return true;
  if (name.startsWith(q)) return true;
  if (sym.startsWith(q)) return true;
  if (name.includes(q)) return true;
  // "lead82" / "fe26" — tolerate a trailing atomic number
  const m = q.match(/^(.*?)(\d{1,3})$/);
  if (m) {
    const base = m[1];
    const z = Number(m[2]);
    if (e.atomicNumber === z && (base === '' || name.startsWith(base) || sym.startsWith(base))) return true;
  }
  return false;
}

export function applyFilters(
  elements: Element[],
  f: Filters,
  favorites: number[],
  localName: (z: number, fallback: string) => string,
): Set<number> {
  const favs = new Set(favorites);
  const out = new Set<number>();
  for (const e of elements) {
    if (f.categories.size && !f.categories.has(e.category)) continue;
    if (f.phases.size && !f.phases.has(e.phase)) continue;
    if (f.blocks.size && !f.blocks.has(e.block)) continue;
    if (f.groups.size && !f.groups.has(e.group)) continue;
    if (f.periods.size && !f.periods.has(e.period)) continue;
    if (f.favoritesOnly && !favs.has(e.atomicNumber)) continue;
    if (f.query.trim() && !matchesQuery(e, f.query, localName(e.atomicNumber, e.name))) continue;
    out.add(e.atomicNumber);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Derived helpers                                                     */
/* ------------------------------------------------------------------ */

/** Most common isotope mass number, used for the neutron count in 3D. */
export function defaultNeutrons(e: Element): number {
  const stable = e.isotopes?.find((i) => i.stable);
  if (stable) return stable.massNumber - e.atomicNumber;
  const byMass = [...(e.isotopes ?? [])].sort((a, b) => a.massNumber - b.massNumber)[0];
  if (byMass) return byMass.massNumber - e.atomicNumber;
  if (e.massNumberOfMostStable) return e.massNumberOfMostStable - e.atomicNumber;
  return Math.round(e.atomicNumber * 0.5);
}

export function useElementStats(elements: Element[] | null) {
  return useMemo(() => {
    if (!elements) return null;
    const withImage = elements.filter((e) => e.imageUrl).length;
    const withUses = elements.filter((e) => e.uses).length;
    return {
      total: elements.length,
      liquids: elements.filter((e) => e.phase === 'liquid').length,
      gases: elements.filter((e) => e.phase === 'gas').length,
      withImage,
      withUses,
    };
  }, [elements]);
}
