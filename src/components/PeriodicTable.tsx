import React, { useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Element, ElementCategory, Phase } from '../types/chem';
import { useI18n } from '../i18n';
import {
  CATEGORIES,
  GRID_COLS,
  GRID_ROWS,
  GROUP_HEADERS,
  PERIOD_LABELS,
  categoryColor,
  categorySurface,
  textOn,
  type Filters,
} from '../data';
import { fmt } from '../lib/units';
import { useStore } from '../state/store';

export interface PeriodicTableProps {
  elements: Element[];
  /** Atomic numbers passing the current filters. */
  matched: Set<number>;
  filters: Filters;
  selected: number | null;
  onSelect: (z: number) => void;
  /** Rendered when the filter matches nothing. */
  emptyState?: React.ReactNode;
}

/* ------------------------------------------------------------------ */

interface CellProps {
  element: Element;
  dimmed: boolean;
  selected: boolean;
  favorite: boolean;
  name: string;
  /** Trailing footnote marker, e.g. "**" on La and Ac. */
  mark?: string;
  /** Compact card height, used for the detached f-block rows. */
  compact?: boolean;
  onSelect: (z: number) => void;
  onEnter?: (e: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>) => void;
}

const ElementCell = React.memo(function ElementCell({
  element: e,
  dimmed,
  selected,
  favorite,
  name,
  mark,
  compact,
  onSelect,
  onEnter,
}: CellProps) {
  const { layout } = useStore();
  const { t } = useI18n();
  const f = layout.cellFields;
  const dark = isDark();
  const bg = categorySurface(e.category, dark);
  const fg = textOn(e.category, dark);
  const bar = categoryColor(e.category);

  return (
    <button
      type="button"
      className={`cell${selected ? ' sel' : ''}${favorite ? ' fav' : ''}${compact ? ' fblock' : ''}`}
      style={{
        background: bg,
        color: fg,
        opacity: dimmed ? 0.2 : 1,
        borderColor: selected ? fg : 'transparent',
        filter: dimmed ? 'grayscale(0.85)' : undefined,
      }}
      onClick={() => onSelect(e.atomicNumber)}
      onMouseEnter={onEnter}
      onFocus={onEnter}
      aria-label={`${e.atomicNumber} ${name}`}
      title={`${e.symbol} · ${name}`}
    >
      {/* Category bar down the left edge — the classic textbook cue. */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          insetInlineStart: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: bar,
        }}
      />

      {f.atomicNumber && (
        <span
          className="tnum absolute start-[14%] top-[8%]"
          style={{ fontSize: 'var(--cell-z)', fontWeight: 700, opacity: 0.72, lineHeight: 1 }}
        >
          {e.atomicNumber}
        </span>
      )}
      {f.symbol && (
        <span
          className="max-w-full"
          style={{
            fontSize: 'var(--cell-sym)',
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}
        >
          {e.symbol}
        </span>
      )}
      {f.name && (
        <span
          className="cell-name"
          style={{
            fontSize: 'var(--cell-name)',
            fontWeight: 600,
            opacity: 0.82,
            lineHeight: 1.05,
          }}
        >
          {name}
          {mark && <sup style={{ opacity: 0.75 }}>{mark}</sup>}
        </span>
      )}
      {f.mass && (
        <span
          className="tnum max-w-full"
          style={{ fontSize: 'var(--cell-mass)', opacity: 0.66, lineHeight: 1.1 }}
        >
          {fmt(e.atomicMass, 4)}
        </span>
      )}
      {f.phase && (
        <span
          title={t(`phase.${e.phase}`)}
          style={{
            position: 'absolute',
            insetInlineEnd: 3,
            bottom: 2,
            width: 5,
            height: 5,
            borderRadius: 999,
            background: phaseDot(e.phase),
          }}
        />
      )}
    </button>
  );
});

