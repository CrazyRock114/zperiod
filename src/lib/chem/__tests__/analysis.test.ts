import { describe, expect, it } from 'vitest';
import { balanceEquation } from '../equation';
import { classifyCompound } from '../solubility';

/**
 * Ambiguity detection and salt classification — the two behaviours the
 * adversarial audit found broken, kept as regressions.
 */
describe('ambiguity detection', () => {
  it('flags under-determined equations and not the rest', () => {
    const cases: Array<[string, number]> = [
      ['C3H8 + O2 -> CO2 + H2O', 0],
      ['H2 + O2 -> H2O', 0],
      ['Fe + O2 -> Fe2O3', 0],
      ['KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2', 0],
      ['Al + HCl -> AlCl3 + H2', 0],
      ['Ag+ + Cl- -> AgCl', 0],
      ['H2 + O2 -> H2O + H2O2', 1],
      ['C + O2 -> CO + CO2', 1],
      ['CH4 + O2 -> CO2 + H2O + C', 1],
    ];
    for (const [eq, want] of cases) {
      const r = balanceEquation(eq);
      expect(r.ok, `${eq} -> ${r.error}`).toBe(true);
      expect(r.freeParameters, `${eq}`).toBe(want);
    }
  });

  it('classifies stoichiometric salt formulas', () => {
    const cases: Array<[string, string]> = [
      ['NaCl', 'soluble'],
      ['KNO3', 'soluble'],
      ['CaSO4', 'partly'],
      ['BaSO4', 'insoluble'],
      ['AgCl', 'insoluble'],
      ['CaCO3', 'insoluble'],
      ['NaOH', 'soluble'],
      ['Fe(OH)3', 'insoluble'],
      // PbI2 is genuinely only sparingly soluble (Ksp ~ 7.9e-9), so "partly"
      // is the more honest verdict than a flat "insoluble".
      ['PbI2', 'partly'],
      ['Ca(OH)2', 'partly'],
    ];
    for (const [f, want] of cases) {
      const c = classifyCompound(f);
      expect(c.overall, `${f} -> ${c.overall} (rows ${c.rows?.length})`).toBe(want);
    }
  });
});
