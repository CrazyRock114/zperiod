import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import type { Element } from '../types/chem';
import { useI18n } from '../i18n';
import { useStore } from '../state/store';
import { categoryColor, categorySurface, textOn, defaultNeutrons } from '../data';
import {
  convertElectronAffinity,
  fmt,
  fmtDensity,
  fmtEnergy,
  fmtTemp,
  temperatureSymbol,
} from '../lib/units';
import { valenceCount } from '../lib/chem3d/orbitals';
import type { AtomHandle, AtomStyle } from './Atom3D';
import { Tour, useTour } from './Tour';

/**
 * three.js is ~120 kB gzipped. Keep it out of the entry chunk so the landing
 * page and the periodic table never pay for a renderer they do not open.
 */
const LazyAtom3D = lazy(() => import('./Atom3D').then((m) => ({ default: m.Atom3D })));

function AtomFallback({ label }: { label: string }) {
  return (
    <div className="atom-stage grid h-full w-full place-items-center">
      <div className="text-center">
        <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-[var(--surface-3)] border-t-[var(--accent)]" />
        <p className="text-[12px] faint">{label}</p>
      </div>
    </div>
  );
}

export interface ElementDetailProps {
  element: Element;
  onClose?: () => void;
  onCompare?: (z: number) => void;
  /** True when the panel is a full page rather than a slide-over. */
  full?: boolean;
}

/* ------------------------------------------------------------------ */

