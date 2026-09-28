/**
 * English names for common compounds, keyed by plain (ASCII) formula.
 *
 * `compoundName()` prefers this table and falls back to a systematic
 * cation + anion name built from the ion tables in `./ions`.
 */

import { parseFormula, toPlainFormula } from './formula';
import {
  POLYATOMIC_ANIONS,
  POLYATOMIC_ANION_NAMES,
  ROMAN_METALS,
  CATION_CHARGES,
  METAL_SYMBOLS,
  countCharge,
  elementName,
  splitIntoIons,
  type IonSplit,
} from './ions';

/** Plain formula -> English name. */
export const COMPOUND_NAMES: Record<string, string> = {
  // --- water and friends -------------------------------------------------
  H2O: 'water',
  '2H2O': 'water',
  H2O2: 'hydrogen peroxide',
  H3O: 'hydronium',
  OH: 'hydroxide',
  NH4: 'ammonium',

  // --- common acids ------------------------------------------------------
  HCl: 'hydrochloric acid',
  HBr: 'hydrobromic acid',
  HI: 'hydroiodic acid',
  HNO3: 'nitric acid',
  HNO2: 'nitrous acid',
  H2SO4: 'sulfuric acid',
  H2SO3: 'sulfurous acid',
  H2CO3: 'carbonic acid',
  H3PO4: 'phosphoric acid',
  H3PO3: 'phosphorous acid',
  CH3COOH: 'acetic acid',
  C2H4O2: 'acetic acid',
  H2C2O4: 'oxalic acid',
  HCN: 'hydrocyanic acid',
  H2S: 'hydrogen sulfide',
  HF: 'hydrofluoric acid',
  HClO: 'hypochlorous acid',

  // --- oxides ------------------------------------------------------------
  CO: 'carbon monoxide',
  CO2: 'carbon dioxide',
  FeO: 'iron(II) oxide',
  Fe2O3: 'iron(III) oxide',
  Fe3O4: 'iron(II,III) oxide',
  CuO: 'copper(II) oxide',
  Cu2O: 'copper(I) oxide',
  MgO: 'magnesium oxide',
  CaO: 'calcium oxide',
  Na2O: 'sodium oxide',
  K2O: 'potassium oxide',
  Al2O3: 'aluminium oxide',
  ZnO: 'zinc oxide',
  PbO: 'lead(II) oxide',
  MnO2: 'manganese(IV) oxide',
  SO2: 'sulfur dioxide',
  SO3: 'sulfur trioxide',
  P4O10: 'phosphorus(V) oxide',
  P2O5: 'phosphorus(V) oxide',
  P4O8: 'phosphorus(III) oxide',
  NO: 'nitric oxide',
  NO2: 'nitrogen dioxide',
  N2O: 'dinitrogen monoxide',

  // --- hydroxides and bases --------------------------------------------
  NaOH: 'sodium hydroxide',
  KOH: 'potassium hydroxide',
  LiOH: 'lithium hydroxide',
  'Ca(OH)2': 'calcium hydroxide',
  'Mg(OH)2': 'magnesium hydroxide',
  'Al(OH)3': 'aluminium hydroxide',
  'Fe(OH)3': 'iron(III) hydroxide',
  'Fe(OH)2': 'iron(II) hydroxide',
  'Cu(OH)2': 'copper(II) hydroxide',
  'Zn(OH)2': 'zinc hydroxide',
  'Ba(OH)2': 'barium hydroxide',
  'Sr(OH)2': 'strontium hydroxide',
  NH4OH: 'ammonium hydroxide',

  // --- chlorides ---------------------------------------------------------
  NaCl: 'sodium chloride',
  KCl: 'potassium chloride',
  LiCl: 'lithium chloride',
  CaCl2: 'calcium chloride',
  MgCl2: 'magnesium chloride',
  AlCl3: 'aluminium chloride',
  FeCl2: 'iron(II) chloride',
  FeCl3: 'iron(III) chloride',
  CuCl: 'copper(I) chloride',
  CuCl2: 'copper(II) chloride',
  ZnCl2: 'zinc chloride',
  AgCl: 'silver chloride',
  BaCl2: 'barium chloride',
  SrCl2: 'strontium chloride',
  NH4Cl: 'ammonium chloride',
  CCl4: 'carbon tetrachloride',
  CHCl3: 'chloroform',
  PCl3: 'phosphorus trichloride',
  PCl5: 'phosphorus pentachloride',
  SiCl4: 'silicon tetrachloride',
  SnCl2: 'tin(II) chloride',
  PbCl2: 'lead(II) chloride',
  HgCl2: 'mercury(II) chloride',
  TiCl4: 'titanium tetrachloride',

  // --- sulfates ----------------------------------------------------------
  CuSO4: 'copper(II) sulfate',
  FeSO4: 'iron(II) sulfate',
  'Fe2(SO4)3': 'iron(III) sulfate',
  ZnSO4: 'zinc sulfate',
  MgSO4: 'magnesium sulfate',
  CaSO4: 'calcium sulfate',
  BaSO4: 'barium sulfate',
  SrSO4: 'strontium sulfate',
  Na2SO4: 'sodium sulfate',
  K2SO4: 'potassium sulfate',
  '(NH4)2SO4': 'ammonium sulfate',
  PbSO4: 'lead(II) sulfate',
  Hg2SO4: 'mercury(I) sulfate',

  // --- nitrates ----------------------------------------------------------
  NaNO3: 'sodium nitrate',
  KNO3: 'potassium nitrate',
  AgNO3: 'silver nitrate',
  'Ca(NO3)2': 'calcium nitrate',
  'Mg(NO3)2': 'magnesium nitrate',
  'Ba(NO3)2': 'barium nitrate',
  NH4NO3: 'ammonium nitrate',
  'Cu(NO3)2': 'copper(II) nitrate',
  'Pb(NO3)2': 'lead(II) nitrate',

  // --- carbonates, phosphates, chromates --------------------------------
  Na2CO3: 'sodium carbonate',
  K2CO3: 'potassium carbonate',
  Li2CO3: 'lithium carbonate',
  CaCO3: 'calcium carbonate',
  MgCO3: 'magnesium carbonate',
  BaCO3: 'barium carbonate',
  SrCO3: 'strontium carbonate',
  ZnCO3: 'zinc carbonate',
  CuCO3: 'copper(II) carbonate',
  FeCO3: 'iron(II) carbonate',
  'Na2CO3.10H2O': 'sodium carbonate decahydrate',
  NaHCO3: 'sodium hydrogen carbonate',
  KHCO3: 'potassium hydrogen carbonate',
  'Ca(HCO3)2': 'calcium hydrogen carbonate',
  Na3PO4: 'sodium phosphate',
  'Ca3(PO4)2': 'calcium phosphate',
  Ag3PO4: 'silver phosphate',
  K2CrO4: 'potassium chromate',
  K2Cr2O7: 'potassium dichromate',
  Na2CrO4: 'sodium chromate',
  Na2Cr2O7: 'sodium dichromate',

  // --- sulfides, phosphides, misc ---------------------------------------
  Na2S: 'sodium sulfide',
  ZnS: 'zinc sulfide',
  FeS: 'iron(II) sulfide',
  CuS: 'copper(II) sulfide',
  Ag2S: 'silver sulfide',
  PbS: 'lead(II) sulfide',
  Ca3P2: 'calcium phosphide',

  // --- bromides, iodides, fluorides ------------------------------------
  NaBr: 'sodium bromide',
  KBr: 'potassium bromide',
  CaBr2: 'calcium bromide',
  MgBr2: 'magnesium bromide',
  AgBr: 'silver bromide',
  NaI: 'sodium iodide',
  KI: 'potassium iodide',
  CaI2: 'calcium iodide',
  MgI2: 'magnesium iodide',
  AgI: 'silver iodide',
  PbI2: 'lead(II) iodide',
  NaF: 'sodium fluoride',
  KF: 'potassium fluoride',
  LiF: 'lithium fluoride',
  CaF2: 'calcium fluoride',
  BaF2: 'barium fluoride',
  AgF: 'silver fluoride',

  // --- silanes, boranes, and organics -----------------------------------
  SiH4: 'silane',
  SiO2: 'silicon dioxide',
  B2H6: 'diborane',
  H3BO3: 'boric acid',
  CH4: 'methane',
  C2H6: 'ethane',
  C2H4: 'ethene',
  C2H2: 'ethyne',
  C3H8: 'propane',
  C4H10: 'butane',
  C5H12: 'pentane',
  C6H6: 'benzene',
  C6H12: 'cyclohexane',
  C2H6O: 'ethanol',
  C2H5OH: 'ethanol',
  C3H6O: 'propanal',
  C3H8O: 'propanol',
  C6H12O6: 'glucose',
  C5H10O5: 'ribose',
  C7H6O2: 'benzoic acid',
  C6H5OH: 'phenol',
  C6H5NH2: 'aniline',
  C2H5OC2H5: 'diethyl ether',

  // --- gases commonly written in worksheets ------------------------------
  O2: 'oxygen',
  H2: 'hydrogen',
  N2: 'nitrogen',
  Cl2: 'chlorine',
  Br2: 'bromine',
  I2: 'iodine',
  F2: 'fluorine',
  NH3: 'ammonia',
  Ar: 'argon',
  He: 'helium',
  Ne: 'neon',
  Kr: 'krypton',
  Xe: 'xenon',
  O3: 'ozone',
};

