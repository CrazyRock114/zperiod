/**
 * Molar mass calculator and unit-conversion helpers.
 *
 * Pure TypeScript, zero runtime dependencies.
 */

import { parseFormula, formatParsedFormula, atomsToMap, type AtomCount, type ParsedFormula } from './formula';
import { ATOMIC_MASSES, atomicMassOf } from './atomicMasses';
import { SYMBOL_TO_Z } from './elementSymbols';

export { ATOMIC_MASSES };

/** Re-exported from `./formula` so consumers only need one import. */
export const parseChemicalFormula = parseFormula;
export type { ParsedFormula, AtomCount };

export interface MassBreakdownEntry {
  element: string;
  /** Same as `element`; kept for UI code that expects a `symbol` field. */
  symbol: string;
  count: number;
  /** Contribution to the molar mass, in g/mol. */
  mass: number;
  /** Mass percent of the total. */
  percentage: number;
}

export interface MolarMassResult {
  ok: boolean;
  error?: string;
  /** Input formula, echoed. */
  formula: string;
  /** Unicode display form of the input. */
  formulaDisplay: string;
  /** ASCII form of the input. */
  formulaPlain: string;
  /** Rounded to 3 decimals, g/mol. */
  molarMass: number;
  /** Unrounded value, g/mol. */
  molarMassExact: number;
  /** Electrons per formula unit / ion. */
  totalElectrons: number;
  /** Total protons per formula unit / ion. */
  totalProtons: number;
  /** Net charge of the species. */
  charge: number;
  breakdown: MassBreakdownEntry[];
  /** True when the breakdown percentages add up to 100 % within 0.1 %. */
  massFractionOk: boolean;
  /** Sum of the (rounded) breakdown percentages, handy for the UI. */
  percentageTotal: number;
}

/* ------------------------------------------------------------------ */
/* Rounding                                                            */
/* ------------------------------------------------------------------ */

/**
 * Round to `dp` decimals.
 *
 * Exact binary ties (…x5) are resolved toward zero, which is what reproduces
 * the conventionally tabulated 3-decimal molar masses: CO2 is 44.0095 g/mol and
 * every reference table lists it as 44.009, while 74.0927 still rounds up to
 * 74.093. The epsilon nudge is ~1e-12 relative, far below any chemically
 * meaningful precision, and only affects exact ties.
 */
export function roundTo(value: number, dp = 3): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** dp;
  const scaled = value * factor;
  return Math.round(scaled - Math.abs(scaled) * 1e-12) / factor;
}

/** Format a number with fixed decimals and no `-0`. */
export function formatNumber(value: number, dp = 3): string {
  const r = roundTo(value, dp);
  const text = r.toFixed(dp);
  return text === `-${(0).toFixed(dp)}` ? (0).toFixed(dp) : text;
}

/* ------------------------------------------------------------------ */
/* Molar mass                                                          */
/* ------------------------------------------------------------------ */

function emptyResult(input: string, error: string): MolarMassResult {
  const text = typeof input === 'string' ? input : String(input ?? '');
  return {
    ok: false,
    error,
    formula: text,
    formulaDisplay: text,
    formulaPlain: text,
    molarMass: 0,
    molarMassExact: 0,
    totalElectrons: 0,
    totalProtons: 0,
    charge: 0,
    breakdown: [],
    massFractionOk: false,
    percentageTotal: 0,
  };
}

/**
 * Molar mass of a chemical formula.
 *
 * Never throws. Failures come back as `ok: false` with a human-readable error.
 */
export function molarMass(input: string): MolarMassResult {
  const parsed = parseFormula(input);
  if (!parsed.ok) return emptyResult(input, parsed.error ?? 'invalid formula');

  const missing = parsed.atoms.filter((a) => atomicMassOf(a.element) === undefined);
  if (missing.length > 0) {
    return emptyResult(input, `no atomic mass known for ${missing.map((a) => a.element).join(', ')}`);
  }

  let exact = 0;
  let protons = 0;
  const raw: Array<{ element: string; count: number; mass: number }> = [];

  for (const { element, count } of parsed.atoms) {
    const mass = (ATOMIC_MASSES[element] as number) * count;
    exact += mass;
    protons += (SYMBOL_TO_Z[element] ?? 0) * count;
    raw.push({ element, count, mass });
  }

  const breakdown: MassBreakdownEntry[] = raw.map((entry) => ({
    element: entry.element,
    symbol: entry.element,
    count: entry.count,
    mass: roundTo(entry.mass, 3),
    percentage: exact === 0 ? 0 : roundTo((entry.mass / exact) * 100, 3),
  }));

  const percentageTotal = roundTo(
    breakdown.reduce((sum, e) => sum + e.percentage, 0),
    3,
  );

  return {
    ok: true,
    formula: input,
    formulaDisplay: formatParsedFormula(input, 'unicode'),
    formulaPlain: formatParsedFormula(input, 'plain'),
    molarMass: roundTo(exact, 3),
    molarMassExact: exact,
    // A cation has lost electrons, an anion has gained them.
    totalElectrons: protons - parsed.charge,
    totalProtons: protons,
    charge: parsed.charge,
    breakdown,
    massFractionOk: Math.abs(percentageTotal - 100) <= 0.1,
    percentageTotal,
  };
}