export function ElementDetail({ element: e, onClose, onCompare, full }: ElementDetailProps) {
  const { t, elementName } = useI18n();
  const {
    units, favorites, toggleFavorite, reduce3d, reduceMotion,
    gradeReview, review, setLastElement, markTourSeen, toolToursSeen,
  } = useStore();
  const tour = useTour('element', toolToursSeen, markTourSeen);
  const atomRef = useRef<AtomHandle>(null);

  const [style, setStyle] = useState<AtomStyle>('bohr');
  const [autoRotate, setAutoRotate] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [nucleusScale, setNucleusScale] = useState(1);
  const [spinL, setSpinL] = useState(0);
  const [tab, setTab] = useState<'info' | 'model'>('info');
  const [copied, setCopied] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const name = elementName(e.atomicNumber, e.name);
  const fav = favorites.includes(e.atomicNumber);
  const neutrons = defaultNeutrons(e);

  useEffect(() => {
    setLastElement(e.atomicNumber);
    setTab('info');
    setImgFailed(false);
    setSpinL(0);
  }, [e.atomicNumber, setLastElement]);

  // A fresh spin card when an element is opened from the review queue.
  useEffect(() => {
    if (review[String(e.atomicNumber)]?.reps === 0) return;
    // No-op: review grading is explicit, not automatic.
  }, [e.atomicNumber, review]);

  const share = useMemo(
    () => `https://zperiod.app/?e=${e.atomicNumber}`,
    [e.atomicNumber],
  );

  const doCopy = useMemo(
    () => async () => {
      const url = `${location.origin}${location.pathname}#e=${e.atomicNumber}`;
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch {
        setCopied(false);
      }
    },
    [e.atomicNumber],
  );

  const card = review[String(e.atomicNumber)];

  return (
    <div className={`${full ? 'w-full' : 'w-full max-w-lg'} flex flex-col gap-4`}>
      {/* ---- hero ---- */}
      <header className="flex items-start gap-4">
        <div
          className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl"
          style={{ background: categorySurface(e.category, dark), color: textOn(e.category, dark) }}
        >
          <span className="tnum text-[12px] font-bold opacity-70">{e.atomicNumber}</span>
          <span className="text-3xl font-extrabold leading-none tracking-tight">{e.symbol}</span>
          <span className="mt-0.5 text-[12px] font-semibold opacity-75">{fmt(e.atomicMass, 4)}</span>
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-2xl font-extrabold tracking-tight">{name}</h2>
          <p className="muted truncate text-sm">{e.name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge color={categoryColor(e.category)}>{t(`category.${e.category}`)}</Badge>
            <Badge>{t(`phase.${e.phase}`)} @ STP</Badge>
            <Badge>
              {t('element.group')} {e.group} · {t('element.period')} {e.period}
            </Badge>
            <Badge>{e.block}-block</Badge>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-1.5">
          {onClose && (
            <IconBtn label={t('app.close')} onClick={onClose}>
              ✕
            </IconBtn>
          )}
          <IconBtn label={fav ? t('table.unfavorite') : t('table.favorite')} onClick={() => toggleFavorite(e.atomicNumber)} active={fav}>
            {fav ? '★' : '☆'}
          </IconBtn>
          <IconBtn label={t('element.compare')} onClick={() => onCompare?.(e.atomicNumber)}>
            ⇄
          </IconBtn>
          <IconBtn label={t('element.tutorial')} onClick={tour.start}>
            ?
          </IconBtn>
        </div>
      </header>

      <Tour open={tour.open} onClose={tour.close} id="element" />

      {/* ---- tabs ---- */}
      <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--surface-2)' }}>
        {(['info', 'model'] as const).map((k) => (
          <button
            key={k}
            className="flex-1 rounded-lg py-2 text-xs font-bold transition-colors"
            style={
              tab === k
                ? { background: 'var(--surface-1)', color: 'var(--text-1)', boxShadow: 'var(--shadow-card)' }
                : { color: 'var(--text-2)' }
            }
            onClick={() => setTab(k)}
          >
            {k === 'info' ? t('element.details') : t('atom.title')}
          </button>
        ))}
      </div>

      {tab === 'model' ? (
        <ModelTab
          e={e}
          atomRef={atomRef}
          style={style}
          setStyle={setStyle}
          autoRotate={autoRotate}
          setAutoRotate={setAutoRotate}
          showLabels={showLabels}
          setShowLabels={setShowLabels}
          nucleusScale={nucleusScale}
          setNucleusScale={setNucleusScale}
          spinL={spinL}
          setSpinL={setSpinL}
          neutrons={neutrons}
          reduce3d={reduce3d}
          reduceMotion={reduceMotion}
          copied={copied}
          doCopy={doCopy}
          share={share}
        />
      ) : (
        <InfoTab e={e} name={name} />
      )}

      {/* ---- spaced review ---- */}
      {card && card.reps > 0 && (
        <div className="surface p-3">
          <p className="mb-2 text-xs font-bold">{t('learn.reviewTitle')}</p>
          <div className="flex flex-wrap gap-1.5">
            {([2, 1, 0, 3] as const).map((q) => (
              <button
                key={q}
                className="chip"
                onClick={() => gradeReview(e.atomicNumber, q)}
                title={q >= 2 ? t('learn.correct') : t('learn.incorrect')}
              >
                {q >= 2 ? '✓' : '↻'} {q === 3 ? 'Easy' : q === 2 ? 'Good' : q === 1 ? 'Hard' : 'Again'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Info tab                                                            */
/* ------------------------------------------------------------------ */

function InfoTab({ e, name }: { e: Element; name: string }) {
  const { t } = useI18n();
  const { units } = useStore();
  const [imgFailed, setImgFailed] = useState(false);
  const cfg = e.electronConfiguration ?? '';
  const valence = e.valenceElectrons ?? valenceCount(cfg);

  return (
    <div className="flex flex-col gap-4">
      {e.summary && (
        <p className="text-sm leading-relaxed muted">{e.summary}</p>
      )}

      {e.imageUrl && !imgFailed && (
        <figure className="overflow-hidden rounded-xl border">
          <img
            src={e.imageUrl}
            alt={name}
            loading="lazy"
            className="h-44 w-full object-cover"
            onError={() => setImgFailed(true)}
          />
          {e.imageCredit && (
            <figcaption className="px-3 py-1.5 text-[11.5px] faint">{e.imageCredit}</figcaption>
          )}
        </figure>
      )}

      {/* subatomic */}
      <Section title={t('element.subatomic')}>
        <div className="grid grid-cols-3 gap-2">
          <Particle label={t('element.protons')} value={e.atomicNumber} color="#ff5a5a" sub="p⁺" />
          <Particle
            label={t('element.neutrons')}
            value={e.isotopes?.find((i) => i.stable)?.massNumber
              ? e.isotopes.find((i) => i.stable)!.massNumber - e.atomicNumber
              : (e.massNumberOfMostStable ?? e.atomicNumber) - e.atomicNumber}
            color="#4d7dff"
            sub="n⁰"
          />
          <Particle label={t('element.electrons')} value={e.atomicNumber} color="#8b85ff" sub="e⁻" />
        </div>
      </Section>

      {/* properties */}
      <Section title={t('element.properties') ?? t('element.meltingPoint')}>
        <dl className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <Row
            k={t('element.atomicMass')}
            v={
              e.atomicMass !== null
                ? fmt(e.atomicMass, 6)
                : `${t('element.massNumber')} ${e.massNumberOfMostStable ?? '—'}`
            }
          />
          <Row k={t('element.isotopes')} v={e.isotopeCount ?? e.isotopes?.length ?? '—'} />
          <Row k={t('element.electronConfiguration')} v={<span className="font-mono text-[11.5px]">{cfg || '—'}</span>} />
          {e.nobleGasConfiguration && (
            <Row k={`${t('element.electronConfiguration')} (noble)`} v={<span className="font-mono text-[11.5px]">{e.nobleGasConfiguration}</span>} />
          )}
          <Row k={t('element.valenceElectrons')} v={valence ?? '—'} />
          <Row k={t('element.electronegativity')} v={e.electronegativity !== null ? `${e.electronegativity}` : '—'} />
          <Row k={t('element.atomicRadius')} v={e.atomicRadiusPm !== null ? `${e.atomicRadiusPm} pm` : '—'} />
          <Row k={t('element.meltingPoint')} v={fmtTemp(e.meltingPointK, units.temperature)} />
          <Row k={t('element.boilingPoint')} v={fmtTemp(e.boilingPointK, units.temperature)} />
          <Row k={t('element.density')} v={fmtDensity(e.densityGcm3, units.density)} />
          <Row k={t('element.ionizationEnergy')} v={fmtEnergy(e.ionizationEnergyEv, units.energy)} />
          <Row
            k={t('element.electronAffinity')}
            v={
              e.electronAffinityKjMol === null
                ? '—'
                : `${fmt(convertElectronAffinity(e.electronAffinityKjMol, units.energy), 4)} ${
                    units.energy === 'ev' ? 'eV' : 'kJ/mol'
                  }`
            }
          />
          {e.oxidationStates.length > 0 && (
            <Row
              k={t('element.oxidationStates')}
              v={e.oxidationStates.map((o) => (o > 0 ? `+${o}` : `${o}`)).join(', ')}
            />
          )}
        </dl>
        <p className="mt-2 text-[11.5px] faint">
          {t('settings.temperature')}: {temperatureSymbol(units.temperature)} · {t('settings.density')}:{' '}
          {units.density === 'gcm3' ? 'g/cm³' : units.density === 'kgm3' ? 'kg/m³' : 'lb/ft³'} ·{' '}
          {t('settings.energy')}: {units.energy === 'ev' ? 'eV' : 'kJ/mol'}
        </p>
      </Section>

      {/* isotopes */}
      {e.isotopes?.length > 0 && (
        <Section title={`${t('element.isotopes')} (${e.isotopeCount ?? e.isotopes.length})`}>
          <div className="thin-scroll -mx-1 max-h-52 overflow-y-auto px-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="faint text-[11.5px] uppercase">
                  <th className="py-1 text-start font-semibold">A</th>
                  <th className="py-1 text-end font-semibold">{t('element.abundance')}</th>
                  <th className="py-1 text-end font-semibold">#</th>
                  <th className="py-1 text-end font-semibold">n</th>
                </tr>
              </thead>
              <tbody className="tnum">
                {e.isotopes.map((iso) => (
                  <tr key={iso.massNumber} className="border-t">
                    <td className="py-1.5 font-bold">
                      {e.symbol}-{iso.massNumber}
                    </td>
                    <td className="py-1.5 text-end">
                      {iso.stable ? `${fmt(iso.abundance, 3)}%` : t('element.radioactive')}
                    </td>
                    <td className="py-1.5 text-end faint">{e.atomicNumber}</td>
                    <td className="py-1.5 text-end faint">{iso.massNumber - e.atomicNumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* uses + hazards */}
      {(e.uses || e.hazards) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {e.uses && (
            <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
              <p className="mb-1 text-xs font-bold" style={{ color: 'var(--accent)' }}>
                ⚡ {t('element.uses')}
              </p>
              <p className="text-xs leading-relaxed muted">{e.uses}</p>
            </div>
          )}
          {e.hazards && (
            <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
              <p className="mb-1 text-xs font-bold" style={{ color: '#e2564f' }}>
                ⚠ {t('element.hazards')}
              </p>
              <p className="text-xs leading-relaxed muted">{e.hazards}</p>
            </div>
          )}
        </div>
      )}

      {/* discovery */}
      {(e.discoveryYear || e.discoverer) && (
        <Section title={t('element.discovery')}>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {e.discoveryYear && (
              <Badge>
                {e.discoveryYear < 0 || e.discoveryYear === -1
                  ? t('element.ancient')
                  : new Date().getFullYear() - e.discoveryYear < 400
                    ? `~${e.discoveryYear} CE`
                    : e.discoveryYear}
              </Badge>
            )}
            {e.discoverer && <span className="muted">{e.discoverer}</span>}
          </div>
        </Section>
      )}

      {e.flameTestColor && (
        <Section title={t('element.flameTest')}>
          <div className="flex items-center gap-3">
            <span
              className="h-9 w-9 rounded-full border"
              style={{ background: e.flameTestColor, boxShadow: `0 0 22px ${e.flameTestColor}` }}
            />
            <span className="text-xs muted">
              {name} · <span className="font-mono">{e.flameTestColor}</span>
            </span>
          </div>
        </Section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3D tab                                                              */
/* ------------------------------------------------------------------ */

interface ModelTabProps {
  e: Element;
  atomRef: React.RefObject<AtomHandle>;
  style: AtomStyle;
  setStyle: (s: AtomStyle) => void;
  autoRotate: boolean;
  setAutoRotate: (v: boolean) => void;
  showLabels: boolean;
  setShowLabels: (v: boolean) => void;
  nucleusScale: number;
  setNucleusScale: (v: number) => void;
  spinL: number;
  setSpinL: (v: number) => void;
  neutrons: number;
  reduce3d: boolean;
  reduceMotion: boolean;
  copied: boolean;
  doCopy: () => void;
  share: string;
}

function ModelTab(p: ModelTabProps) {
  const { t } = useI18n();
  const { elementName } = useI18n();
  const name = elementName(p.e.atomicNumber, p.e.name);
  const acc = categoryColor(p.e.category);

  if (p.reduce3d) {
    return (
      <div className="rounded-xl border p-8 text-center">
        <p className="text-3xl">🧪</p>
        <p className="mt-2 text-sm font-bold">{name}</p>
        <p className="mt-1 text-xs muted">{t('atom.subtitle')}</p>
        <p className="mt-3 text-[12px] faint">{t('settings.reduce3dNote')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Suspense fallback={<AtomFallback label={t('app.loading')} />}>
          <LazyAtom3D
            ref={p.atomRef}
            atomicNumber={p.e.atomicNumber}
            symbol={p.e.symbol}
            neutrons={p.neutrons}
            electrons={p.e.atomicNumber}
            configuration={p.e.electronConfiguration}
            style={p.style}
            autoRotate={p.autoRotate}
            nucleusScale={p.nucleusScale}
            accent={acc}
            paused={false}
            onSpinChange={p.setSpinL}
            className="h-[320px] w-full"
          />
        </Suspense>
        <div className="pointer-events-none absolute bottom-2 start-2 rounded-md bg-black/45 px-2 py-1 text-[11.5px] text-white/80 backdrop-blur">
          {t('atom.dragRotate')} · {t('atom.scrollZoom')}
        </div>
      </div>

      {/* style switch */}
      <div className="flex flex-wrap gap-1.5">
        {(['bohr', 'cloud', 'ball'] as const).map((s) => (
          <button
            key={s}
            className={`chip ${p.style === s ? 'chip-on' : ''}`}
            onClick={() => {
              p.setStyle(s);
              p.atomRef.current?.setStyle(s);
            }}
          >
            {t(`atom.shellStyle.${s}`)}
          </button>
        ))}
      </div>

      {/* controls */}
      <div className="grid gap-2 sm:grid-cols-2">
        <Control label={t('atom.spinUp')}>
          <div className="flex items-center gap-1.5">
            <button className="btn btn-subtle h-8 flex-1 px-2 text-xs" onClick={() => p.atomRef.current?.spinUp()}>
              ▲ l+
            </button>
            <button className="btn btn-subtle h-8 flex-1 px-2 text-xs" onClick={() => p.atomRef.current?.spinDown()}>
              ▼ l−
            </button>
            <span className="tnum w-10 text-center text-xs font-bold faint">l={p.spinL}</span>
            <button
              className="btn btn-ghost h-8 px-2 text-xs"
              onClick={() => {
                p.atomRef.current?.resetSpin();
                p.setSpinL(0);
              }}
            >
              ↺
            </button>
          </div>
        </Control>

        <Control label={t('atom.autoRotate')}>
          <button
            className={`btn h-8 w-full text-xs ${p.autoRotate ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => {
              p.setAutoRotate(!p.autoRotate);
              p.atomRef.current?.setAutoRotate(!p.autoRotate);
            }}
          >
            {p.autoRotate ? t('misc.on') : t('misc.off')}
          </button>
        </Control>

        <Control label={t('atom.showLabels')}>
          <button
            className={`btn h-8 w-full text-xs ${p.showLabels ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => {
              p.setShowLabels(!p.showLabels);
              p.atomRef.current?.setLabels(!p.showLabels);
            }}
          >
            {p.showLabels ? t('misc.on') : t('misc.off')}
          </button>
        </Control>

        <Control label={t('atom.nucleusScale')}>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0.5}
              max={2.2}
              step={0.05}
              value={p.nucleusScale}
              className="flex-1"
              onChange={(ev) => {
                const v = Number(ev.target.value);
                p.setNucleusScale(v);
                p.atomRef.current?.setNucleusScale(v);
              }}
            />
            <span className="tnum w-8 text-end text-xs faint">{p.nucleusScale.toFixed(2)}</span>
          </div>
        </Control>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button className="btn btn-ghost h-8 text-xs" onClick={() => p.atomRef.current?.resetView()}>
          {t('atom.resetView')}
        </button>
        <button className="btn btn-ghost h-8 text-xs" onClick={p.doCopy}>
          {p.copied ? t('app.copied') : t('element.copyLink')}
        </button>
        {navigator.share && (
          <button
            className="btn btn-ghost h-8 text-xs"
            onClick={() => navigator.share({ title: `${name} — ${p.e.symbol}`, url: p.share }).catch(() => {})}
          >
            {t('element.share')}
          </button>
        )}
      </div>

      <p className="rounded-lg p-2.5 text-[11.5px] leading-relaxed faint" style={{ background: 'var(--surface-2)' }}>
        {t('atom.orbitalsNote')}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-[11.5px] font-extrabold uppercase tracking-wider faint">{title}</h3>
      {children}
    </section>
  );
}

export function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b py-1.5" style={{ borderColor: 'var(--border)' }}>
      <dt className="shrink-0 text-[12px] muted">{k}</dt>
      <dd className="tnum truncate text-end text-[11.5px] font-semibold">{v}</dd>
    </div>
  );
}

function Particle({ label, value, color, sub }: { label: string; value: number; color: string; sub: string }) {
  return (
    <div className="rounded-lg p-2 text-center" style={{ background: 'var(--surface-2)' }}>
      <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full text-[11.5px] font-bold text-white" style={{ background: color }}>
        {sub}
      </div>
      <div className="tnum text-lg font-extrabold leading-none">{value}</div>
      <div className="mt-0.5 text-[12px] faint">{label}</div>
    </div>
  );
}

export function Badge({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="tag"
      style={color ? { color, background: 'transparent', border: `1px solid ${color}`, opacity: 0.9 } : undefined}
    >
      {children}
    </span>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11.5px] font-bold uppercase tracking-wide faint">{label}</p>
      {children}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className="btn btn-ghost h-8 w-8 px-0 text-sm"
      onClick={onClick}
      title={label}
      aria-label={label}
      style={active ? { color: '#feca57' } : undefined}
    >
      {children}
    </button>
  );
}
