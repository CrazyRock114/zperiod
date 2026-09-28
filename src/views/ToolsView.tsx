import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { useStore } from '../state/store';
import type { ToolId } from '../router';
import { balanceEquation, type BalanceResult } from '../lib/chem/equation';
import { molarMass, type MolarMassResult } from '../lib/chem/mass';
import { classifyCompound, type SolubilityResult } from '../lib/chem/solubility';
import { VirtualLab } from '../components/VirtualLab';
import { Tour, useTour } from '../components/Tour';
import { SolubilityChart } from '../components/SolubilityChart';

// Both of these pull in three.js, so they stay off the entry chunk.
const LazyOrbitalAtlas = lazy(() =>
  import('../components/OrbitalAtlas').then((m) => ({ default: m.OrbitalAtlas })),
);

const TOOLS: Array<{ id: ToolId; titleKey: string; subKey: string; icon: string }> = [
  { id: 'balancer', titleKey: 'tools.balancer.title', subKey: 'tools.balancer.subtitle', icon: '⚖' },
  { id: 'molar', titleKey: 'tools.molar.title', subKey: 'tools.molar.subtitle', icon: '⚖️' },
  { id: 'solubility', titleKey: 'tools.solubility.title', subKey: 'tools.solubility.subtitle', icon: '🧪' },
  { id: 'lab', titleKey: 'tools.lab.title', subKey: 'tools.lab.subtitle', icon: '🥛' },
  { id: 'spdf', titleKey: 'tools.spdf.title', subKey: 'tools.spdf.subtitle', icon: '🌀' },
];