function isDark(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

function phaseDot(p: Phase): string {
  switch (p) {
    case 'solid': return '#8a93ad';
    case 'liquid': return '#3fb9f5';
    case 'gas': return '#feca57';
    case 'plasma': return '#ff6b6b';
    default: return 'transparent';
  }
}

/* ------------------------------------------------------------------ */

export function PeriodicTable({
  elements,
  matched,
  filters,
  selected,
  onSelect,
  emptyState,
}: PeriodicTableProps) {
  const { t, elementName } = useI18n();
  const { layout, favorites } = useStore();
  const [hover, setHover] = useState<{ e: Element; x: number; y: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number>(0);

  const bySlot = useMemo(() => {
    const m = new Map<string, Element>();
    for (const e of elements) {
      // F-block elements are placed by the layout helper in `data/index.ts`.
      if (e.atomicNumber >= 57 && e.atomicNumber <= 71) m.set(`9:${3 + (e.atomicNumber - 57)}`, e);
      else if (e.atomicNumber >= 89 && e.atomicNumber <= 103) m.set(`10:${3 + (e.atomicNumber - 89)}`, e);
      else m.set(`${e.period}:${e.group}`, e);
    }
    return m;
  }, [elements]);

  const favs = useMemo(() => new Set(favorites), [favorites]);
  const filtering = useMemo(
    () => matched.size !== elements.length,
    [matched.size, elements.length],
  );

  const showTooltip = useCallback(
    (e: Element, ev: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>) => {
    window.clearTimeout(hoverTimer.current);
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
      hoverTimer.current = window.setTimeout(() => {
        setHover({ e, x: r.left + r.width / 2, y: r.top });
      }, 320);
    },
    [],
  );

  const hideTooltip = useCallback(() => {
    window.clearTimeout(hoverTimer.current);
    setHover(null);
  }, []);

  // Which physical rows get an inserted spacer, after the user's edits.
  const gapRowSet = useMemo(() => new Set(layout.gapRows), [layout.gapRows]);
  const gapColSet = useMemo(() => new Set(layout.gapCols), [layout.gapCols]);

  const cols = useMemo(() => {
    const out: number[] = [];
    for (let c = 1; c <= GRID_COLS; c++) {
      out.push(c);
      if (c < GRID_COLS && gapColSet.has(c)) out.push(-c); // negative = spacer marker
    }
    return out;
  }, [gapColSet]);

  const rows = useMemo(() => {
    const out: number[] = [];
    for (let r = 1; r <= GRID_ROWS; r++) {
      out.push(r);
      if (r < GRID_ROWS && gapRowSet.has(r)) out.push(-r);
    }
    return out;
  }, [gapRowSet]);

  if (!elements.length) {
    return <div className="surface p-10 text-center muted">{t('app.loading')}</div>;
  }

  if (!matched.size) {
    return <div className="surface p-10 text-center">{emptyState ?? <p className="muted">{t('app.noResults')}</p>}</div>;
  }

  return (
    <div className="relative">
      <div
        className="ptable"
        data-bw={layout.borderWidth}
        style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }}
        aria-hidden
      >
        {cols.map((c, i) => (
          <span key={`ax${i}`}>{c < 0 ? '' : c}</span>
        ))}
      </div>
      <div
        ref={gridRef}
        className="ptable"
        data-bw={layout.borderWidth}
        style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }}
        onMouseLeave={hideTooltip}
        role="grid"
        aria-label={t('table.title')}
      >
        {rows.map((r) => {
          if (r < 0) {
            const after = -r;
            return (
              <div key={`gap-r${after}`} className="gap-row">
                <span style={{ opacity: 0.6, fontSize: 10 }}>{t('table.layout.gapRow')}</span>
              </div>
            );
          }
          return cols.map((c, ci) => {
            if (c < 0) {
              return <div key={`c${c}-${ci}`} className="gap-col" />;
            }
            const e = bySlot.get(`${r}:${c}`);
            if (!e) {
              // The detached f-block replaces exactly one cell in the main
              // body — group 3 of periods 6 and 7 — because the superheavy
              // elements still occupy groups 4-12 of period 7. This is the
              // textbook pointer from the body down to the two f-block rows.
              if (c === 3 && (r === 6 || r === 7)) {
                const lo = r === 6 ? 57 : 89;
                const hi = r === 6 ? 71 : 103;
                const mark = r === 6 ? '*' : '**';
                return (
                  <div
                    key={`fb${r}-${c}`}
                    className="fblock-marker"
                    title={r === 6 ? 'Lanthanides' : 'Actinides'}
                  >
                    {lo}–{hi}
                    <sup>{mark}</sup>
                  </div>
                );
              }
              return <div key={`k${r}-${c}`} className="spacer" style={{ aspectRatio: '1' }} />;
            }

            const z = e.atomicNumber;
            const dim = filtering && !matched.has(z);
            return (
              <ElementCell
                key={z}
                element={e}
                dimmed={dim}
                selected={selected === z}
                favorite={favs.has(z)}
                name={elementName(z, e.name)}
                mark={e.symbol === 'La' || e.symbol === 'Ac' ? '**' : undefined}
                compact={r === 9 || r === 10}
                onSelect={onSelect}
                onEnter={(ev) => showTooltip(e, ev)}
              />
            );
          });
        })}
      </div>

      {hover &&
        // Portalled to <body> on purpose: the grid wrapper sets
        // `container-type: inline-size` for the card type scale, and a
        // container query context also becomes the containing block for
        // position:fixed descendants. Without the portal the tooltip resolved
        // against the grid instead of the viewport and landed in the top-left
        // corner, on top of the search box.
        createPortal(<Tooltip element={hover.e} x={hover.x} y={hover.y} />, document.body)}
      <Legend />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tooltip                                                             */