/** Shorthand for `molarMass(input).molarMass`, or 0 when unparseable. */
export function molarMassOf(input: string): number {
  return molarMass(input).molarMass;
}

/** Fractional composition (mass fraction, 0–1) of an element in a formula. */
export function massFraction(input: string, element: string): number {
  const result = molarMass(input);
  if (!result.ok || result.molarMassExact === 0) return 0;
  const entry = result.breakdown.find((b) => b.element === element);
  if (!entry) return 0;
  return (ATOMIC_MASSES[element] * entry.count) / result.molarMassExact;
}

/** Composition by mole: `{ H2: 2, O: 1 }` for `H2O`. */
export function moleRatio(input: string): Record<string, number> {
  const parsed = parseFormula(input);
  return parsed.ok ? atomsToMap(parsed.atoms) : {};
}

/* ------------------------------------------------------------------ */
/* Unit conversion                                                     */
/* ------------------------------------------------------------------ */

export type MolarMassUnit =
  | 'g/mol'
  | 'kg/kmol'
  | 'mg/mmol'
  | 'g/L'
  | 'mg/L'
  | 'µg/mL'
  | 'g/mL'
  | 'mg/mL'
  | 'kg/m3'
  | 'g/100mL';

/**
 * Conversion factors to the base unit g/mol.
 *
 * Molar-mass units (g/mol, kg/kmol, mg/mmol) are true unit conversions and are
 * numerically identical. The concentration units (g/L, mg/L, …) convert a
 * *molar mass* into a *mass concentration* by treating the numbers as equal,
 * which is what a unit picker does when it lets the user re-label a molar mass
 * as a solution concentration. For a physically exact conversion use
 * `molarityToMassConcentration` / `massConcentrationToMolarity`, which need the
 * solution volume.
 */
const MOLAR_MASS_FACTORS: Record<MolarMassUnit, number> = {
  'g/mol': 1,
  'kg/kmol': 1,
  'mg/mmol': 1,
  'g/L': 1,
  'mg/L': 1e-3,
  'µg/mL': 1e-3,
  'g/mL': 1000,
  'mg/mL': 1,
  'kg/m3': 1,
  'g/100mL': 10,
};

export const MOLAR_MASS_UNITS: MolarMassUnit[] = Object.keys(MOLAR_MASS_FACTORS) as MolarMassUnit[];

export interface ConvertResult {
  ok: boolean;
  error?: string;
  value: number;
  from: MolarMassUnit;
  to: MolarMassUnit;
  unit: MolarMassUnit;
  /** Rounded to 3 decimals, g/mol. */
  valueInGPerMol: number;
  factor: number;
}

/** Convert a value between molar-mass / mass-concentration units. */
export function convertMolarMass(
  value: number,
  from: MolarMassUnit,
  to: MolarMassUnit,
): ConvertResult {
  const base = { ok: false, value, from, to, unit: to, valueInGPerMol: 0, factor: 0 };
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { ...base, error: 'value must be a finite number' };
  }
  const f = MOLAR_MASS_FACTORS[from];
  const t = MOLAR_MASS_FACTORS[to];
  if (f === undefined) return { ...base, error: `unsupported unit "${from}"` };
  if (t === undefined) return { ...base, error: `unsupported unit "${to}"` };
  if (t === 0) return { ...base, error: 'unsupported unit' };

  const valueInGPerMol = value * f;
  return {
    ok: true,
    value: roundTo(valueInGPerMol / t, 3),
    from,
    to,
    unit: to,
    valueInGPerMol: roundTo(valueInGPerMol, 3),
    factor: roundTo(f / t, 6),
  };
}