export function ToolsView({
  tool,
  arg,
  navigate,
}: {
  tool: ToolId;
  arg?: string;
  navigate: (r: any) => void;
}) {
  const { t } = useI18n();
  const meta = TOOLS.find((x) => x.id === tool) ?? TOOLS[0];

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-5">
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t(meta.titleKey)}</h1>
        <p className="muted mt-1 text-sm">{t(meta.subKey)}</p>
      </header>

      <nav className="mb-5 flex flex-wrap gap-1.5">
        {TOOLS.map((x) => (
          <button
            key={x.id}
            onClick={() => navigate({ name: 'tools', tool: x.id })}
            className={`chip ${x.id === tool ? 'chip-on' : ''}`}
            style={{ padding: '8px 14px', fontSize: 12.5 }}
          >
            <span aria-hidden>{x.icon}</span>
            {t(x.titleKey)}
          </button>
        ))}
      </nav>

      <div className="fade-up" key={tool}>
        {tool === 'balancer' && <EquationBalancer initial={arg} />}
        {tool === 'molar' && <MolarMassTool initial={arg} />}
        {tool === 'solubility' && <SolubilityTool initial={arg} />}
        {tool === 'lab' && <VirtualLab />}
        {tool === 'spdf' && (
          <Suspense
            fallback={
              <div className="grid h-[380px] place-items-center rounded-2xl border">
                <div className="text-center">
                  <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-[var(--surface-3)] border-t-[var(--accent)]" />
                  <p className="text-[12px] faint">{t('app.loading')}</p>
                </div>
              </div>
            }
          >
            <LazyOrbitalAtlas />
          </Suspense>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Equation balancer                                                */
/* ------------------------------------------------------------------ */

const SAMPLES = [
  'H2 + O2 -> H2O',
  'Fe + O2 -> Fe2O3',
  'C3H8 + O2 -> CO2 + H2O',
  'KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2',
  'Al + HCl -> AlCl3 + H2',
  'CaCO3 -> CaO + CO2',
  'Na + H2O -> NaOH + H2',
  'BaCl2 + Na2SO4 -> BaSO4 + NaCl',
];

function EquationBalancer({ initial }: { initial?: string }) {
  const { t, num } = useI18n();
  const { markTourSeen, toolToursSeen } = useStore();
  const [input, setInput] = useState(initial ?? 'C3H8 + O2 -> CO2 + H2O');
  const [debounced, setDebounced] = useState(input);
  const [thrown, setThrown] = useState<string | null>(null);
  const tour = useTour('balancer', toolToursSeen, markTourSeen);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(input), 220);
    return () => clearTimeout(id);
  }, [input]);

  // The balancer reports bad input through `ok: false`; it should only throw on
  // a genuine internal fault, and if it does we show that rather than a
  // hand-built fake result.
  const result = useMemo<BalanceResult | null>(() => {
    if (!debounced.trim()) return null;
    setThrown(null);
    try {
      return balanceEquation(debounced);
    } catch (err) {
      setThrown(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [debounced]);

  const pick = useCallback((s: string) => {
    setInput(s);
  }, []);

  const massL = result?.reactants.reduce((a, s) => a + s.mass * s.coefficient, 0) ?? 0;
  const massR = result?.products.reduce((a, s) => a + s.mass * s.coefficient, 0) ?? 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-4">
        <div className="surface p-4">
          <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide faint">
            {t('tools.balancer.input')}
          </label>
          <textarea
            className="input min-h-[76px] resize-y font-mono text-[15px] leading-relaxed"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('tools.balancer.inputPlaceholder')}
            spellCheck={false}
            dir="ltr"
            aria-label={t('tools.balancer.input')}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              className="btn btn-primary h-9 text-xs"
              onClick={() => setInput(SAMPLES[Math.floor(Math.random() * SAMPLES.length)])}
            >
              🎲 {t('tools.balancer.random')}
            </button>
            <button className="btn btn-ghost h-9 text-xs" onClick={() => setInput('')}>
              {t('tools.balancer.clear')}
            </button>
            {tour.show && (
              <button className="btn btn-subtle h-9 text-xs" onClick={tour.start}>
                ? {t('tools.balancer.tutorial')}
              </button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {SAMPLES.map((s) => (
              <button key={s} className="chip font-mono !text-[11.5px]" onClick={() => pick(s)}>
                {s.length > 26 ? s.slice(0, 26) + '…' : s}
              </button>
            ))}
          </div>
        </div>

        <Tour open={tour.open} onClose={tour.close} id="balancer" />

        {thrown && (
          <div className="surface p-4" style={{ borderColor: 'var(--c-actinide)' }}>
            <p className="text-sm font-bold" style={{ color: 'var(--c-actinide)' }}>
              {thrown}
            </p>
          </div>
        )}

        {result && !result.ok && (
          <div className="surface border-[var(--c-actinide)] p-4">
            <p className="text-sm font-bold" style={{ color: 'var(--c-actinide)' }}>
              {result.error || t('tools.balancer.error.unknownElement')}
            </p>
          </div>
        )}

        {result?.ok && (
          <div className="surface p-4 fade-up">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge tone={result.reduced ? 'warn' : 'ok'}>
                {result.reduced ? t('tools.balancer.balanceIt') : t('tools.balancer.balanced')}
              </Badge>
              <span className="text-[12px] faint">{t('tools.balancer.stoichiometry')}</span>
            </div>

            {(result.freeParameters ?? 0) > 0 && (
              <div
                data-testid="ambiguity-note"
                className="mb-3 rounded-xl p-2.5 text-[11.5px] leading-relaxed"
                style={{
                  background: 'color-mix(in srgb, var(--c-transition) 14%, transparent)',
                  color: 'var(--text-1)',
                }}
                role="note"
              >
                <b>⚠ {t('tools.balancer.ambiguous')}</b>
                <p className="mt-0.5">{t('tools.balancer.ambiguousBody')}</p>
                <p className="mt-0.5 font-mono text-[11.5px] faint">{result.unbalancedElements?.join(', ') ?? ''}</p>
              </div>
            )}

            <p
              className="overflow-x-auto whitespace-nowrap rounded-xl p-3 font-mono text-lg font-bold"
              style={{ background: 'var(--surface-2)' }}
              dir="ltr"
            >
              {result.balanced}
            </p>

            {/* species chips */}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide faint">
                  ← {t('tools.balancer.reactants')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.reactants.map((s, i) => (
                    <Species key={i} coeff={s.coefficient} formula={s.formula} name={s.name} mass={s.mass} />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide faint">
                  {t('tools.balancer.products')} →
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.products.map((s, i) => (
                    <Species key={i} coeff={s.coefficient} formula={s.formula} name={s.name} mass={s.mass} />
                  ))}
                </div>
              </div>
            </div>

            {/* mass balance */}
            <div className="mt-4 rounded-xl p-3" style={{ background: 'var(--surface-2)' }}>
              <div className="flex items-center justify-between text-xs">
                <span className="muted">{t('tools.balancer.massLeft')}</span>
                <span className="tnum font-bold">{num(massL, { maximumFractionDigits: 3 })} g</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs">
                <span className="muted">{t('tools.balancer.massRight')}</span>
                <span className="tnum font-bold">{num(massR, { maximumFractionDigits: 3 })} g</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-3)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (Math.min(massL, massR) / Math.max(massL, massR, 1e-9)) * 100)}%`,
                    background: 'linear-gradient(90deg, var(--accent), #1dd1a1)',
                  }}
                />
              </div>
              <p className="mt-1.5 text-[11.5px] faint">
                {Math.abs(massL - massR) < 1e-6
                  ? '✓ mass conserved'
                  : `Δ ${(massL - massR).toExponential(2)}`}
              </p>
            </div>

            {result.steps && result.steps.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-[12px] font-bold faint">
                  {t('tools.balancer.steps')} ({result.steps.length})
                </summary>
                <ol className="mt-2 list-decimal space-y-1 ps-5 text-[11.5px] muted">
                  {result.steps.map((s, i) => (
                    <li key={i} className="font-mono">
                      {s}
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </div>
        )}
      </div>

      <aside className="flex flex-col gap-3">
        <div className="surface p-4">
          <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wide faint">
            {t('tools.balancer.balanced')}
          </h3>
          <ul className="space-y-1.5 text-[11.5px]">
            {[
              ['Synthesis', 'A + B → AB'],
              ['Decomposition', 'AB → A + B'],
              ['Single replacement', 'A + BC → AC + B'],
              ['Double replacement', 'AB + CD → AD + CB'],
              ['Combustion', 'Hydrocarbon + O₂ → CO₂ + H₂O'],
            ].map(([k, v]) => (
              <li key={k} className="flex items-baseline justify-between gap-2">
                <span className="muted">{k}</span>
                <span className="font-mono text-[11.5px]">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

function Species({ coeff, formula, name, mass }: { coeff: number; formula: string; name?: string; mass: number }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11.5px]"
      style={{ background: 'var(--surface-2)' }}
      title={name ? `${name} · ${mass.toFixed(3)} g/mol` : undefined}
    >
      <b className="tnum" style={{ color: 'var(--accent)' }}>
        {coeff}
      </b>
      <span className="font-mono font-semibold">{formula}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Molar mass                                                       */
/* ------------------------------------------------------------------ */

function MolarMassTool({ initial }: { initial?: string }) {
  const { t, num } = useI18n();
  const { markTourSeen, toolToursSeen } = useStore();
  const tour = useTour('molar', toolToursSeen, markTourSeen);
  const [input, setInput] = useState(initial ?? 'Ca(OH)2');
  const [debounced, setDebounced] = useState(input);
  const [moleculeCount, setMoleculeCount] = useState(1e23);
  const [thrown, setThrown] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(input), 220);
    return () => clearTimeout(id);
  }, [input]);

  const result = useMemo<MolarMassResult | null>(() => {
    if (!debounced.trim()) return null;
    setThrown(null);
    try {
      return molarMass(debounced);
    } catch (err) {
      setThrown(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [debounced]);

  const grams = result?.ok ? (moleculeCount * result.molarMass) / 6.02214076e23 : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        <div className="surface p-4">
          <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide faint">
            {t('tools.molar.input')}
          </label>
          <input
            className="input font-mono text-lg"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('tools.molar.inputPlaceholder')}
            spellCheck={false}
            dir="ltr"
          />
          <div className="mt-2 flex flex-wrap gap-1.5" data-testid="molar-samples">
            {['H2O', 'CO2', 'Ca(OH)2', 'C6H12O6', 'KMnO4', 'Na2SO4', 'C2H5OH', 'H2SO4'].map((s) => (
              <button key={s} className="chip font-mono !text-[11.5px]" onClick={() => setInput(s)}>
                {s}
              </button>
            ))}
            <button
              data-testid="molar-tour"
              className="btn btn-subtle h-7 text-[12px]"
              onClick={tour.start}
            >
              ? {t('tools.molar.tutorial')}
            </button>
          </div>
          <Tour open={tour.open} onClose={tour.close} id="molar" />
        </div>

        {thrown && (
          <div className="surface p-4">
            <p className="text-sm font-bold" style={{ color: 'var(--c-actinide)' }}>
              {thrown}
            </p>
          </div>
        )}

        {result && !result.ok && (
          <div className="surface p-4">
            <p className="text-sm font-bold" style={{ color: 'var(--c-actinide)' }}>
              {t('tools.molar.error.invalid')}
              {result.error ? `: ${result.error}` : ''}
            </p>
          </div>
        )}

        {result?.ok && (
          <div className="surface p-4 fade-up">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-mono text-2xl font-extrabold">{result.formula}</span>
              <span className="tnum text-2xl font-extrabold" style={{ color: 'var(--accent)' }}>
                {num(result.molarMass, { maximumFractionDigits: 3 })} <span className="text-sm font-semibold faint">g/mol</span>
              </span>
            </div>

            <div className="mt-4">
              <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide faint">
                {t('tools.molar.breakdown')}
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="faint text-[11.5px] uppercase">
                    <th className="py-1 text-start font-semibold">{t('tools.molar.element')}</th>
                    <th className="py-1 text-end font-semibold">{t('tools.molar.count')}</th>
                    <th className="py-1 text-end font-semibold">{t('tools.molar.mass')}</th>
                    <th className="py-1 text-end font-semibold">%</th>
                  </tr>
                </thead>
                <tbody className="tnum">
                  {result.breakdown.map((b, i) => (
                    <tr key={i} className="border-t">
                      <td className="py-1.5 font-bold">
                        {b.symbol} <span className="muted font-normal">{b.element}</span>
                      </td>
                      <td className="py-1.5 text-end">{b.count}</td>
                      <td className="py-1.5 text-end">{num(b.mass, { maximumFractionDigits: 3 })}</td>
                      <td className="py-1.5 text-end">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="inline-block h-1.5 rounded-full"
                            style={{
                              width: `${Math.max(3, b.percentage)}%`,
                              background: 'var(--accent)',
                            }}
                          />
                          {num(b.percentage, { maximumFractionDigits: 1 })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <aside className="surface h-fit p-4">
        <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wide faint">
          {t('tools.lab.molecules')}
        </h3>
        <label className="mb-1 block text-[11.5px] muted">
          {t('tools.molar.numberOf')} {t('tools.lab.molecules')}
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={Math.log10(moleculeCount) / 24}
          onChange={(e) => setMoleculeCount(10 ** (Number(e.target.value) * 24))}
          className="w-full"
        />
        <p className="tnum mt-1 text-sm font-bold">{moleculeCount.toExponential(3)}</p>
        {result?.ok && (
          <div className="mt-3 rounded-xl p-3" style={{ background: 'var(--surface-2)' }}>
            <p className="text-[11.5px] muted">{t('tools.molar.massOf')}</p>
            <p className="tnum mt-0.5 text-xl font-extrabold" style={{ color: 'var(--accent)' }}>
              {grams < 0.001 ? grams.toExponential(3) : num(grams, { maximumFractionDigits: 4 })} g
            </p>
            <p className="mt-2 text-[11.5px] muted">{t('element.electrons')}</p>
            <p className="tnum font-bold">{result.totalElectrons}</p>
          </div>
        )}
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Solubility                                                       */
/* ------------------------------------------------------------------ */

function SolubilityTool({ initial }: { initial?: string }) {
  const { t } = useI18n();
  const { markTourSeen, toolToursSeen } = useStore();
  const tour = useTour('solubility', toolToursSeen, markTourSeen);
  const [input, setInput] = useState(initial ?? 'CaCO3');

  const result: SolubilityResult | null = useMemo(() => {
    const q = input.trim();
    if (!q) return null;
    try {
      return classifyCompound(q);
    } catch {
      return null;
    }
  }, [input]);

  const tone =
    result?.overall === 'soluble'
      ? 'var(--c-metalloid)'
      : result?.overall === 'insoluble'
        ? 'var(--c-actinide)'
        : result?.overall === 'reacts'
          ? 'var(--c-transition)'
          : 'var(--accent)';

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        <div className="surface p-4">
          <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide faint">
            {t('tools.solubility.input')}
          </label>
          <input
            className="input font-mono text-lg"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('tools.solubility.inputPlaceholder')}
            spellCheck={false}
            dir="ltr"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {['NaCl', 'CaCO3', 'AgCl', 'K2SO4', 'BaSO4', 'Fe(OH)3', 'PbI2', 'Ca(OH)2', 'Na2CO3'].map((s) => (
              <button key={s} className="chip font-mono !text-[11.5px]" onClick={() => setInput(s)}>
                {s}
              </button>
            ))}
            {tour.show && (
              <button className="btn btn-subtle h-7 text-[12px]" onClick={tour.start}>
                ? {t('tools.solubility.tutorial')}
              </button>
            )}
          </div>
          <Tour open={tour.open} onClose={tour.close} id="solubility" />
        </div>

        {result && (
          <div className="surface p-4 fade-up">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-2xl font-extrabold">{input}</span>
              <span
                className="rounded-lg px-3 py-1.5 text-sm font-extrabold capitalize"
                style={{ background: tone, color: '#0b1020' }}
              >
                {t(`tools.solubility.${result.overall === 'partly' ? 'partly' : result.overall}`)}
              </span>
            </div>
            {result.note && <p className="muted mt-2 text-xs">{result.note}</p>}

            <div className="mt-4 space-y-2">
              {result.rows.map((r, i) => (
                <div key={i} className="rounded-xl p-2.5" style={{ background: 'var(--surface-2)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold">{r.ion}</span>
                    <span
                      className="rounded-md px-2 py-0.5 text-[11.5px] font-extrabold capitalize"
                      style={{
                        background:
                          r.result === 'soluble'
                            ? 'var(--c-metalloid)'
                            : r.result === 'insoluble'
                              ? 'var(--c-actinide)'
                              : 'var(--c-transition)',
                        color: '#0b1020',
                      }}
                    >
                      {r.result}
                    </span>
                  </div>
                  <p className="muted mt-1 text-[12px]">{r.rule}</p>
                  {r.exceptions && <p className="mt-0.5 text-[11.5px] faint">{r.exceptions}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <aside className="surface h-fit p-4">
        <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wide faint">
          {t('tools.solubility.chart')}
        </h3>
        <SolubilityChart />
        <h3 className="mb-2 mt-4 text-xs font-extrabold uppercase tracking-wide faint">
          {t('tools.solubility.learn')}
        </h3>
        <ul className="space-y-2 text-[11.5px]">
          <li>
            <b className="text-[var(--c-metalloid)]">1</b> <span className="muted">All group-1 and NH₄⁺ salts dissolve.</span>
          </li>
          <li>
            <b className="text-[var(--c-metalloid)]">2</b>{' '}
            <span className="muted">All nitrates, acetates and perchlorates dissolve.</span>
          </li>
          <li>
            <b className="text-[var(--c-actinide)]">3</b>{' '}
            <span className="muted">Most carbonates, phosphates and sulfides do not.</span>
          </li>
          <li>
            <b className="text-[var(--c-actinide)]">4</b>{' '}
            <span className="muted">Chlorides dissolve except with Ag⁺, Pb²⁺, Hg₂²⁺.</span>
          </li>
          <li>
            <b className="text-[var(--c-actinide)]">5</b>{' '}
            <span className="muted">Sulfates dissolve except with Ba²⁺, Sr²⁺, Pb²⁺, Ca²⁺.</span>
          </li>
        </ul>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function Badge({ children, tone = 'ok' }: { children: React.ReactNode; tone?: 'ok' | 'warn' }) {
  return (
    <span
      className="rounded-lg px-2.5 py-1 text-[12px] font-extrabold"
      style={{
        background: tone === 'ok' ? 'var(--c-metalloid)' : 'var(--c-transition)',
        color: '#0b1020',
      }}
    >
      {children}
    </span>
  );
}
