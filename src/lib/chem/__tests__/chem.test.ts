/**
 * Chemistry engine test suite.
 *
 * Run with `npm test` (`vitest run`).
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  parseFormula,
  formatFormula,
  toPlainFormula,
  formatParsedFormula,
  normalizeFormula,
  toSubscript,
  toSuperscript,
  formatCharge,
  atomsToMap,
  isValidFormula,
} from '../formula';
import { ELEMENT_SYMBOLS, SYMBOL_TO_Z, isElementSymbol } from '../elementSymbols';
import { ATOMIC_MASSES } from '../atomicMasses';
import {
  molarMass,
  parseChemicalFormula,
  convertMolarMass,
  molarityFromSolution,
  massConcentrationToMolarity,
  molarityToMassConcentration,
  massFraction,
  roundTo,
} from '../mass';
import {
  balanceEquation,
  classifyReaction,
  describeStoichiometry,
  parseEquation,
  formatEquationSide,
} from '../equation';
import { COMPOUND_NAMES, compoundName, systematicName, pluralise } from '../compoundNames';
import { symbolToPlainIon, splitIntoIons } from '../ions';
import {
  REACTION_BANK,
  REACTION_TEMPLATES,
  REACTION_TYPES,
  pickReactions,
  reactionBankCounts,
  makeUnbalanced,
  mulberry32,
} from '../reactions';
import { generateWorksheet, exerciseSplit, buildPrintableHtml, exportWorksheetToPdf, worksheetSeed } from '../worksheet';
import {
  classifyCompound,
  solubilitySummary,
  resetSolubilityRules,
  setSolubilityRules,
  getSolubilityRuleSource,
  type SolubilityRule,
} from '../solubility';
import { FALLBACK_SOLUBILITY_RULES } from '../solubilityFallback';
import type { ReactionType, WorksheetConfig } from '../../../types/chem';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const arrowOf = (plain: string): [string, string] => {
  const index = plain.indexOf('->');
  return [plain.slice(0, index).trim(), plain.slice(index + 2).trim()];
};

const speciesOf = (side: string): string[] =>
  side.split(' + ').map((s) => s.trim().replace(/^\d+\s*/, ''));
const coefficientsOf = (side: string): number[] =>
  side.split(' + ').map((s) => {
    const m = /^(\d+)/.exec(s.trim());
    return m ? Number(m[1]) : 1;
  });

/* ------------------------------------------------------------------ */
/* Element table                                                       */
/* ------------------------------------------------------------------ */

