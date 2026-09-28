import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { useIons, useElements, categoryColor } from '../data';
import type { Ion, IonType } from '../types/chem';
import { fmt, fmtTemp } from '../lib/units';
import { molarMass } from '../lib/chem/mass';
import { classifyCompound } from '../lib/chem/solubility';
import { useStore } from '../state/store';

const LazyAtom3D = lazy(() => import('../components/Atom3D').then((m) => ({ default: m.Atom3D })));

/** Defers its children until they are near the viewport. */
function LazyMount({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);
  return <div ref={ref}>{shown ? children : null}</div>;
}

const TYPE_TONE: Record<IonType, string> = {
  cation: 'var(--c-alkali)',
  anion: 'var(--c-halogen)',
  monatomic: 'var(--c-noble)',
  polyatomic: 'var(--c-transition)',
};

export function IonsView({ initialElement }: { initialElement?: number }) {
  const { t, elementName, num } = useI18n();
  const { data: ions, loading, error } = useIons();
  const { data: elements } = useElements();
  const { units } = useStore();

  const [q, setQ] = useState('');
  const [type, setType] = useState<IonType | 'all'>('all');
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!ions) return [];
    const needle = q.trim().toLowerCase();
    return ions.filter((i) => {
      if (type !== 'all' && i.type !== type) return false;
      if (!needle) return true;
      const el = elements?.find((e) => e.atomicNumber === i.atomicNumber);
      const name = el ? elementName(el.atomicNumber, el.name).toLowerCase() : '';
      return (
        i.formula.toLowerCase().includes(needle) ||
        i.id.toLowerCase().includes(needle) ||
        i.elementSymbol.toLowerCase().includes(needle) ||
        (i.name ?? '').toLowerCase().includes(needle) ||
        name.includes(needle) ||
        String(i.atomicNumber) === needle
      );
    });
  }, [ions, q, type, elements, elementName]);

  const grouped = useMemo(() => {
    const m = new Map<number, Ion[]>();
    for (const i of filtered) {
      const arr = m.get(i.atomicNumber) ?? [];
      arr.push(i);
      m.set(i.atomicNumber, arr);
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [filtered]);

  const active = useMemo(() => (ions && selected ? ions.find((i) => i.id === selected) ?? null : null), [ions, selected]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--surface-3)] border-t-[var(--accent)]" />
      </div>
    );
  }

  if (error || !ions) {
    return (
      <div className="mx-auto max-w-lg p-10 text-center">
        <p className="text-3xl">⚠️</p>
        <p className="mt-2 text-sm font-bold">{t('app.error')}</p>
        <button className="btn btn-primary mt-4" onClick={() => location.reload()}>
          {t('app.retry')}
        </button>
      </div>
    );
  }

  const counts = {
    cation: ions.filter((i) => i.type === 'cation').length,
    anion: ions.filter((i) => i.type === 'anion').length,
    monatomic: ions.filter((i) => i.type === 'monatomic').length,
    polyatomic: ions.filter((i) => i.type === 'polyatomic').length,
  };

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-5">
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t('ions.title')}</h1>
        <p className="muted mt-1 text-sm">{t('ions.subtitle')}</p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <input
            className="input ps-9"
            placeholder={t('ions.search')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={t('ions.search')}
          />
          <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 faint">⌕</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'cation', 'anion', 'polyatomic'] as const).map((k) => (
            <button key={k} className={`chip ${type === k ? 'chip-on' : ''}`} onClick={() => setType(k)}>
              {k === 'all' ? t('table.filter.all') : t(`ions.${k}`)}
              <span className="tnum opacity-60">
                {k === 'all' ? ions.length : (counts as Record<string, number>)[k]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {active ? (
        <IonDetail
          ion={active}
          elementNameFallback={
            elements?.find((e) => e.atomicNumber === active.atomicNumber)?.name ?? active.elementSymbol
          }
          localName={
            elements?.find((e) => e.atomicNumber === active.atomicNumber)
              ? elementName(active.atomicNumber, '')
              : active.elementSymbol
          }
          onBack={() => setSelected(null)}
        />
      ) : (
        <>
          <p className="muted mb-3 text-xs">
            {num(filtered.length)} / {num(ions.length)} {t('ions.count')}
          </p>

          <div className="flex flex-col gap-4">
            {grouped.map(([z, list]) => {
              const el = elements?.find((e) => e.atomicNumber === z);
              const name = el ? elementName(z, el.name) : list[0].elementSymbol;
              return (
                <section key={z}>
                  <h2 className="mb-1.5 flex items-center gap-2 text-sm font-bold">
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-md text-[11.5px] font-extrabold"
                      style={{
                        background: el ? categoryColor(el.category) : 'var(--surface-3)',
                        color: '#0b1020',
                      }}
                    >
                      {el?.symbol ?? list[0].elementSymbol}
                    </span>
                    {name}
                    <span className="tnum faint text-[12px]">Z = {z}</span>
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {list.map((i) => (
                      <button
                        key={i.id}
                        data-testid={`ion-${i.id}`}
                        onClick={() => setSelected(i.id)}
                        className="rounded-xl border px-3 py-2 text-start transition-transform hover:-translate-y-0.5"
                        style={{ borderColor: TYPE_TONE[i.type], background: 'var(--surface-1)' }}
                      >
                        <span className="font-mono text-sm font-extrabold">{i.formula}</span>
                        {i.name && <span className="ms-1.5 text-[11.5px] faint">{i.name}</span>}
                        <span className="block text-[12px] uppercase tracking-wide" style={{ color: TYPE_TONE[i.type] }}>
                          {t(`ions.${i.type}`)}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {!filtered.length && (
            <div className="py-14 text-center">
              <p className="text-3xl">🔍</p>
              <p className="mt-2 text-sm font-bold">{t('app.noResults')}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function IonDetail({
  ion,
  elementNameFallback,
  localName,
  onBack,
}: {
  ion: Ion;
  elementNameFallback: string;
  localName: string;
  onBack: () => void;
}) {
  const { t, num } = useI18n();
  const { units } = useStore();
  const isMono = ion.type !== 'polyatomic';
  const elName = localName || elementNameFallback;

  return (
    <div className="fade-up">
      <button className="btn btn-ghost mb-3 h-8 text-xs" onClick={onBack}>
        ← {t('app.back')}
      </button>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-4">
          <div className="surface p-5">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-mono text-4xl font-extrabold" style={{ color: TYPE_TONE[ion.type] }}>
                {ion.formula}
              </span>
              {ion.name && <span className="text-lg font-bold">{ion.name}</span>}
              <span
                className="tag"
                style={{ color: TYPE_TONE[ion.type], border: `1px solid ${TYPE_TONE[ion.type]}`, background: 'transparent' }}
              >
                {t(`ions.${ion.type}`)}
              </span>
            </div>
            {isMono && (
              <p className="muted mt-1 text-sm">
                {elName} {t('ions.title').toLowerCase()} · {ion.charge > 0 ? `+${ion.charge}` : ion.charge}
              </p>
            )}
            {ion.about && <p className="muted mt-3 text-sm leading-relaxed">{ion.about}</p>}
          </div>

          <div className="surface p-4">
            <h3 className="mb-2 text-[11.5px] font-extrabold uppercase tracking-wider faint">
              {t('ions.about')}
            </h3>
            <dl className="grid gap-x-4 sm:grid-cols-2">
              <Row k={t('ions.charge')} v={ion.netCharge > 0 ? `+${ion.netCharge}` : `${ion.netCharge}`} />
              <Row k={t('ions.type')} v={t(`ions.${ion.type}`)} />
              <Row k={t('ions.protons')} v={num(ion.protons)} />
              <Row k={t('ions.electrons')} v={num(ion.electrons)} />
              <Row k={t('ions.mass')} v={ion.averageMass !== null ? `${fmt(ion.averageMass, 5)} u` : '—'} />
              <Row k={t('ions.phase')} v={t(`phase.${ion.phase}`)} />
            </dl>
          </div>

          {ion.electronConfiguration && (
            <div className="surface p-4">
              <h3 className="mb-1.5 text-[11.5px] font-extrabold uppercase tracking-wider faint">
                {t('ions.config')}
              </h3>
              <p className="break-words font-mono text-sm">{ion.electronConfiguration}</p>
              {ion.configPlain && (
                <p className="mt-1 break-all font-mono text-[11.5px] faint">{ion.configPlain}</p>
              )}
            </div>
          )}

          {/* Molar mass of a real salt containing this ion, and whether that
              salt dissolves — the two things the ion detail page was missing. */}
          <IonChemistry ion={ion} />

          {ion.flameTestColor && (
            <div className="surface p-4">
              <h3 className="mb-2 text-[11.5px] font-extrabold uppercase tracking-wider faint">
                {t('element.flameTest')}
              </h3>
              <span
                className="inline-block h-8 w-8 rounded-full border"
                style={{ background: ion.flameTestColor, boxShadow: `0 0 18px ${ion.flameTestColor}` }}
              />
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-3">
          {isMono && (
            <div className="atom-stage h-[260px] w-full">
              <Suspense
                fallback={
                  <div className="grid h-full w-full place-items-center text-[12px] faint">
                    {t('app.loading')}
                  </div>
                }
              >
                <LazyAtom3D
                  atomicNumber={ion.atomicNumber}
                  symbol={ion.elementSymbol}
                  neutrons={null}
                  electrons={ion.electrons}
                  accent={TYPE_TONE[ion.type]}
                  autoRotate
                />
              </Suspense>
            </div>
          )}
          <div className="surface p-3">
            <p className="text-[11.5px] muted">
              {t('ions.modelNote')}
            </p>
            <p className="mt-2 text-[11.5px] faint">
              {t('ions.electrons')}: <b className="tnum">{num(ion.electrons)}</b> · {t('ions.protons')}:{' '}
              <b className="tnum">{num(ion.protons)}</b>
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/**
 * Derives a representative salt for the ion and runs the real molar-mass and
 * solubility solvers on it, so the numbers here cannot drift from the tools.
 */
function IonChemistry({ ion }: { ion: Ion }) {
  const { t } = useI18n();
  const partner = useMemo(() => partnerFor(ion), [ion]);

  const mass = useMemo(() => {
    if (!partner) return null;
    try {
      return molarMass(partner);
    } catch {
      return null;
    }
  }, [partner]);

  const sol = useMemo(() => {
    if (!partner) return null;
    try {
      return classifyCompound(partner);
    } catch {
      return null;
    }
  }, [partner]);

  if (!partner) return null;
  const tone =
    sol?.overall === 'soluble'
      ? 'var(--c-metalloid)'
      : sol?.overall === 'insoluble'
        ? 'var(--c-actinide)'
        : sol?.overall === 'reacts'
          ? 'var(--c-transition)'
          : 'var(--accent)';

  return (
    <div className="surface p-4">
      <h3 className="mb-2 text-[11.5px] font-extrabold uppercase tracking-wider faint">
        {t('ions.chemistry')}
      </h3>
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-lg font-extrabold">{partner}</span>
        <span className="tnum text-sm font-bold" style={{ color: 'var(--accent)' }}>
          {mass?.ok ? `${fmt(mass.molarMass, 5)} g/mol` : '—'}
        </span>
        {sol && (
          <span
            className="rounded-md px-2 py-0.5 text-[11.5px] font-extrabold capitalize"
            style={{ background: tone, color: '#0b1020' }}
          >
            {t(`tools.solubility.${sol.overall === 'partly' ? 'partly' : sol.overall}`)}
          </span>
        )}
      </div>
      {sol?.note && <p className="muted mt-1.5 text-[12px]">{sol.note}</p>}
      {sol?.rows?.length ? (
        <ul className="mt-2 space-y-1">
          {sol.rows.map((r, i) => (
            <li key={i} className="text-[11.5px]">
              <b className="font-mono">{r.ion}</b> <span className="faint">{r.rule}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** A chemically sensible counter-ion for the given ion, as an ASCII formula. */
function partnerFor(ion: Ion): string | null {
  if (ion.type === 'polyatomic') return null; // a bare polyatomic ion is not a salt
  const body = ion.elementSymbol;
  const mag = Math.abs(ion.charge);
  const sub = (n: number) => (n > 1 ? String(n) : '');
  if (ion.charge > 0) return `${body}${sub(mag)}Cl${sub(mag)}`;
  return `Na${sub(mag)}${body}${sub(mag)}`;
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b py-2" style={{ borderColor: 'var(--border)' }}>
      <dt className="text-[12px] muted">{k}</dt>
      <dd className="tnum text-[11.5px] font-bold">{v}</dd>
    </div>
  );
}