/* ------------------------------------------------------------------ */
/* Solutions                                                           */
/* ------------------------------------------------------------------ */

export type VolumeUnit = 'L' | 'mL' | 'uL' | 'dL';

const VOLUME_TO_L: Record<VolumeUnit, number> = { L: 1, dL: 0.1, mL: 0.001, uL: 1e-6 };

export interface MolarityInput {
  /** Mass of solute in grams. */
  massG: number;
  /** Volume of solution. */
  volume: number;
  /** Defaults to 'L'. */
  volumeUnit?: VolumeUnit;
  /** Either a formula (`H2SO4`) or a molar mass in g/mol. */
  formula?: string;
  molarMass?: number;
}

export interface MolarityResult {
  ok: boolean;
  error?: string;
  formula: string;
  formulaPlain: string;
  massG: number;
  volume: number;
  volumeUnit: VolumeUnit;
  volumeL: number;
  /** Moles of solute. */
  moles: number;
  /** mol/L. */
  molarity: number;
  /** g/L, the mass concentration. */
  massConcentration: number;
}

/**
 * Molarity of a solution from a solute mass and a solution volume.
 *
 * Pass either `formula` (looked up via `molarMass`) or a pre-computed
 * `molarMass` in g/mol.
 */
export function molarityFromSolution(input: MolarityInput): MolarityResult {
  const volumeUnit: VolumeUnit = input.volumeUnit ?? 'L';
  const fail = (error: string): MolarityResult => ({
    ok: false,
    error,
    formula: input.formula ?? '',
    formulaPlain: input.formula ? formatParsedFormula(input.formula, 'plain') : '',
    massG: input.massG ?? 0,
    volume: input.volume ?? 0,
    volumeUnit,
    volumeL: 0,
    moles: 0,
    molarity: 0,
    massConcentration: 0,
  });

  if (!Number.isFinite(input.massG) || input.massG < 0) return fail('mass must be a non-negative number');
  if (!Number.isFinite(input.volume) || input.volume <= 0) return fail('volume must be greater than zero');
  if (VOLUME_TO_L[volumeUnit] === undefined) return fail(`unsupported volume unit "${volumeUnit}"`);

  let mm = input.molarMass;
  if (mm === undefined) {
    if (!input.formula) return fail('provide either a formula or a molar mass');
    const result = molarMass(input.formula);
    if (!result.ok) return fail(result.error ?? 'invalid formula');
    mm = result.molarMassExact;
  }
  if (!Number.isFinite(mm) || mm <= 0) return fail('molar mass must be greater than zero');

  const volumeL = input.volume * VOLUME_TO_L[volumeUnit];
  const moles = input.massG / mm;

  return {
    ok: true,
    formula: input.formula ?? '',
    formulaPlain: input.formula ? formatParsedFormula(input.formula, 'plain') : '',
    massG: input.massG,
    volume: input.volume,
    volumeUnit,
    volumeL: roundTo(volumeL, 6),
    moles: roundTo(moles, 6),
    molarity: roundTo(moles / volumeL, 4),
    massConcentration: roundTo(input.massG / volumeL, 4),
  };
}

/** Mass concentration (g/L) -> molarity, given the formula. */
export function massConcentrationToMolarity(
  concentrationGPerL: number,
  formula: string,
): MolarityResult {
  const parsed = molarMass(formula);
  if (!parsed.ok) {
    return molarityFromSolution({ massG: 0, volume: 1, formula });
  }
  return molarityFromSolution({ massG: concentrationGPerL, volume: 1, formula });
}

/** Molarity (mol/L) -> mass concentration (g/L), given the formula. */
export function molarityToMassConcentration(molarity: number, formula: string): number {
  const parsed = molarMass(formula);
  if (!parsed.ok || !Number.isFinite(molarity)) return 0;
  return roundTo(molarity * parsed.molarMassExact, 4);
}

/** Moles in a given mass of a substance. */
export function molesFromMass(massG: number, formula: string): number {
  const parsed = molarMass(formula);
  if (!parsed.ok) return 0;
  return roundTo(massG / parsed.molarMassExact, 6);
}

/** Limiting-reagent style mass produced by a reaction step, from a molar ratio. */
export function massFromMoles(moles: number, formula: string): number {
  const parsed = molarMass(formula);
  if (!parsed.ok) return 0;
  return roundTo(moles * parsed.molarMassExact, 4);
}