describe('element symbols', () => {
  it('has exactly 118 symbols ordered by atomic number', () => {
    expect(ELEMENT_SYMBOLS).toHaveLength(118);
    expect(ELEMENT_SYMBOLS[0]).toBe('H');
    expect(ELEMENT_SYMBOLS[1]).toBe('He');
    expect(ELEMENT_SYMBOLS[7]).toBe('O');
    expect(ELEMENT_SYMBOLS[25]).toBe('Fe');
    expect(ELEMENT_SYMBOLS[91]).toBe('U');
    expect(ELEMENT_SYMBOLS[117]).toBe('Og');
    expect(new Set(ELEMENT_SYMBOLS).size).toBe(118);
  });

  it('maps every symbol to its atomic number', () => {
    expect(SYMBOL_TO_Z.H).toBe(1);
    expect(SYMBOL_TO_Z.O).toBe(8);
    expect(SYMBOL_TO_Z.Fe).toBe(26);
    expect(SYMBOL_TO_Z.Ag).toBe(47);
    expect(SYMBOL_TO_Z.Og).toBe(118);
    for (const symbol of ELEMENT_SYMBOLS) {
      expect(isElementSymbol(symbol)).toBe(true);
    }
    expect(isElementSymbol('Xx')).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Formula parsing                                                     */
/* ------------------------------------------------------------------ */

describe('parseFormula', () => {
  it('parses Ca(OH)2 into 1 Ca, 2 O, 2 H', () => {
    const result = parseFormula('Ca(OH)2');
    expect(result.ok).toBe(true);
    expect(result.charge).toBe(0);
    expect(result.atoms).toEqual([
      { element: 'Ca', count: 1 },
      { element: 'O', count: 2 },
      { element: 'H', count: 2 },
    ]);
  });

  it('parses K4[Fe(CN)6] into 4 K, 1 Fe, 6 C, 6 N', () => {
    const result = parseFormula('K4[Fe(CN)6]');
    expect(result.ok).toBe(true);
    expect(result.atoms).toEqual([
      { element: 'K', count: 4 },
      { element: 'Fe', count: 1 },
      { element: 'C', count: 6 },
      { element: 'N', count: 6 },
    ]);
  });

  it('handles nested parentheses and square brackets with multipliers', () => {
    expect(parseFormula('Mg3(PO4)2').atoms).toEqual([
      { element: 'Mg', count: 3 },
      { element: 'P', count: 2 },
      { element: 'O', count: 8 },
    ]);
    expect(parseFormula('(NH4)2SO4').atoms).toEqual([
      { element: 'N', count: 2 },
      { element: 'H', count: 8 },
      { element: 'S', count: 1 },
      { element: 'O', count: 4 },
    ]);
    expect(parseFormula('Al2(SO4)3').atoms).toEqual([
      { element: 'Al', count: 2 },
      { element: 'S', count: 3 },
      { element: 'O', count: 12 },
    ]);
    // Two levels of nesting, and a group inside a group.
    const nested = parseFormula('(Ca3(PO4)2)2');
    expect(nested.ok).toBe(true);
    expect(nested.atoms).toEqual([
      { element: 'Ca', count: 6 },
      { element: 'P', count: 4 },
      { element: 'O', count: 16 },
    ]);
  });

  it('accepts unicode subscripts and normalises them', () => {
    expect(parseFormula('Ca(OH)₂').atoms).toEqual(parseFormula('Ca(OH)2').atoms);
    expect(parseFormula('K₄[Fe(CN)₆]').atoms).toEqual(parseFormula('K4[Fe(CN)6]').atoms);
    expect(parseFormula('H₂SO₄').atoms).toEqual([
      { element: 'H', count: 2 },
      { element: 'S', count: 1 },
      { element: 'O', count: 4 },
    ]);
    expect(normalizeFormula('H₂O')).toBe('H2O');
  });

  it('reads every charge notation', () => {
    expect(parseFormula('SO4^2-').charge).toBe(-2);
    expect(parseFormula('SO₄²⁻').charge).toBe(-2);
    expect(parseFormula('PO₄³⁻').charge).toBe(-3);
    expect(parseFormula('Fe3+').charge).toBe(3);
    expect(parseFormula('Fe³⁺').charge).toBe(3);
    expect(parseFormula('Ca2+').charge).toBe(2);
    expect(parseFormula('Na+').charge).toBe(1);
    expect(parseFormula('Cl-').charge).toBe(-1);
    expect(parseFormula('NH₄⁺').charge).toBe(1);
    // A plain-ASCII subscript must not be mistaken for a charge: NO3- is nitrate.
    expect(parseFormula('NO3-').charge).toBe(-1);
    expect(parseFormula('NO3-').atoms).toEqual([
      { element: 'N', count: 1 },
      { element: 'O', count: 3 },
    ]);
  });

  it('handles hydrates, a leading coefficient and whitespace', () => {
    expect(parseFormula('CuSO4·5H2O').atoms).toEqual([
      { element: 'Cu', count: 1 },
      { element: 'S', count: 1 },
      { element: 'O', count: 9 },
      { element: 'H', count: 10 },
    ]);
    const withCoefficient = parseFormula('2H2O');
    expect(withCoefficient.coefficient).toBe(2);
    expect(withCoefficient.atoms).toEqual(parseFormula('H2O').atoms);
    expect(parseFormula('  C a ( O H ) 2 ').ok).toBe(true);
  });

  it('reports human-readable errors for malformed input instead of throwing', () => {
    const bad = ['', '   ', 'Xx2', '2', '()', '(H2O', 'H2O)', 'H2O)2', 'Ca(OH', 'H2xO', '@@', 'H^2', 'Na Cl!'];
    for (const input of bad) {
      const result = parseFormula(input);
      expect(result.ok, `expected ${JSON.stringify(input)} to fail`).toBe(false);
      expect(typeof result.error).toBe('string');
      expect((result.error ?? '').length).toBeGreaterThan(0);
      expect(result.atoms).toEqual([]);
    }
    expect(isValidFormula('H2O')).toBe(true);
    expect(isValidFormula('H2O)')).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Formula rendering                                                   */
/* ------------------------------------------------------------------ */

describe('formatting', () => {
  it('renders unicode subscripts and superscripts', () => {
    expect(toSubscript(2)).toBe('₂');
    expect(toSubscript(12)).toBe('₁₂');
    expect(toSuperscript(3)).toBe('³');
    expect(toSuperscript(10)).toBe('¹⁰');
    expect(formatCharge(-2)).toBe('²⁻');
    expect(formatCharge(1)).toBe('⁺');
    expect(formatCharge(0)).toBe('');
  });

  it('formats a parsed formula, preserving its grouping', () => {
    expect(formatFormula(parseFormula('Ca(OH)2').atoms, 0, parseFormula('Ca(OH)2').group)).toBe('Ca(OH)₂');
    expect(formatFormula(parseFormula('H2O').atoms)).toBe('H₂O');
    expect(formatFormula(parseFormula('SO4^2-').atoms, parseFormula('SO4^2-').charge)).toBe('SO₄²⁻');
    expect(formatParsedFormula('Al2(SO4)3')).toBe('Al₂(SO₄)₃');
    expect(formatParsedFormula('K4[Fe(CN)6]')).toBe('K₄[Fe(CN)₆]');
    expect(formatParsedFormula('CuSO4·5H2O')).toBe('CuSO₄·5H₂O');
    expect(formatParsedFormula('CuSO4.5H2O')).toBe('CuSO₄·5H₂O');
    expect(toPlainFormula('CuSO4·5H2O')).toBe('CuSO4.5H2O');
  });

  it('produces plain ASCII forms', () => {
    expect(toPlainFormula('Ca(OH)₂')).toBe('Ca(OH)2');
    expect(toPlainFormula('SO₄²⁻')).toBe('SO4^2-');
    expect(toPlainFormula('Al₂(SO₄)₃')).toBe('Al2(SO4)3');
    expect(toPlainFormula('K₄[Fe(CN)₆]')).toBe('K4[Fe(CN)6]');
    expect(toPlainFormula('Fe³⁺')).toBe('Fe^3+');
    expect(toPlainFormula('H₂O')).toBe('H2O');
  });

  it('round-trips through atoms', () => {
    const formula = 'Al2(SO4)3';
    const parsed = parseFormula(formula);
    expect(atomsToMap(parsed.atoms)).toEqual({ Al: 2, S: 3, O: 12 });
    expect(toPlainFormula(formula)).toBe(formula);
  });
});

/* ------------------------------------------------------------------ */
/* Molar mass                                                          */
/* ------------------------------------------------------------------ */

describe('molarMass', () => {
  it('reuses the formula parser', () => {
    const result = parseChemicalFormula('Ca(OH)2');
    expect(result.ok).toBe(true);
    expect(result.atoms[0]).toEqual({ element: 'Ca', count: 1 });
  });

  it('has an average mass for all 118 elements', () => {
    expect(Object.keys(ATOMIC_MASSES)).toHaveLength(118);
    for (const symbol of ELEMENT_SYMBOLS) {
      const mass = ATOMIC_MASSES[symbol];
      expect(typeof mass, `missing mass for ${symbol}`).toBe('number');
      expect(mass, `bad mass for ${symbol}`).toBeGreaterThan(0);
    }
    expect(ATOMIC_MASSES.H).toBeCloseTo(1.008, 3);
    expect(ATOMIC_MASSES.O).toBeCloseTo(15.999, 2);
    expect(ATOMIC_MASSES.C).toBeCloseTo(12.011, 2);
  });

  it('computes the standard molar masses', () => {
    expect(molarMass('H2O').molarMass).toBe(18.015);
    expect(molarMass('CO2').molarMass).toBe(44.009);
    expect(molarMass('Ca(OH)2').molarMass).toBe(74.093);
    expect(molarMass('C6H12O6').molarMass).toBe(180.156);
    expect(molarMass('NaCl').molarMass).toBe(58.443);
  });

  it('breaks the mass down per element with percentages that sum to 100', () => {
    for (const formula of ['H2O', 'CO2', 'Ca(OH)2', 'C6H12O6', 'K4[Fe(CN)6]', 'Al2(SO4)3']) {
      const result = molarMass(formula);
      expect(result.ok, formula).toBe(true);
      const sum = result.breakdown.reduce((acc, entry) => acc + entry.mass, 0);
      expect(sum, `${formula} mass sum`).toBeCloseTo(result.molarMass, 2);
      const total = result.breakdown.reduce((acc, entry) => acc + entry.percentage, 0);
      expect(total, `${formula} percentage sum`).toBeCloseTo(100, 1);
      expect(result.massFractionOk, `${formula} massFractionOk`).toBe(true);
      expect(result.percentageTotal).toBeCloseTo(100, 1);
      for (const entry of result.breakdown) {
        expect(entry.element).toBe(entry.symbol);
        expect(entry.mass).toBeCloseTo(ATOMIC_MASSES[entry.element] * entry.count, 2);
        expect(entry.percentage).toBeGreaterThan(0);
      }
    }
  });

  it('counts electrons and protons, adjusting for charge', () => {
    const neutral = molarMass('NaCl');
    expect(neutral.totalProtons).toBe(11 + 17);
    expect(neutral.totalElectrons).toBe(28);
    const cation = molarMass('Fe3+');
    expect(cation.totalProtons).toBe(26);
    expect(cation.totalElectrons).toBe(23);
    const anion = molarMass('SO4^2-');
    expect(anion.totalProtons).toBe(16 + 4 * 8);
    expect(anion.totalElectrons).toBe(anion.totalProtons + 2);
  });

  it('reports errors instead of throwing', () => {
    for (const input of ['', 'Xx2', '(H2O', '()']) {
      const result = molarMass(input);
      expect(result.ok).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.molarMass).toBe(0);
    }
  });

  it('exposes mass fractions', () => {
    expect(massFraction('H2O', 'H')).toBeCloseTo(0.1119, 3);
    expect(massFraction('H2O', 'O')).toBeCloseTo(0.8881, 3);
    expect(massFraction('H2O', 'Fe')).toBe(0);
  });
});

describe('unit conversion', () => {
  it('converts between molar-mass and concentration units', () => {
    expect(convertMolarMass(18.015, 'g/mol', 'kg/kmol').value).toBe(18.015);
    expect(convertMolarMass(18.015, 'g/mol', 'mg/L').value).toBeCloseTo(18015, 3);
    expect(convertMolarMass(18.015, 'g/mol', 'g/L').value).toBeCloseTo(18.015, 3);
    expect(convertMolarMass(1000, 'mg/L', 'g/L').value).toBe(1);
    expect(convertMolarMass(1, 'g/L', 'g/100mL').value).toBeCloseTo(0.1, 6);
    expect(convertMolarMass(1, 'g/mol', 'g/mol').ok).toBe(true);
  });

  it('reports unsupported units and values', () => {
    expect(convertMolarMass(1, 'g/mol', 'parsec' as never).ok).toBe(false);
    expect(convertMolarMass(Number.NaN, 'g/mol', 'kg/kmol').ok).toBe(false);
  });

  it('computes molarity from a solution mass and volume', () => {
    const result = molarityFromSolution({ massG: 9.8078, formula: 'H2SO4', volume: 100, volumeUnit: 'mL' });
    expect(result.ok).toBe(true);
    expect(result.volumeL).toBeCloseTo(0.1, 6);
    expect(result.moles).toBeCloseTo(0.1, 4);
    expect(result.molarity).toBeCloseTo(1, 4);

    const byMass = molarityFromSolution({ massG: 5.85, formula: 'NaCl', volume: 500, volumeUnit: 'mL' });
    expect(byMass.molarity).toBeCloseTo(0.2, 3);
    expect(byMass.massConcentration).toBeCloseTo(11.7, 3);

    const withMolarMass = molarityFromSolution({ massG: 10, molarMass: 20, volume: 1 });
    expect(withMolarMass.molarity).toBeCloseTo(0.5, 6);
  });

  it('reports bad solution input', () => {
    expect(molarityFromSolution({ massG: 1, volume: 0 }).ok).toBe(false);
    expect(molarityFromSolution({ massG: -1, volume: 1, formula: 'H2O' }).ok).toBe(false);
    expect(molarityFromSolution({ massG: 1, volume: 1 }).ok).toBe(false);
    expect(molarityFromSolution({ massG: 1, volume: 1, formula: 'Zz' }).ok).toBe(false);
  });

  it('converts between molarity and mass concentration', () => {
    expect(molarityToMassConcentration(1, 'NaCl')).toBeCloseTo(58.443, 3);
    expect(massConcentrationToMolarity(58.443, 'NaCl').molarity).toBeCloseTo(1, 3);
    expect(molarityToMassConcentration(1, 'Zz')).toBe(0);
  });

  it('rounds half-ties toward zero so tabulated masses match', () => {
    expect(roundTo(44.0095, 3)).toBe(44.009);
    expect(roundTo(74.09268, 3)).toBe(74.093);
    expect(roundTo(1.2345, 3)).toBe(1.234);
    expect(roundTo(1.2355, 3)).toBe(1.235);
  });
});

/* ------------------------------------------------------------------ */
/* Balancing                                                           */
/* ------------------------------------------------------------------ */

describe('balanceEquation', () => {
  it('balances hydrogen and oxygen to water', () => {
    const result = balanceEquation('H2 + O2 -> H2O');
    expect(result.ok).toBe(true);
    expect(result.balanced).toBe('2H₂ + O₂ → 2H₂O');
    expect(result.balancedPlain).toBe('2H2 + O2 -> 2H2O');
    expect(result.coefficients).toEqual([2, 1, 2]);
    expect(result.reduced).toBe(false);
    expect(result.reactants).toHaveLength(2);
    expect(result.products).toHaveLength(1);
    expect(result.reactants[0].formula).toBe('H₂');
    expect(result.products[0].formula).toBe('H₂O');
    expect(result.products[0].mass).toBeCloseTo(18.015, 3);
  });

  it('balances iron burning to iron(III) oxide', () => {
    const result = balanceEquation('Fe + O2 -> Fe2O3');
    expect(result.balanced).toBe('4Fe + 3O₂ → 2Fe₂O₃');
    expect(result.coefficients).toEqual([4, 3, 2]);
  });

  it('balances propane combustion, keeping the leading 1', () => {
    const result = balanceEquation('C3H8 + O2 -> CO2 + H2O');
    expect(result.balanced).toBe('1C₃H₈ + 5O₂ → 3CO₂ + 4H₂O');
    expect(result.balancedPlain).toBe('1C3H8 + 5O2 -> 3CO2 + 4H2O');
    expect(result.coefficients).toEqual([1, 5, 3, 4]);
  });

  it('leaves an already-balanced equation unchanged with reduced === true', () => {
    for (const input of [
      'CaCO3 -> CaO + CO2',
      'NaCl + AgNO3 -> AgCl + NaNO3',
      'Fe + CuSO4 -> FeSO4 + Cu',
      '2H2O2 -> 2H2O + O2',
      '2Al + 3CuSO4 -> 3Cu + Al2(SO4)3',
    ]) {
      const result = balanceEquation(input);
      expect(result.ok, input).toBe(true);
      expect(result.balancedPlain, input).toBe(input);
      expect(result.reduced, input).toBe(true);
    }
  });

  it('keeps the coefficients of an already-balanced equation even when it re-prints them', () => {
    const result = balanceEquation('Ca(OH)2 + H2SO4 -> CaSO4 + 2H2O');
    expect(result.ok).toBe(true);
    expect(result.reduced).toBe(true);
    expect(result.coefficients).toEqual([1, 1, 1, 2]);
    const [left, right] = arrowOf(result.balancedPlain);
    expect(coefficientsOf(left)).toEqual([1, 1]);
    expect(coefficientsOf(right)).toEqual([1, 2]);
    expect(speciesOf(right)).toEqual(['CaSO4', 'H2O']);
  });

  it('re-derives coefficients that were written wrongly', () => {
    const result = balanceEquation('2Na + 2Cl2 -> 4NaCl');
    expect(result.ok).toBe(true);
    expect(result.coefficients).toEqual([2, 1, 2]);
    expect(result.reduced).toBe(false);
  });

  it('always produces the smallest whole-number coefficients', () => {
    for (const input of [
      'H2 + O2 -> H2O',
      'Fe + O2 -> Fe2O3',
      'C3H8 + O2 -> CO2 + H2O',
      'KClO3 -> KCl + O2',
      'C6H12O6 + O2 -> CO2 + H2O',
      'Ba(OH)2 + H3PO4 -> Ba3(PO4)2 + H2O',
    ]) {
      const result = balanceEquation(input);
      expect(result.ok, input).toBe(true);
      const [left, right] = arrowOf(result.balancedPlain);
      const all = [...coefficientsOf(left), ...coefficientsOf(right)];
      const gcd = all.reduce((a, b) => {
        let x = a;
        let y = b;
        while (y) {
          const t = x % y;
          x = y;
          y = t;
        }
        return x;
      }, 0);
      expect(gcd, `${input} should be in lowest terms`).toBe(1);
      expect(all.every((c) => Number.isInteger(c) && c > 0)).toBe(true);
      // Every element must be conserved exactly.
      const parsed = parseEquation(result.balancedPlain);
      expect(parsed.ok).toBe(true);
      const elements = new Set<string>();
      for (const s of [...parsed.left, ...parsed.right]) for (const a of s.atoms) elements.add(a.element);
      for (const element of elements) {
        let l = 0;
        let r = 0;
        parsed.left.forEach((s, i) => (l += (atomsToMap(s.atoms)[element] ?? 0) * coefficientsOf(arrowOf(result.balancedPlain)[0])[i]));
        parsed.right.forEach((s, i) => (r += (atomsToMap(s.atoms)[element] ?? 0) * coefficientsOf(arrowOf(result.balancedPlain)[1])[i]));
        expect(l, `${input}: ${element}`).toBe(r);
      }
    }
  });

  it('conserves charge in an ionic equation', () => {
    const result = balanceEquation('Ag+ + Cl- -> AgCl');
    expect(result.ok).toBe(true);
    expect(result.ionic).toBe(true);
    expect(result.coefficients).toEqual([1, 1, 1]);

    const net = balanceEquation('Ca2+ + 2OH- -> Ca(OH)2');
    expect(net.ok).toBe(true);
    expect(net.coefficients).toEqual([1, 2, 1]);
    expect(net.reduced).toBe(true);

    const precipitate = balanceEquation('2Ag+ + 2Cl- -> 2AgCl');
    expect(precipitate.ok).toBe(true);
    expect(precipitate.coefficients).toEqual([1, 1, 1]);

    const chargeOf = (side: string): number =>
      speciesOf(side).reduce((acc, formula, i) => {
        const parsed = parseFormula(formula);
        return acc + parsed.charge * coefficientsOf(side)[i];
      }, 0);
    const [left, right] = arrowOf(result.balancedPlain);
    expect(chargeOf(left)).toBe(chargeOf(right));
  });

  it('preserves the user species order on each side', () => {
    const result = balanceEquation('O2 + H2 -> H2O');
    expect(result.reactants.map((s) => s.formulaPlain)).toEqual(['O2', 'H2']);
    expect(result.products.map((s) => s.formulaPlain)).toEqual(['H2O']);
    expect(result.coefficients).toEqual([1, 2, 2]);
  });

  it('accepts every arrow notation and strips written coefficients', () => {
    for (const arrow of ['->', '→', '=', '⟶', '-->']) {
      const result = balanceEquation(`H2 + O2 ${arrow} H2O`);
      expect(result.ok, arrow).toBe(true);
      expect(result.coefficients).toEqual([2, 1, 2]);
    }
  });

  it('returns ok:false with a readable error for bad input, and never throws', () => {
    const bad = [
      '',
      '   ',
      'garbage input here',
      'H2 + O2',
      '-> H2O',
      'H2 + O2 ->',
      ' -> ',
      'H2 + H2 -> H2O',
      '2Xx2 + O2 -> XxO',
      'H2O -> H2O',
      'Ca(OH2 -> CaO',
      'Na+ + OH-',
      'Fe + CuSO4 -> FeSO4 + Cu + Zn',
    ];
    for (const input of bad) {
      let result!: ReturnType<typeof balanceEquation>;
      expect(() => {
        result = balanceEquation(input);
      }, `threw on ${JSON.stringify(input)}`).not.toThrow();
      expect(result.ok, `expected failure for ${JSON.stringify(input)}`).toBe(false);
      expect(typeof result.error).toBe('string');
      expect((result.error ?? '').length).toBeGreaterThan(5);
      expect(result.balanced).toBe('');
      expect(result.reactants).toEqual([]);
      expect(result.products).toEqual([]);
    }
  });

  it('exposes a human-readable walkthrough', () => {
    const result = balanceEquation('C3H8 + O2 -> CO2 + H2O');
    expect(result.steps).toBeTruthy();
    expect((result.steps ?? []).join(' ')).toContain('C: 3');
    // The leading "1" is opted into by the caller and applies to the
    // equation's first species only — see the comment on formatEquationSide.
    expect(formatEquationSide(result.reactants, 'plain', true)).toBe('1C3H8 + 5O2');
    expect(formatEquationSide(result.reactants, 'plain')).toBe('C3H8 + 5O2');
    expect(formatEquationSide(result.products, 'plain')).toBe('3CO2 + 4H2O');
  });
});

/* ------------------------------------------------------------------ */
/* Classification and naming                                           */
/* ------------------------------------------------------------------ */

describe('classifyReaction', () => {
  const cases: Array<[string, ReactionType | null]> = [
    ['2H2 + O2 -> 2H2O', 'synthesis'],
    ['N2 + 3H2 -> 2NH3', 'synthesis'],
    ['CaO + H2O -> Ca(OH)2', 'synthesis'],
    ['CaCO3 -> CaO + CO2', 'decomposition'],
    ['2KClO3 -> 2KCl + 3O2', 'decomposition'],
    ['2H2O2 -> 2H2O + O2', 'decomposition'],
    ['Fe + CuSO4 -> FeSO4 + Cu', 'single-replacement'],
    ['2Na + 2H2O -> 2NaOH + H2', 'single-replacement'],
    ['3H2 + Fe2O3 -> 2Fe + 3H2O', 'single-replacement'],
    ['NaCl + AgNO3 -> AgCl + NaNO3', 'double-replacement'],
    ['Ca(OH)2 + H2SO4 -> CaSO4 + 2H2O', 'double-replacement'],
    ['BaCl2 + Na2SO4 -> BaSO4 + 2NaCl', 'double-replacement'],
    ['CH4 + 2O2 -> CO2 + 2H2O', 'combustion'],
    ['2C8H18 + 25O2 -> 16CO2 + 18H2O', 'combustion'],
    ['C2H6O + 3O2 -> 2CO2 + 3H2O', 'combustion'],
    ['', null],
    ['not an equation', null],
    ['A + B -> C + D', null],
  ];

  for (const [input, expected] of cases) {
    it(`classifies ${JSON.stringify(input)} as ${expected}`, () => {
      expect(classifyReaction(input)).toBe(expected);
    });
  }
});

describe('compound names', () => {
  it('looks up the required names', () => {
    expect(COMPOUND_NAMES.H2O).toBe('water');
    expect(COMPOUND_NAMES.CO2).toBe('carbon dioxide');
    expect(COMPOUND_NAMES.CaCO3).toBe('calcium carbonate');
    expect(COMPOUND_NAMES.NaCl).toBe('sodium chloride');
    expect(COMPOUND_NAMES.CH4).toBe('methane');
    expect(COMPOUND_NAMES.C2H6O).toBe('ethanol');
    expect(COMPOUND_NAMES.H2SO4).toBe('sulfuric acid');
    expect(COMPOUND_NAMES.NaOH).toBe('sodium hydroxide');
    expect(COMPOUND_NAMES.NH3).toBe('ammonia');
    expect(COMPOUND_NAMES['Ca(OH)2']).toBe('calcium hydroxide');
    expect(COMPOUND_NAMES.Fe2O3).toBe('iron(III) oxide');
    expect(COMPOUND_NAMES.MgO).toBe('magnesium oxide');
    expect(COMPOUND_NAMES.CuSO4).toBe('copper(II) sulfate');
  });

  it('has at least 80 entries, all keyed by a parseable plain formula', () => {
    const keys = Object.keys(COMPOUND_NAMES);
    expect(keys.length).toBeGreaterThanOrEqual(80);
    for (const key of keys) {
      expect(parseFormula(key).ok, `${key} is not a formula`).toBe(true);
      expect(typeof COMPOUND_NAMES[key]).toBe('string');
      expect(COMPOUND_NAMES[key].length).toBeGreaterThan(1);
    }
  });

  it('falls back to a systematic name', () => {
    expect(compoundName('H2O')).toBe('water');
    expect(compoundName('KMnO4')).toBe('potassium permanganate');
    expect(compoundName('K2Cr2O7')).toBe('potassium dichromate');
    expect(compoundName('Cu(NO3)2')).toBe('copper(II) nitrate');
    expect(compoundName('FeSO4')).toBe('iron(II) sulfate');
    expect(compoundName('AgF')).toBe('silver fluoride');
    expect(systematicName('Ba(NO3)2')).toBe('barium nitrate');
    expect(systematicName('CaI2')).toBe('calcium iodide');
    // Fixed-composition salts drop the stoichiometric multiplier: Li3PO4 is
    // just "lithium phosphate" in IUPAC usage.
    expect(systematicName('Li3PO4')).toBe('lithium phosphate');
    // A stoich coefficient is ignored.
    expect(compoundName('2H2O')).toBe('water');
    expect(compoundName('')).toBe('');
    expect(compoundName('Zz9')).toBe('');
  });

  it('describes stoichiometry in English', () => {
    const water = balanceEquation('2H2 + O2 -> 2H2O');
    expect(describeStoichiometry(water)).toBe('2 mol of water');

    const combustion = balanceEquation('CH4 + 2O2 -> CO2 + 2H2O');
    expect(describeStoichiometry(combustion)).toBe('1 mol of carbon dioxide and 2 mol of water');

    const salt = balanceEquation('CaCO3 + 2HCl -> CaCl2 + H2O + CO2');
    const text = describeStoichiometry(salt);
    expect(text).toBe('1 mol of calcium chloride, 1 mol of water and 1 mol of carbon dioxide');
    expect(text).not.toContain('carbonate');
    expect(describeStoichiometry({ ...water, ok: false })).toBe('');
  });

  it('pluralises when needed', () => {
    expect(pluralise('water', 1)).toBe('water');
    expect(pluralise('water', 2)).toBe('waters');
    expect(pluralise('match', 2)).toBe('matches');
  });
});

/* ------------------------------------------------------------------ */
/* Ions                                                                */
/* ------------------------------------------------------------------ */

describe('symbolToPlainIon', () => {
  it('converts unicode ion symbols to plain ASCII', () => {
    expect(symbolToPlainIon('SO₄²⁻')).toBe('SO4^2-');
    expect(symbolToPlainIon('Fe³⁺')).toBe('Fe^3+');
    expect(symbolToPlainIon('NH₄⁺')).toBe('NH4+');
    expect(symbolToPlainIon('Cl⁻')).toBe('Cl-');
    expect(symbolToPlainIon('Ca²⁺')).toBe('Ca^2+');
    expect(symbolToPlainIon('PO₄³⁻')).toBe('PO4^3-');
    expect(symbolToPlainIon('OH⁻')).toBe('OH-');
    expect(symbolToPlainIon('')).toBe('');
  });

  it('splits salts into cation and anion', () => {
    expect(splitIntoIons('BaSO4').cation).toBe('Ba^2+');
    expect(splitIntoIons('BaSO4').anion).toBe('SO4^2-');
    expect(splitIntoIons('Ca(OH)2').anion).toBe('OH-');
    expect(splitIntoIons('(NH4)2SO4').cation).toBe('NH4+');
    expect(splitIntoIons('H2SO4').isAcid).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Reaction bank                                                       */
/* ------------------------------------------------------------------ */

describe('REACTION_BANK', () => {
  it('has at least 220 entries covering all five types', () => {
    expect(REACTION_BANK.length).toBeGreaterThanOrEqual(220);
    const types = new Set(REACTION_BANK.map((entry) => entry.type));
    expect([...types].sort()).toEqual([...REACTION_TYPES].sort());
  });

  it('has every entry genuinely balanced — verified with our own balancer', () => {
    const failures: string[] = [];
    for (const entry of REACTION_BANK) {
      const result = balanceEquation(entry.balancedPlain);
      if (!result.ok) {
        failures.push(`${entry.balancedPlain}: ${result.error}`);
        continue;
      }
      const written = parseEquation(entry.balancedPlain);
      const writtenCoefficients = [
        ...written.left.map((s) => (s.coefficient === 0 ? 1 : s.coefficient)),
        ...written.right.map((s) => (s.coefficient === 0 ? 1 : s.coefficient)),
      ];
      if (writtenCoefficients.join(',') !== result.coefficients.join(',')) {
        failures.push(
          `${entry.balancedPlain}: written ${writtenCoefficients.join(',')} but derived ${result.coefficients.join(',')}`,
        );
        continue;
      }
      if (!result.reduced) {
        failures.push(`${entry.balancedPlain}: coefficients are not in lowest terms`);
      }
      const classified = classifyReaction(entry.balancedPlain);
      if (classified !== entry.type) {
        failures.push(`${entry.balancedPlain}: declares ${entry.type} but classifies as ${classified}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('meets the per-type minimums', () => {
    const minimums: Record<ReactionType, number> = {
      synthesis: 40,
      decomposition: 40,
      'single-replacement': 45,
      'double-replacement': 60,
      combustion: 35,
    };
    const counts = reactionBankCounts();
    for (const type of REACTION_TYPES) {
      const total = counts[type].easy + counts[type].medium + counts[type].hard;
      expect(total, `${type} total`).toBeGreaterThanOrEqual(minimums[type]);
    }
  });

  it('has at least 20 easy, 20 medium and 20 hard reactions of every type', () => {
    const counts = reactionBankCounts();
    for (const type of REACTION_TYPES) {
      expect(counts[type].easy, `${type} easy`).toBeGreaterThanOrEqual(20);
      expect(counts[type].medium, `${type} medium`).toBeGreaterThanOrEqual(20);
      expect(counts[type].hard, `${type} hard`).toBeGreaterThanOrEqual(20);
    }
  });

  it('has no duplicate balanced equations', () => {
    const seen = new Set<string>();
    for (const entry of REACTION_BANK) {
      expect(seen.has(entry.balancedPlain), `duplicate ${entry.balancedPlain}`).toBe(false);
      seen.add(entry.balancedPlain);
    }
  });

  it('gives every entry an unbalanced prompt with the same species', () => {
    for (const entry of REACTION_BANK) {
      expect(entry.unbalancedPlain.length).toBeGreaterThan(0);
      expect(entry.unbalancedPlain).not.toBe(entry.balancedPlain);

      const [balancedLeft, balancedRight] = arrowOf(entry.balancedPlain);
      const [unbalancedLeft, unbalancedRight] = arrowOf(entry.unbalancedPlain);
      expect(speciesOf(unbalancedLeft), entry.balancedPlain).toEqual(speciesOf(balancedLeft));
      expect(speciesOf(unbalancedRight), entry.balancedPlain).toEqual(speciesOf(balancedRight));

      for (const side of [unbalancedLeft, unbalancedRight]) {
        for (const coefficient of coefficientsOf(side)) {
          expect(Number.isInteger(coefficient)).toBe(true);
          expect(coefficient).toBeGreaterThan(0);
        }
      }

      // The prompt must genuinely be unbalanced.
      const rebalanced = balanceEquation(entry.unbalancedPlain);
      expect(rebalanced.ok, entry.unbalancedPlain).toBe(true);
      const [bl, br] = arrowOf(entry.balancedPlain);
      const [ul, ur] = arrowOf(entry.unbalancedPlain);
      const same =
        coefficientsOf(ul).join(',') === coefficientsOf(bl).join(',') &&
        coefficientsOf(ur).join(',') === coefficientsOf(br).join(',');
      expect(same, `${entry.unbalancedPlain} should not already be balanced`).toBe(false);
    }
  });

  it('is deterministic in makeUnbalanced', () => {
    expect(makeUnbalanced('H2 + O2 -> H2O').plain).toBe(makeUnbalanced('H2 + O2 -> H2O').plain);
  });
});

describe('pickReactions', () => {
  it('returns the requested count without duplicates', () => {
    const picked = pickReactions({ count: 50, difficulty: 'easy' });
    expect(picked).toHaveLength(50);
    expect(new Set(picked.map((t) => t.balancedPlain)).size).toBe(50);
    for (const template of picked) expect(template.difficulty).toBe('easy');
  });

  it('is deterministic under the same seed and different under another', () => {
    const a = pickReactions({ count: 20, seed: 'workshop-1' });
    const b = pickReactions({ count: 20, seed: 'workshop-1' });
    const c = pickReactions({ count: 20, seed: 'workshop-2' });
    expect(a.map((t) => t.id)).toEqual(b.map((t) => t.id));
    expect(a.map((t) => t.id)).not.toEqual(c.map((t) => t.id));
  });

  it('filters by reaction type', () => {
    const picked = pickReactions({ count: 20, reactionTypes: ['combustion'], difficulty: 'easy' });
    expect(picked).toHaveLength(20);
    for (const template of picked) expect(template.type).toBe('combustion');
  });

  it('returns fewer when the pool is smaller than the count', () => {
    const picked = pickReactions({ count: 10, reactionTypes: ['decomposition'], difficulty: 'hard', seed: 1 });
    expect(picked.length).toBeGreaterThan(0);
    expect(picked.length).toBeLessThanOrEqual(10);
  });

  it('produces usable templates', () => {
    const [template] = pickReactions({ count: 1, seed: 42 });
    expect(template.alreadyBalanced).toBe(false);
    expect(template.balanced).toContain('→');
    expect(template.balancedPlain).toContain('->');
    expect(template.unbalanced).not.toBe(template.balanced);
    expect(template.id).toBeTruthy();
    expect(REACTION_TEMPLATES.length).toBe(REACTION_BANK.length);
  });

  it('has a deterministic PRNG', () => {
    const rng = mulberry32(7);
    const first = [rng(), rng(), rng()];
    const again = mulberry32(7);
    expect([again(), again(), again()]).toEqual(first);
  });
});

/* ------------------------------------------------------------------ */
/* Worksheet                                                           */
/* ------------------------------------------------------------------ */

const baseConfig = (overrides: Partial<WorksheetConfig> = {}): WorksheetConfig => ({
  exerciseType: 'combined',
  count: 10,
  reactionTypes: ['synthesis', 'decomposition', 'single-replacement', 'double-replacement', 'combustion'],
  difficulty: 'easy',
  includeAnswerKey: true,
  includeSolutions: false,
  title: 'Test Worksheet',
  locale: 'en',
  ...overrides,
});

describe('generateWorksheet', () => {
  it('honours the count for every supported size', () => {
    for (const count of [5, 10, 20, 30, 50] as const) {
      const worksheet = generateWorksheet(baseConfig({ count }), 'seed-count');
      expect(worksheet.questions, `count ${count}`).toHaveLength(count);
      expect(worksheet.config.count).toBe(count);
    }
  });

  it('is deterministic under equal seeds', () => {
    const config = baseConfig({ count: 30 });
    const a = generateWorksheet(config, 'abc');
    const b = generateWorksheet(config, 'abc');
    expect(JSON.stringify(a.questions)).toBe(JSON.stringify(b.questions));
    expect(worksheetSeed(config, 'abc')).toBe(worksheetSeed(config, 'abc'));
  });

  it('differs for different seeds and different configs', () => {
    const config = baseConfig({ count: 20 });
    const a = generateWorksheet(config, 'one');
    const b = generateWorksheet(config, 'two');
    const c = generateWorksheet(baseConfig({ count: 20, difficulty: 'hard' }), 'one');
    expect(JSON.stringify(a.questions)).not.toBe(JSON.stringify(b.questions));
    expect(JSON.stringify(a.questions)).not.toBe(JSON.stringify(c.questions));
    for (const question of c.questions) expect(question.difficulty).toBe('hard');
  });

  it('never repeats a reaction', () => {
    const worksheet = generateWorksheet(baseConfig({ count: 50 }), 'dedupe');
    const seen = new Set<string>();
    for (const question of worksheet.questions) {
      expect(seen.has(question.prompt), `duplicate prompt: ${question.prompt}`).toBe(false);
      seen.add(question.prompt);
    }
    expect(seen.size).toBe(50);
  });

  it('splits the exercises correctly for each exerciseType', () => {
    const balance = generateWorksheet(baseConfig({ exerciseType: 'balance', count: 20 }), 'split');
    expect(balance.questions.every((q) => q.type === 'balance')).toBe(true);
    expect(exerciseSplit(baseConfig({ exerciseType: 'balance', count: 20 }))).toEqual({
      balance: 20,
      identify: 0,
    });

    const identify = generateWorksheet(baseConfig({ exerciseType: 'identify', count: 20 }), 'split');
    expect(identify.questions.every((q) => q.type === 'identify')).toBe(true);

    const combined = generateWorksheet(baseConfig({ exerciseType: 'combined', count: 20 }), 'split');
    const balances = combined.questions.filter((q) => q.type === 'balance').length;
    const identifies = combined.questions.filter((q) => q.type === 'identify').length;
    expect(balances + identifies).toBe(20);
    expect(Math.abs(balances - identifies)).toBeLessThanOrEqual(1);
    expect(balances).toBe(10);
    expect(identifies).toBe(10);
    // Both kinds really do appear, interleaved.
    expect(combined.questions[0].type).toBe('balance');
    expect(combined.questions[1].type).toBe('identify');

    const odd = generateWorksheet(baseConfig({ exerciseType: 'combined', count: 5 }), 'split');
    expect(odd.questions).toHaveLength(5);
    expect(odd.questions.filter((q) => q.type === 'balance')).toHaveLength(3);
    expect(odd.questions.filter((q) => q.type === 'identify')).toHaveLength(2);
  });

  it('numbers the questions from 1 and fills every field', () => {
    const worksheet = generateWorksheet(baseConfig({ count: 30 }), 'fields');
    worksheet.questions.forEach((question, i) => {
      expect(question.index).toBe(i + 1);
      expect(question.prompt.length).toBeGreaterThan(3);
      expect(question.answer.length).toBeGreaterThan(0);
      expect(question.explanation).toBeTruthy();
      expect(REACTION_TYPES).toContain(question.reactionType);
    });
  });

  it('only uses the requested reaction types and difficulty', () => {
    const worksheet = generateWorksheet(
      baseConfig({ reactionTypes: ['combustion', 'decomposition'], difficulty: 'hard', count: 20 }),
      'filter',
    );
    for (const question of worksheet.questions) {
      expect(['combustion', 'decomposition']).toContain(question.reactionType);
      expect(question.difficulty).toBe('hard');
    }
  });

  it('answers every balance question with a genuinely balanced equation', () => {
    for (const exerciseType of ['balance', 'combined'] as const) {
      const worksheet = generateWorksheet(baseConfig({ exerciseType, count: 30, difficulty: 'medium' }), 'answers');
      const balances = worksheet.questions.filter((q) => q.type === 'balance');
      expect(balances.length).toBeGreaterThan(0);
      for (const question of balances) {
        const result = balanceEquation(question.answer);
        expect(result.ok, `${question.answer} should balance`).toBe(true);
        expect(result.reduced, `${question.answer} should be in lowest terms`).toBe(true);
        // The prompt is the unbalanced version of the same reaction.
        const promptEquation = question.prompt.split('\n').slice(1).join('\n');
        expect(promptEquation.length).toBeGreaterThan(0);
        const promptResult = balanceEquation(promptEquation.replace(/→/g, '->'));
        expect(promptResult.ok, promptEquation).toBe(true);
        expect(promptResult.reduced, `${promptEquation} should need balancing`).toBe(false);
        expect(promptResult.balancedPlain.replace(/\s/g, '')).toBe(result.balancedPlain.replace(/\s/g, ''));
      }
    }
  });

  it('answers every identify question with the right type name', () => {
    const worksheet = generateWorksheet(baseConfig({ exerciseType: 'identify', count: 20 }), 'names');
    const labels: Record<ReactionType, string> = {
      synthesis: 'synthesis',
      decomposition: 'decomposition',
      'single-replacement': 'single replacement',
      'double-replacement': 'double replacement',
      combustion: 'combustion',
    };
    for (const question of worksheet.questions) {
      expect(question.answer).toBe(labels[question.reactionType]);
      const equation = question.prompt.split('\n').slice(1).join('\n');
      expect(classifyReaction(equation), equation).toBe(question.reactionType);
    }
  });
});

describe('worksheet export', () => {
  it('builds printable HTML with @page rules and every question', () => {
    const worksheet = generateWorksheet(baseConfig({ count: 30, includeAnswerKey: true, includeSolutions: true }), 'html');
    const html = buildPrintableHtml(worksheet, (key) => key);
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('@page');
    expect(html).toContain('A4');
    expect(html).toContain('column-count: 2');
    expect(html).toContain('page-break-before: always');
    expect(html).toContain('Test Worksheet');
    // A translator that echoes the key back falls back to English.
    expect(html).toContain('Name:');
    for (const question of worksheet.questions) {
      expect(html).toContain(`>${question.index}.<`);
    }
    expect(html).toContain('Answer Key');
    expect(html).toContain('Worked Solutions');
  });

  it('omits the answer key when it is not requested', () => {
    const worksheet = generateWorksheet(baseConfig({ count: 5, includeAnswerKey: false, includeSolutions: false }), 'html2');
    const html = buildPrintableHtml(worksheet, () => 'X');
    expect(html).not.toContain('Answer Key');
    expect(html).not.toContain('Worked Solutions');
  });

  it('produces a real multi-page PDF that holds 50 questions', async () => {
    const worksheet = generateWorksheet(
      baseConfig({ count: 50, includeAnswerKey: true, includeSolutions: true }),
      'pdf',
    );
    const blob = await exportWorksheetToPdf(worksheet, (key) => key);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(2000);
    expect(blob.type).toBe('application/pdf');

    const head = new TextDecoder().decode(await blob.slice(0, 5).arrayBuffer());
    expect(head).toBe('%PDF-');

    // The /Type /Page objects prove the document really paginated.
    const text = new TextDecoder().decode(await blob.arrayBuffer());
    const pages = (text.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    expect(pages).toBeGreaterThanOrEqual(3);
  });
});

/* ------------------------------------------------------------------ */
/* Solubility                                                          */
/* ------------------------------------------------------------------ */

describe('classifyCompound', () => {
  beforeEach(() => {
    resetSolubilityRules();
  });

  it('uses the built-in fallback when the data file is unavailable', () => {
    expect(getSolubilityRuleSource()).toBe('fallback');
    expect(FALLBACK_SOLUBILITY_RULES.length).toBeGreaterThanOrEqual(20);
    for (const rule of FALLBACK_SOLUBILITY_RULES) {
      expect(typeof rule.ionFormula).toBe('string');
      expect(typeof rule.ionPlain).toBe('string');
      expect(['cation', 'anion']).toContain(rule.kind);
      expect(['soluble', 'insoluble', 'slightly-soluble', 'reacts']).toContain(rule.outcome);
      expect(parseFormula(rule.ionPlain).ok, rule.ionPlain).toBe(true);
    }
  });

  const expectations: Array<[string, string]> = [
    ['NaCl', 'soluble'],
    ['KNO3', 'soluble'],
    ['(NH4)2SO4', 'soluble'],
    ['AgNO3', 'soluble'],
    ['Ba(NO3)2', 'soluble'],
    ['CuSO4', 'soluble'],
    ['MgSO4', 'soluble'],
    ['Al2(SO4)3', 'soluble'],
    ['Na2CO3', 'soluble'],
    ['K2CrO4', 'soluble'],
    ['NaOH', 'soluble'],
    ['NH4Cl', 'soluble'],
    ['AgCl', 'insoluble'],
    ['BaSO4', 'insoluble'],
    ['CaCO3', 'insoluble'],
    ['BaCO3', 'insoluble'],
    ['Ca3(PO4)2', 'insoluble'],
    ['Fe(OH)3', 'insoluble'],
    ['Zn(OH)2', 'insoluble'],
    ['CaF2', 'insoluble'],
    ['Ag2CO3', 'insoluble'],
    ['Ca(OH)2', 'partly'],
    ['PbCl2', 'partly'],
    ['H2SO4', 'soluble'],
    ['HCl', 'soluble'],
    ['O2', 'reacts'],
  ];

  for (const [formula, expected] of expectations) {
    it(`classifies ${formula} as ${expected}`, () => {
      const result = classifyCompound(formula);
      expect(result.ok, formula).toBe(true);
      expect(result.overall, `${formula} note: ${result.note}`).toBe(expected);
      expect(result.rows.length).toBeGreaterThan(0);
      for (const row of result.rows) {
        expect(typeof row.ion).toBe('string');
        expect(row.ion.length).toBeGreaterThan(0);
        expect(typeof row.rule).toBe('string');
        expect(row.rule.length).toBeGreaterThan(3);
        expect(['cation', 'anion']).toContain(row.kind);
        expect(['soluble', 'insoluble', 'slightly-soluble', 'reacts']).toContain(row.result);
        expect(row.exceptions === null || typeof row.exceptions === 'string').toBe(true);
      }
      expect(result.note.length).toBeGreaterThan(10);
    });
  }

  it('reports the exception that decides the verdict', () => {
    const chloride = classifyCompound('AgCl');
    const anionRow = chloride.rows.find((r) => r.kind === 'anion');
    expect(anionRow?.isException).toBe(true);
    expect(anionRow?.exceptions).toContain('Ag');

    const carbonate = classifyCompound('Na2CO3');
    expect(carbonate.rows.find((r) => r.kind === 'anion')?.isException).toBe(true);
    expect(carbonate.overall).toBe('soluble');
  });

  it('summarises a compound in one line', () => {
    expect(solubilitySummary('BaSO4')).toContain('insoluble');
    expect(solubilitySummary('NaCl')).toContain('soluble');
  });

  it('returns ok:false for unreadable formulas', () => {
    for (const input of ['', '  ', 'Zz9', '(', 'H2O)']) {
      const result = classifyCompound(input);
      expect(result.ok, JSON.stringify(input)).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.rows).toEqual([]);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Solubility against the real data file                               */
/* ------------------------------------------------------------------ */

describe('classifyCompound with the data-layer rules', () => {
  // The data worker's table is the source of truth when it is present; the
  // engine must give the same verdicts from it as from the built-in fallback.
  let realRules: SolubilityRule[] = [];

  beforeEach(async () => {
    resetSolubilityRules();
    const data = (await import('../../../data/solubility.json')).default as unknown;
    const rules = (data as { rules?: SolubilityRule[] })?.rules ?? [];
    realRules = rules.filter(
      (rule) =>
        typeof rule?.ionFormula === 'string' &&
        typeof rule?.ionPlain === 'string' &&
        (rule.kind === 'cation' || rule.kind === 'anion'),
    );
    if (realRules.length > 0) setSolubilityRules(realRules);
  });

  it('loads a real rule table when one is available', () => {
    expect(realRules.length).toBeGreaterThanOrEqual(20);
    expect(getSolubilityRuleSource()).toBe(realRules.length > 0 ? 'injected' : 'fallback');
    for (const rule of realRules) {
      expect(['soluble', 'insoluble', 'slightly-soluble', 'reacts']).toContain(rule.outcome);
    }
  });

  const expectations: Array<[string, string]> = [
    ['NaCl', 'soluble'],
    ['KNO3', 'soluble'],
    ['(NH4)2SO4', 'soluble'],
    ['CuSO4', 'soluble'],
    ['MgSO4', 'soluble'],
    ['Al2(SO4)3', 'soluble'],
    ['Na2CO3', 'soluble'],
    ['K2CrO4', 'soluble'],
    ['NaOH', 'soluble'],
    ['NH4Cl', 'soluble'],
    ['Ba(NO3)2', 'soluble'],
    ['AgCl', 'insoluble'],
    ['BaSO4', 'insoluble'],
    ['CaCO3', 'insoluble'],
    ['BaCO3', 'insoluble'],
    ['Ca3(PO4)2', 'insoluble'],
    ['Fe(OH)3', 'insoluble'],
    ['Zn(OH)2', 'insoluble'],
    ['CaF2', 'insoluble'],
    ['Ag2CO3', 'insoluble'],
    ['Ca(OH)2', 'partly'],
    ['PbCl2', 'partly'],
    // The rule tables mark general sulfides as "reacts with water" rather than
    // merely insoluble; either verdict means the salt does not dissolve.
    ['FeS', 'reacts'],
  ];

  for (const [formula, expected] of expectations) {
    it(`classifies ${formula} as ${expected} from the data table`, () => {
      const result = classifyCompound(formula);
      expect(result.ok, formula).toBe(true);
      expect(result.overall, `${formula}: ${result.note}`).toBe(expected);
    });
  }
});
