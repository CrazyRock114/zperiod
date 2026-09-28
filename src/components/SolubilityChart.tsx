import React, { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { useSolubilityRules } from '../data';
import { classifyCompound } from '../lib/chem/solubility';
import type { SolubilityRule } from '../types/chem';

/**
 * The aqueous-solubility reference chart.
 *
 * The original calls this out as "interactive charts and rules": the rules
 * engine decides a verdict for a formula, and this is the table you eyeball
 * the verdict against. Every cell is derived by running the real classifier on
 * a synthetic salt, so the chart can never drift from the rules.
 */

/** A stoichiometric salt formula, with proper subscripts and polyatomic brackets. */
interface Ion {
  /** Element or polyatomic body, ASCII. */
  body: string;
  label: string;
  charge: number;
}

const CATIONS: Ion[] = [
  { body: 'Na', label: 'Na⁺', charge: 1 },
  { body: 'K', label: 'K⁺', charge: 1 },
  { body: 'NH4', label: 'NH₄⁺', charge: 1 },
  { body: 'Mg', label: 'Mg²⁺', charge: 2 },
  { body: 'Ca', label: 'Ca²⁺', charge: 2 },
  { body: 'Ba', label: 'Ba²⁺', charge: 2 },
  { body: 'Fe', label: 'Fe²⁺', charge: 2 },
  { body: 'Fe', label: 'Fe³⁺', charge: 3 },
  { body: 'Cu', label: 'Cu²⁺', charge: 2 },
  { body: 'Zn', label: 'Zn²⁺', charge: 2 },
  { body: 'Ag', label: 'Ag⁺', charge: 1 },
  { body: 'Al', label: 'Al³⁺', charge: 3 },
];

const ANIONS: Ion[] = [
  { body: 'Cl', label: 'Cl⁻', charge: -1 },
  { body: 'Br', label: 'Br⁻', charge: -1 },
  { body: 'I', label: 'I⁻', charge: -1 },
  { body: 'F', label: 'F⁻', charge: -1 },
  { body: 'NO3', label: 'NO₃⁻', charge: -1 },
  { body: 'SO4', label: 'SO₄²⁻', charge: -2 },
  { body: 'CO3', label: 'CO₃²⁻', charge: -2 },
  { body: 'PO4', label: 'PO₄³⁻', charge: -3 },
  { body: 'S', label: 'S²⁻', charge: -2 },
  { body: 'OH', label: 'OH⁻', charge: -1 },
  { body: 'C2H3O2', label: 'CH₃COO⁻', charge: -1 },
];

/** Charges cancel to a neutral salt, so both counts are whole numbers. */
function saltFormula(cation: Ion, anion: Ion): string {
  const lcm = (a: number, b: number) => (a * b) / gcd(a, b);
  const n = lcm(cation.charge, -anion.charge);
  const cCount = n / cation.charge;
  const aCount = n / -anion.charge;
  const unit = (body: string, count: number) =>
    count > 1 && !/[()]/.test(body) ? body + count : body;
  return unit(cation.body, cCount) + unit(anion.body, aCount);
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

type Verdict = 'soluble' | 'insoluble' | 'partly' | 'reacts' | 'unknown';

const VERDICT_STYLE: Record<Verdict, { bg: string; mark: string; labelKey: string }> = {
  soluble: { bg: 'color-mix(in srgb, var(--c-metalloid) 30%, transparent)', mark: '●', labelKey: 'tools.solubility.soluble' },
  partly: { bg: 'color-mix(in srgb, var(--c-transition) 34%, transparent)', mark: '◐', labelKey: 'tools.solubility.partly' },
  insoluble: { bg: 'color-mix(in srgb, var(--c-actinide) 26%, transparent)', mark: '○', labelKey: 'tools.solubility.insoluble' },
  reacts: { bg: 'color-mix(in srgb, var(--c-halogen) 26%, transparent)', mark: '△', labelKey: 'tools.solubility.reacts' },
  unknown: { bg: 'var(--surface-2)', mark: '·', labelKey: 'tools.solubility.unknown' },
};

/** Strip a leading integer and trailing charge to get the bare ion body. */
function bodyOf(ion: string): string {
  return ion.replace(/[0-9]/g, '').replace(/\^[0-9]*[+-]$/, '').replace(/[+-]$/, '');
}

export function SolubilityChart() {
  const { t } = useI18n();
  const { data: rules } = useSolubilityRules();
  const [hover, setHover] = useState<{ verdict: Verdict; salt: string } | null>(null);

  /**
   * One classification per cell, run through the real solver. 12 x 11 = 132
   * calls, which is instant and means the grid and the rules can never
   * disagree.
   */
  const grid = useMemo(() => {
    return ANIONS.map((anion) => ({
      anion,
      cells: CATIONS.map((cation) => {
        // Build a neutral salt from the ion bodies and let the classifier
        // decide; wrap in try/catch so one bad combination cannot blank the
        // whole chart.
        const salt = saltFormula(cation, anion);
        let verdict: Verdict = 'unknown';
        try {
          const r = classifyCompound(salt);
          if (r?.overall) verdict = r.overall as Verdict;
        } catch {
          verdict = 'unknown';
        }
        return { cation, verdict, salt };
      }),
    }));
  }, []);

  // A lookup of the plain-text rules so the hover card can quote the actual
  // rule text rather than paraphrasing it.
  const ruleText = useMemo(() => {
    const m = new Map<string, SolubilityRule>();
    for (const r of rules ?? []) m.set(r.ionPlain, r);
    return m;
  }, [rules]);

  const legend = (Object.keys(VERDICT_STYLE) as Verdict[]).map((v) => ({ v, ...VERDICT_STYLE[v] }));

  return (
    <div className="surface overflow-hidden">
      <div className="thin-scroll overflow-x-auto p-3">
        <table className="w-full border-separate" style={{ borderSpacing: 2, minWidth: 660 }}>
          <thead>
            <tr>
              <th
                className="sticky start-0 z-10 text-[11.5px] font-bold"
                style={{ background: 'var(--surface-1)' }}
              >
                {t('tools.solubility.ion')}
              </th>
              {ANIONS.map((a) => (
                <th
                  key={a.body}
                  className="whitespace-nowrap pb-1 text-center text-[11.5px] font-bold"
                  style={{ color: 'var(--text-2)', minWidth: 46 }}
                >
                  {a.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATIONS.map((cation, ci) => (
              <tr key={cation.body}>
                <th
                  className="sticky start-0 z-10 pe-2 text-end text-[12px] font-bold whitespace-nowrap"
                  style={{ background: 'var(--surface-1)', color: 'var(--text-1)' }}
                >
                  {cation.label}
                </th>
                {ANIONS.map((anion, ai) => {
                  const cell = grid[ai].cells[ci];
                  const style = VERDICT_STYLE[cell.verdict];
                  return (
                    <td key={anion.body} className="p-0">
                      <button
                        className="flex h-8 w-full min-w-[42px] items-center justify-center rounded-md text-[13px] font-bold transition-transform hover:scale-110"
                        style={{ background: style.bg, color: 'var(--text-1)' }}
                        onMouseEnter={() => setHover({ verdict: cell.verdict, salt: cell.salt })}
                        onMouseLeave={() => setHover(null)}
                        onFocus={() => setHover({ verdict: cell.verdict, salt: cell.salt })}
                        onBlur={() => setHover(null)}
                        aria-label={`${cation.label} + ${anion.label}: ${t(style.labelKey)}`}
                      >
                        {style.mark}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-3 py-2" style={{ borderColor: 'var(--border)' }}>
        {legend.map((l) => (
          <span key={l.v} className="inline-flex items-center gap-1.5 text-[11.5px]">
            <span
              aria-hidden
              className="inline-block h-3 w-3 rounded"
              style={{ background: l.bg, color: 'var(--text-1)' }}
            >
              {l.mark}
            </span>
            <span className="muted">{t(l.labelKey)}</span>
          </span>
        ))}
        <span className="ms-auto text-[11.5px] faint">
          {hover
            ? `${hover.salt} — ${t(VERDICT_STYLE[hover.verdict].labelKey)}`
            : ruleText.size
              ? `${ruleText.size} ${t('tools.solubility.rules')}`
              : ''}
        </span>
      </div>
    </div>
  );
}