const MULTIPLIERS: Record<number, string> = {
  '1': '', 2: 'di', 3: 'tri', 4: 'tetra', 5: 'penta', 6: 'hexa', 7: 'hepta', 8: 'octa',
  '9': 'nona', 10: 'deca',
};

const ANION_ELEMENT_SUFFIX: Record<string, string> = {
  H: 'hydride', B: 'boride', C: 'carbide', N: 'nitride', O: 'oxide', F: 'fluoride',
  Si: 'silicide', P: 'phosphide', S: 'sulfide', Cl: 'chloride', Se: 'selenide', Br: 'bromide',
  Te: 'telluride', I: 'iodide', As: 'arsenide',
};

function cationWord(split: IonSplit): string {
  const plain = split.cation.replace(/\^?\d*[+-]$/, '');
  const parsed = parseFormula(plain);
  if (!parsed.ok || parsed.atoms.length === 0) return 'unknown';
  const symbol = parsed.atoms[0].element;
  const count = parsed.atoms[0].count;
  const charge = split.cationCharge;

  if (plain === 'NH4' || symbol === 'N') return 'ammonium';
  if (plain === 'H3O') return 'hydronium';

  const roman = ROMAN_METALS[symbol];
  if (roman && count === 1) {
    const magnitude = Math.abs(charge);
    const word = roman[magnitude as 1 | 2 | 3 | 4];
    if (word) return word;
  }
  const base = elementName(symbol);
  if (roman && count === 1) {
    const magnitude = Math.abs(charge);
    if (magnitude >= 1 && magnitude <= 4) return `${base}(${['', 'I', 'II', 'III', 'IV'][magnitude]})`;
  }
  return count > 1 ? `${MULTIPLIERS[count] ?? count}${base}` : base;
}