/* ------------------------------------------------------------------ */

function Tooltip({ element: e, x, y }: { element: Element; x: number; y: number }) {
  const { t, elementName } = useI18n();
  const dark = isDark();
  const bg = categorySurface(e.category, dark);
  const flip = x > window.innerWidth - 240;

  return (
    <div
      className="pointer-events-none fixed z-50 w-56 rounded-xl border p-3 text-xs shadow-2xl"
      style={{
        left: flip ? x - 232 : x + 12,
        top: Math.min(y + 10, window.innerHeight - 130),
        background: 'var(--surface-1)',
        borderColor: 'var(--border)',
      }}
      role="tooltip"
    >
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-extrabold" style={{ color: categoryColor(e.category) }}>
          {e.symbol}
        </span>
        <span className="text-sm font-semibold">{elementName(e.atomicNumber, e.name)}</span>
        <span className="tnum faint ml-auto">{e.atomicNumber}</span>
      </div>
      <div
        className="mt-2 rounded-lg px-2 py-1.5 text-[12px] font-semibold"
        style={{ background: bg }}
      >
        {t(`category.${e.category}`)} · {t(`phase.${e.phase}`)}
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11.5px]">
        <dt className="faint">{t('element.atomicMass')}</dt>
        <dd className="tnum text-end font-semibold">{fmt(e.atomicMass, 4)}</dd>
        <dt className="faint">{t('element.period')}</dt>
        <dd className="tnum text-end font-semibold">{e.period}</dd>
        <dt className="faint">{t('element.group')}</dt>
        <dd className="tnum text-end font-semibold">{e.group}</dd>
        <dt className="faint">{t('element.block')}</dt>
        <dd className="text-end font-semibold uppercase">{e.block}</dd>
      </dl>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Legend                                                              */
/* ------------------------------------------------------------------ */

export function Legend() {
  const { t } = useI18n();
  const present = useMemo(() => new Set(CATEGORIES.map((c) => c.key)), []);
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px]">
      <span className="faint font-semibold uppercase tracking-wide">{t('table.legend')}</span>
      {CATEGORIES.filter((c) => present.has(c.key)).map((c) => (
        <span key={c.key} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            style={{ width: 10, height: 10, borderRadius: 3, background: c.color, display: 'inline-block' }}
          />
          <span className="muted">{t(c.labelKey)}</span>
        </span>
      ))}
      <span className="inline-flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden style={{ width: 7, height: 7, borderRadius: 99, background: '#8a93ad', display: 'inline-block' }} />
          <span className="muted">{t('phase.solid')}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden style={{ width: 7, height: 7, borderRadius: 99, background: '#3fb9f5', display: 'inline-block' }} />
          <span className="muted">{t('phase.liquid')}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden style={{ width: 7, height: 7, borderRadius: 99, background: '#feca57', display: 'inline-block' }} />
          <span className="muted">{t('phase.gas')}</span>
        </span>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Group / period headers                                              */
/* ------------------------------------------------------------------ */

export function TableAxis() {
  return (
    <div className="hidden min-[1100px]:block">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(18, minmax(0, 1fr))' }}>
        {GROUP_HEADERS.map((g, i) => (
          <div key={i} className="pb-1 text-center text-[11.5px] font-bold faint tnum">
            {g ?? ''}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PeriodAxis({ period }: { period: number | null }) {
  return period ? <span className="tnum">{period}</span> : null;
}

export type { ElementCategory };
