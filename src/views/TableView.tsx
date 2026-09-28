import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { useStore, useDueReviews } from '../state/store';
import {
  CATEGORIES,
  EMPTY_FILTERS,
  Filters,
  applyFilters,
  countActiveFilters,
  filtersActive,
  indexElements,
  useElements,
  useIons,
} from '../data';
import type { ElementCategory, Phase } from '../types/chem';
import { PeriodicTable } from '../components/PeriodicTable';
import { ElementDetail } from '../components/ElementDetail';
import { CompareTray } from '../components/CompareTray';
import type { Route } from '../router';
import { fmt } from '../lib/units';

const PHASES: Phase[] = ['solid', 'liquid', 'gas', 'plasma', 'unknown'];
const BLOCKS = ['s', 'p', 'd', 'f'];

export function TableView({
  navigate,
  initialElement,
}: {
  navigate: (r: Route) => void;
  initialElement?: number;
}) {
  const { t, elementName, num } = useI18n();
  const { data: elements, loading, error } = useElements();
  const { data: ions } = useIons();
  const { lastElement, favorites, layout, setLayout, resetLayout } = useStore();
  const { due, learning } = useDueReviews();

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<number | null>(initialElement ?? null);
  const [compare, setCompare] = useState<number[]>([]);
  const [showLayout, setShowLayout] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hScroll, setHScroll] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Show the edge fade only while the table actually overflows sideways.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setHScroll(el.scrollWidth > el.clientWidth + 2);
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(onScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, []);
  const [panelOpen, setPanelOpen] = useState(false);

  // Deep-link #/table?e=26
  useEffect(() => {
    if (initialElement) {
      setSelected(initialElement);
      setPanelOpen(true);
    }
  }, [initialElement]);

  // Restore the last element the user looked at.
  useEffect(() => {
    if (!initialElement && lastElement && !selected) setSelected(lastElement);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const index = useMemo(() => (elements ? indexElements(elements) : null), [elements]);

  const matched = useMemo(() => {
    if (!elements) return new Set<number>();
    return applyFilters(elements, filters, favorites, (z, fb) => elementName(z, fb));
  }, [elements, filters, favorites, elementName]);

  const select = useCallback(
    (z: number) => {
      setSelected((prev) => (prev === z ? (setPanelOpen(false), null) : z));
      setPanelOpen(true);
      // Keep the URL shareable without spamming history.
      history.replaceState(null, '', `#/table?e=${z}`);
    },
    [],
  );

  const toggleCompare = useCallback((z: number) => {
    setCompare((c) => (c.includes(z) ? c.filter((x) => x !== z) : c.length >= 4 ? c : [...c, z]));
  }, []);

  const active = filtersActive(filters);
  const selectedEl = selected && elements ? elements.find((e) => e.atomicNumber === selected) ?? null : null;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--surface-3)] border-t-[var(--accent)]" />
          <p className="muted text-sm">{t('app.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !elements || !index) {
    return (
      <div className="mx-auto max-w-lg p-10 text-center">
        <p className="text-3xl">⚠️</p>
        <p className="mt-2 text-sm font-bold">{t('app.error')}</p>
        <p className="muted mt-1 text-xs">{error ?? 'dataset unavailable'}</p>
        <button className="btn btn-primary mt-4" onClick={() => location.reload()}>
          {t('app.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1800px] items-start gap-4 px-3 py-5 sm:px-5">
      <div className="min-w-0 flex-1">
      {/* toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <input
            className="input ps-9"
            data-testid="table-search"
            placeholder={t('table.search')}
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            aria-label={t('table.search')}
          />
          <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 faint">⌕</span>
        </div>

        <button
          className={`btn h-10 text-xs ${active ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setFilters(EMPTY_FILTERS)}
          data-testid="clear-filters"
        >
          {active ? `${t('table.filter.all')} · ${countActiveFilters(filters)}` : t('table.filter.all')}
        </button>

        <button
          className={`btn h-10 text-xs ${showLayout ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setShowLayout((v) => !v)}
          aria-expanded={showLayout}
        >
          ⚙ {t('table.layout')}
        </button>

        <button className="btn btn-ghost h-10 text-xs" onClick={() => window.print()}>
          {t('table.print')}
        </button>

        {(due.length > 0 || learning.length > 0) && (
          <button className="btn btn-subtle h-10 text-xs" onClick={() => navigate({ name: 'learn' })}>
            ✦ {t('learn.dueNow')} {num(due.length + learning.length)}
          </button>
        )}
      </div>

      {/* filters — collapsed by default on narrow screens, because the group
          row alone is 18 chips and pushed the table off the first screen. */}
      <div className="hidden lg:block">
        <FilterBar filters={filters} setFilters={setFilters} />
      </div>
      <div className="lg:hidden">
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          collapsible
          open={filtersOpen}
          onToggle={() => setFiltersOpen((v) => !v)}
        />
      </div>

      {/* layout customiser */}
      {showLayout && (
        <LayoutPanel
          layout={layout}
          setLayout={setLayout}
          resetLayout={resetLayout}
          onClose={() => setShowLayout(false)}
        />
      )}

      {/* the table — the wrapper is the container-query context the card type
          scale is measured against, so it has to be the element that actually
          defines the available width, not the table itself. */}
      <div
        ref={scrollRef}
        className="thin-scroll scroll-hint -mx-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0"
      >
        <div className="ptable-wrap" data-overflowing={String(hScroll)}>
        <PeriodicTable
          elements={elements}
          matched={matched}
          filters={filters}
          selected={selected}
          onSelect={select}
          emptyState={
            <div>
              <p className="text-3xl">🔍</p>
              <p className="mt-2 text-sm font-bold">{t('app.noResults')}</p>
              <p className="muted mt-1 text-xs">
                {num(elements.length)} elements indexed · {num(favorites.length)} ★
              </p>
            </div>
          }
        />
        </div>
      </div>

      {/* quick stats strip */}
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QuickStat label={t('landing.stats.elements')} value={num(elements.length)} />
        <QuickStat label={t('landing.stats.ions')} value={ions ? num(ions.length) : '—'} />
        <QuickStat label={t('table.filter.favorites')} value={num(favorites.length)} />
        <QuickStat
          label={t('phase.liquid')}
          value={num(elements.filter((e) => e.phase === 'liquid').length)}
        />
      </div>
      </div>

      {/* ---- element detail ----
          Below `xl` it is a full-screen sheet. From `xl` up it DOCKS as a
          sibling column, so the table shrinks instead of being covered — an
          overlay was hiding the rightmost columns (group 18), and its
          z-index sat *below* the sticky nav, which clipped its header. */}
      {panelOpen && selectedEl && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/45 xl:hidden"
            onClick={() => setPanelOpen(false)}
            aria-hidden
          />
          <aside
            className="thin-scroll fixed inset-0 z-50 overflow-y-auto p-4 shadow-2xl xl:sticky xl:top-[4.5rem] xl:z-10 xl:max-h-[calc(100vh-5.5rem)] xl:w-[26rem] xl:shrink-0 xl:overflow-y-auto xl:rounded-2xl xl:p-4"
            style={{
              background: 'var(--surface-1)',
              borderInlineStart: '1px solid var(--border)',
            }}
            role="dialog"
            aria-label={t('element.details')}
          >
            <ElementDetail
              element={selectedEl}
              onClose={() => {
                setPanelOpen(false);
                history.replaceState(null, '', '#/table');
              }}
              onCompare={toggleCompare}
            />
          </aside>
        </>
      )}

      {/* compare tray */}
      <CompareTray
        atomicNumbers={compare}
        elements={elements}
        onRemove={toggleCompare}
        onClear={() => setCompare([])}
        onOpen={(z) => {
          select(z);
          setPanelOpen(true);
        }}
      />

    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Filter bar                                                          */
/* ------------------------------------------------------------------ */

type SetKey = 'categories' | 'phases' | 'blocks' | 'groups' | 'periods';

function FilterBar({
  filters,
  setFilters,
  collapsible,
  open,
  onToggle,
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  const { t } = useI18n();

  /**
   * Toggle one value inside one of the filter's Set columns. Widened to
   * `string | number` because a Set<ElementCategory> and a Set<number> cannot
   * share a generic signature without collapsing to `never`.
   */
  const toggle = (key: SetKey, value: string | number) => {
    setFilters((f) => {
      const s = new Set(f[key] as Set<string | number>);
      if (s.has(value)) s.delete(value);
      else s.add(value);
      return { ...f, [key]: s } as Filters;
    });
  };

  const body = (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="me-1 text-[11.5px] font-bold uppercase tracking-wide faint">
          {t('table.filter.category')}
        </span>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            data-testid={`cat-${c.key}`}
            className={`chip ${filters.categories.has(c.key) ? 'chip-on' : ''}`}
            onClick={() => toggle('categories', c.key)}
            style={
              filters.categories.has(c.key)
                ? { background: c.color, color: '#0b1020' }
                : undefined
            }
          >
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: 3, background: c.color, display: 'inline-block' }} />
            {t(c.labelKey)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="me-1 text-[11.5px] font-bold uppercase tracking-wide faint">
            {t('table.filter.phase')}
          </span>
          {PHASES.map((p) => (
            <button
              key={p}
              className={`chip ${filters.phases.has(p) ? 'chip-on' : ''}`}
              onClick={() => toggle('phases', p)}
            >
              {t(`phase.${p}`)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="me-1 text-[11.5px] font-bold uppercase tracking-wide faint">
            {t('table.filter.block')}
          </span>
          {BLOCKS.map((b) => (
            <button
              key={b}
              className={`chip uppercase ${filters.blocks.has(b) ? 'chip-on' : ''}`}
              onClick={() => toggle('blocks', b)}
            >
              {b}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="me-1 text-[11.5px] font-bold uppercase tracking-wide faint">
            {t('table.filter.group')}
          </span>
          {Array.from({ length: 18 }, (_, i) => i + 1).map((g) => (
            <button
              key={g}
              className={`chip tnum !px-2 ${filters.groups.has(g) ? 'chip-on' : ''}`}
              onClick={() => toggle('groups', g)}
            >
              {g}
            </button>
          ))}
        </div>

        <button
          className={`chip ${filters.favoritesOnly ? 'chip-on' : ''}`}
          onClick={() => setFilters((f) => ({ ...f, favoritesOnly: !f.favoritesOnly }))}
        >
          ★ {t('table.filter.favorites')}
        </button>
      </div>
    </>
  );

  if (!collapsible) return <div className="mb-3 flex flex-col gap-2">{body}</div>;

  // Narrow screens: the category row alone is eleven chips and the group row
  // is eighteen, which pushed the table entirely below the first screen.
  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <button className="chip" onClick={onToggle} aria-expanded={!!open}>
          {open ? '▾' : '▸'} {t('table.filter.category')} · {t('tools.title')}
        </button>
        {countActiveFilters(filters) > 0 && (
          <span className="tag">{countActiveFilters(filters)}</span>
        )}
      </div>
      {open && <div className="mt-2 flex flex-col gap-2">{body}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Layout customiser                                                   */
/* ------------------------------------------------------------------ */

function LayoutPanel({
  layout,
  setLayout,
  resetLayout,
  onClose,
}: {
  layout: ReturnType<typeof useStore>['layout'];
  setLayout: ReturnType<typeof useStore>['setLayout'];
  resetLayout: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();

  const toggleGap = (kind: 'gapRows' | 'gapCols', v: number) => {
    setLayout({
      [kind]: layout[kind].includes(v)
        ? layout[kind].filter((x) => x !== v)
        : [...layout[kind], v].sort((a, b) => a - b),
    } as never);
  };

  return (
    <div className="surface fade-up mb-3 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-extrabold">{t('table.layout')}</h3>
        <div className="flex gap-1.5">
          <button className="btn btn-ghost h-7 text-[12px]" onClick={resetLayout}>
            {t('app.reset')}
          </button>
          <button className="btn btn-ghost h-7 px-2 text-[12px]" onClick={onClose}>
            ✕
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide faint">
            {t('table.layout.cardWidth')}
          </p>
          <div className="flex gap-1.5">
            {([75, 175] as const).map((w) => (
              <button
                key={w}
                className={`chip ${layout.borderWidth === w ? 'chip-on' : ''}`}
                onClick={() => setLayout({ borderWidth: w })}
              >
                {w}%
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide faint">
            {t('table.layout.show')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(['atomicNumber', 'symbol', 'name', 'mass', 'phase'] as const).map((f) => (
              <button
                key={f}
                className={`chip ${layout.cellFields[f] ? 'chip-on' : ''}`}
                onClick={() =>
                  setLayout({ cellFields: { ...layout.cellFields, [f]: !layout.cellFields[f] } })
                }
              >
                {t(`table.layout.${f}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide faint">
            {t('table.layout.gaps')}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] muted">{t('table.layout.gapRow')}</span>
              {Array.from({ length: 9 }, (_, i) => i + 1).map((r) => (
                <button
                  key={r}
                  className={`chip tnum !px-2 ${layout.gapRows.includes(r) ? 'chip-on' : ''}`}
                  onClick={() => toggleGap('gapRows', r)}
                  aria-pressed={layout.gapRows.includes(r)}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] muted">{t('table.layout.gapColumn')}</span>
              {Array.from({ length: 17 }, (_, i) => i + 1).map((c) => (
                <button
                  key={c}
                  className={`chip tnum !px-2 ${layout.gapCols.includes(c) ? 'chip-on' : ''}`}
                  onClick={() => toggleGap('gapCols', c)}
                  aria-pressed={layout.gapCols.includes(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface px-3 py-2.5">
      <div className="tnum text-lg font-extrabold leading-none">{value}</div>
      <div className="mt-1 text-[11.5px] uppercase tracking-wide faint">{label}</div>
    </div>
  );
}