function anionWord(split: IonSplit): string {
  const plain = split.anion;
  const parsed = parseFormula(plain);
  if (!parsed.ok || parsed.atoms.length === 0) return 'unknown';

  if (parsed.atoms.length === 1) {
    const symbol = parsed.atoms[0].element;
    return ANION_ELEMENT_SUFFIX[symbol] ?? `${elementName(symbol)} ion`;
  }
  const key = plain.replace(/[+-]|\^\d*[+-]/g, '');
  const known = POLYATOMIC_ANION_NAMES[key];
  if (known) return known;

  // Unknown polyatomic anion: name it from its elements, e.g. `S2O8` -> sulfate.
  const charge = Math.abs(split.anionCharge);
  const count = parsed.atoms[0]?.count ?? 1;
  const body = parsed.atoms.map((a) => elementName(a.element)).join(' ');
  return charge === 1 ? `${body} ion` : `${body} (${charge}-) ion`;
}

/**
 * A systematic, IUPAC-ish name built from the formula.
 *
 * Used when the compound is not in `COMPOUND_NAMES`.
 */
export function systematicName(formulaPlain: string): string {
  const plain = toPlainFormula(formulaPlain);
  const parsed = parseFormula(plain);
  if (!parsed.ok) return '';

  // Elements and simple diatomics.
  if (parsed.atoms.length === 1) {
    const { element, count } = parsed.atoms[0];
    if (count === 1) return elementName(element);
    const base = elementName(element);
    if (parsed.charge !== 0) {
      return `${base} ${parsed.charge > 0 ? 'cation' : 'anion'}`;
    }
    return `${MULTIPLIERS[count] ?? count}${base}`;
  }

  const split = splitIntoIons(plain);
  if (split.isAcid) {
    // HCl, H2SO4, ... — the table covers the taught ones; otherwise name by elements.
    const body = parsed.atoms.slice(1).map((a) => elementName(a.element)).join(' ');
    return body ? `${body} acid` : 'acid';
  }
  if (split.cation && split.anion) {
    return `${cationWord(split)} ${anionWord(split)}`;
  }
  if (split.isPolyatomicIon && split.anion) {
    return anionWord({ ...split, anion: split.anion });
  }

  // Last resort: element names in order, with counts.
  return parsed.atoms
    .map((a) => (a.count > 1 ? `${MULTIPLIERS[a.count] ?? a.count}${elementName(a.element)}` : elementName(a.element)))
    .join(' ');
}

/**
 * English name of a compound.
 *
 * Looks up `COMPOUND_NAMES` with the plain formula, then falls back to
 * `systematicName()`. Returns an empty string for unparseable input.
 */
export function compoundName(formulaPlain: string): string {
  if (typeof formulaPlain !== 'string' || formulaPlain.trim() === '') return '';
  const plain = toPlainFormula(formulaPlain);
  const direct = COMPOUND_NAMES[plain];
  if (direct) return direct;

  // Match ignoring a leading stoichiometric coefficient, e.g. `2H2O` -> water.
  const withoutCoefficient = plain.replace(/^\d+(?=[A-Z(])/, '');
  if (COMPOUND_NAMES[withoutCoefficient]) return COMPOUND_NAMES[withoutCoefficient];

  // Match ignoring the charge, e.g. `SO4^2-` -> sulfate.
  const withoutCharge = withoutCoefficient.replace(/[+-]$/, '').replace(/\^\d*[+-]$/, '');
  if (COMPOUND_NAMES[withoutCharge]) return COMPOUND_NAMES[withoutCharge];

  return systematicName(plain);
}

/** Pluralise a compound name for a count, e.g. `1 mol of water`, `2 mol of ...`. */
export function pluralise(name: string, count: number): string {
  if (count === 1) return name;
  if (/(s|x|z|ch|sh)$/.test(name)) return `${name}es`;
  if (/[^aeiou]y$/.test(name)) return `${name.slice(0, -1)}ies`;
  return `${name}s`;
}

export { CATION_CHARGES, METAL_SYMBOLS, POLYATOMIC_ANIONS, countCharge };
