/**
 * Ion helpers shared by the solubility and naming modules.
 *
 * Knows the common high-school cations and polyatomic anions well enough to
 * split a neutral formula such as `Ca3(PO4)2` into `Ca2+` and `PO4^3-`.
 */

import { parseFormula, toPlainFormula, type AtomCount, type FormulaNode } from './formula';
import { SYMBOL_TO_Z } from './elementSymbols';

export type IonSide = 'cation' | 'anion';

export interface IonSplit {
  /** Plain formula of the cation, e.g. `Ca^2+`. Empty when the species is an acid. */
  cation: string;
  /** Plain formula of the anion, e.g. `PO4^3-`. Empty when the species is an acid. */
  anion: string;
  cationCharge: number;
  anionCharge: number;
  /** True when the formula looks like a molecular acid (H + non-metal). */
  isAcid: boolean;
  /** True when the whole formula is a single polyatomic ion (SO4^2-). */
  isPolyatomicIon: boolean;
}

/** English element names, 1-based by atomic number (index 0 unused). */
const ELEMENT_NAMES: string[] = [
  '', 'hydrogen', 'helium', 'lithium', 'beryllium', 'boron', 'carbon', 'nitrogen', 'oxygen',
  'fluorine', 'neon', 'sodium', 'magnesium', 'aluminium', 'silicon', 'phosphorus', 'sulfur',
  'chlorine', 'argon', 'potassium', 'calcium', 'scandium', 'titanium', 'vanadium', 'chromium',
  'manganese', 'iron', 'cobalt', 'nickel', 'copper', 'zinc', 'gallium', 'germanium', 'arsenic',
  'selenium', 'bromine', 'krypton', 'rubidium', 'strontium', 'yttrium', 'zirconium', 'niobium',
  'molybdenum', 'technetium', 'ruthenium', 'rhodium', 'palladium', 'silver', 'cadmium', 'indium',
  'tin', 'antimony', 'tellurium', 'iodine', 'xenon', 'cesium', 'barium', 'lanthanum', 'cerium',
  'praseodymium', 'neodymium', 'promethium', 'samarium', 'europium', 'gadolinium', 'terbium',
  'dysprosium', 'holmium', 'erbium', 'thulium', 'ytterbium', 'lutetium', 'hafnium', 'tantalum',
  'tungsten', 'rhenium', 'osmium', 'iridium', 'platinum', 'gold', 'mercury', 'thallium', 'lead',
  'bismuth', 'polonium', 'astatine', 'radon', 'francium', 'radium', 'actinium', 'thorium',
  'protactinium', 'uranium', 'neptunium', 'plutonium', 'americium', 'curium', 'berkelium',
  'californium', 'einsteinium', 'fermium', 'mendelevium', 'nobelium', 'lawrencium',
  'rutherfordium', 'dubnium', 'seaborgium', 'bohrium', 'hassium', 'meitnerium', 'darmstadtium',
  'roentgenium', 'copernicium', 'nihonium', 'flerovium', 'moscovium', 'livermorium', 'tennessine',
  'oganesson',
];

/** Common metal/non-metal cations -> charge. */
export const CATION_CHARGES: Record<string, number> = {
  // Group 1
  Li: 1, Na: 1, K: 1, Rb: 1, Cs: 1, Fr: 1,
  // Group 2
  Be: 2, Mg: 2, Ca: 2, Sr: 2, Ba: 2, Ra: 2,
  // Frequent main-group and transition cations
  Al: 3, Zn: 2, Ag: 1, Cd: 2, Pb: 2, Sn: 2, Cu: 1, Hg: 1, Fe: 2, Ni: 2, Co: 2, Cr: 3,
  Mn: 2, V: 5, Ti: 4, Sc: 3, Au: 3, Pt: 2, Pd: 2, Bi: 3,
};

/** Cations whose common charge is 2 but which are often taught as 3+. */
export const CATION_ALTERNATE_CHARGE: Record<string, number> = { Fe: 3, Cu: 2, Sn: 4, Pb: 4, Co: 3, Cr: 2, Mn: 4, Hg: 2, Bi: 5, Ag: 2 };

/** Metals, used to decide which side of a formula is the cation. */
export const METAL_SYMBOLS: ReadonlySet<string> = new Set([
  'Li', 'Be', 'Na', 'Mg', 'Al', 'K', 'Ca', 'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu',
  'Zn', 'Ga', 'Rb', 'Sr', 'Y', 'Zr', 'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn',
  'Cs', 'Ba', 'La', 'Ce', 'Pr', 'Nd', 'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb',
  'Lu', 'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg', 'Tl', 'Pb', 'Bi', 'Po', 'Fr', 'Ra',
  'Ac', 'Th', 'Pa', 'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm', 'Md', 'No', 'Lr',
  'Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds', 'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv',
]);

/** Common polyatomic cations. */
export const POLYCATIONIC_IONS: Record<string, number> = {
  'NH4': 1,
  'H3O': 1,
};

/** Common polyatomic anions -> charge. */
export const POLYATOMIC_ANIONS: Record<string, number> = {
  OH: -1, NO3: -1, NO2: -1, HCO3: -1, HSO4: -1, HSO3: -1, C2H3O2: -1, ClO: -1, ClO3: -1,
  ClO4: -1, BrO: -1, BrO3: -1, IO3: -1, IO4: -1, MnO4: -2, CN: -1, SCN: -1, OCN: -1,
  SO3: -2, SO4: -2, CO3: -2, CrO4: -2, Cr2O7: -2, S: -2, S2O3: -2, S2O8: -2, P: -3,
  PO4: -3, PO3: -3, H2PO4: -1, HPO4: -2, PH2O2: -1, SiO3: -2, SiO4: -4, BO3: -3, B4O7: -2,
  CO: -2, C2O4: -2, AsO4: -3, AsO3: -3, SeO4: -2, SeO3: -2, TeO4: -2, VO4: -3, WO4: -2,
  MoO4: -2, C6H5O: -1,
};

/** English names of the common polyatomic anions. */
export const POLYATOMIC_ANION_NAMES: Record<string, string> = {
  OH: 'hydroxide', NO3: 'nitrate', NO2: 'nitrite', HCO3: 'hydrogen carbonate',
  HSO4: 'hydrogen sulfate', HSO3: 'hydrogen sulfite', C2H3O2: 'acetate', ClO: 'hypochlorite',
  ClO3: 'chlorate', ClO4: 'perchlorate', BrO: 'hypobromite', BrO3: 'bromate', IO3: 'iodate',
  IO4: 'periodate', MnO4: 'permanganate', CN: 'cyanide', SCN: 'thiocyanate', OCN: 'cyanate',
  SO3: 'sulfite', SO4: 'sulfate', CO3: 'carbonate', CrO4: 'chromate', Cr2O7: 'dichromate',
  S: 'sulfide', S2O3: 'thiosulfate', S2O8: 'persulfate', P: 'phosphide', PO4: 'phosphate',
  PO3: 'phosphite', H2PO4: 'dihydrogen phosphate', HPO4: 'hydrogen phosphate', SiO3: 'silicate',
  SiO4: 'orthosilicate', BO3: 'borate', B4O7: 'tetraborate', CO: 'carbonyl', C2O4: 'oxalate',
  AsO4: 'arsenate', AsO3: 'arsenite', SeO4: 'selenate', SeO3: 'selenite', TeO4: 'tellurate',
  VO4: 'vanadate', WO4: 'tungstate', MoO4: 'molybdate', C6H5O: 'phenoxide', NH4: 'ammonium',
};

/** English names of the monatomic anions (element name + "ide"). */
const ANION_SUFFIX: Record<string, string> = {
  H: 'hydride', B: 'boride', C: 'carbide', N: 'nitride', O: 'oxide', F: 'fluoride',
  Si: 'silicide', P: 'phosphide', S: 'sulfide', Cl: 'chloride', Se: 'selenide', Br: 'bromide',
  Te: 'telluride', I: 'iodide', As: 'arsenide',
};

/** Metals that need a Roman numeral because they have two common valences. */
export const ROMAN_METALS: Record<string, Record<number, string>> = {
  Fe: { 1: '', 2: 'iron(II)', 3: 'iron(III)', 4: 'iron(IV)' },
  Cu: { 1: 'copper(I)', 2: 'copper(II)', 3: '', 4: '' },
  Pb: { 1: 'lead(I)', 2: 'lead(II)', 3: '', 4: 'lead(IV)' },
  Sn: { 1: 'tin(I)', 2: 'tin(II)', 3: '', 4: 'tin(IV)' },
  Co: { 1: 'cobalt(I)', 2: 'cobalt(II)', 3: 'cobalt(III)', 4: '' },
  Ni: { 1: 'nickel(I)', 2: 'nickel(II)', 3: 'nickel(III)', 4: '' },
  Cr: { 1: 'chromium(I)', 2: 'chromium(II)', 3: 'chromium(III)', 4: '' },
  Mn: { 1: 'manganese(I)', 2: 'manganese(II)', 3: 'manganese(III)', 4: 'manganese(IV)' },
  Hg: { 1: 'mercury(I)', 2: 'mercury(II)', 3: '', 4: '' },
  Bi: { 1: '', 2: 'bismuth(II)', 3: 'bismuth(III)', 4: '' },
  Ag: { 1: 'silver(I)', 2: 'silver(II)', 3: '', 4: '' },
  Ti: { 1: '', 2: 'titanium(II)', 3: 'titanium(III)', 4: 'titanium(IV)' },
  V: { 1: '', 2: 'vanadium(II)', 3: 'vanadium(III)', 4: '', 5: 'vanadium(V)' },
  Au: { 1: 'gold(I)', 2: '', 3: 'gold(III)', 4: '' },
  Pt: { 1: 'platinum(I)', 2: 'platinum(II)', 3: '', 4: 'platinum(IV)' },
};

export function elementName(symbol: string): string {
  return ELEMENT_NAMES[SYMBOL_TO_Z[symbol]] ?? symbol.toLowerCase();
}

/* ------------------------------------------------------------------ */
/* Unicode ion symbols                                                 */
/* ------------------------------------------------------------------ */

/**
 * Convert a Unicode ion symbol to its plain ASCII form.
 *
 *   `SO₄²⁻` -> `SO4^2-`   `Fe³⁺` -> `Fe^3+`   `NH₄⁺` -> `NH4+`   `Cl⁻` -> `Cl-`
 *
 * Falls back to a best-effort character-wise transliteration when the input is
 * not a parseable formula, so it is safe to call on arbitrary data-worker
 * strings.
 */
export function symbolToPlainIon(symbol: string): string {
  if (typeof symbol !== 'string') return '';
  const direct = toPlainFormula(symbol);
  if (direct && !/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻₀-₉]/.test(direct)) return direct;

  let out = '';
  for (const ch of symbol) {
    const sub = '₀₁₂₃₄₅₆₇₈₉'.indexOf(ch);
    if (sub >= 0) {
      out += String(sub);
      continue;
    }
    if (ch === '⁺') {
      out += '+';
      continue;
    }
    if (ch === '⁻') {
      out += '-';
      continue;
    }
    if ('⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(ch) >= 0) {
      out += `^${'⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(ch)}`;
      continue;
    }
    out += ch;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Cation / anion splitting                                            */
/* ------------------------------------------------------------------ */

function plainOf(nodes: FormulaNode[], charge: number): string {
  const text = renderPlain(nodes);
  if (!charge) return text;
  return Math.abs(charge) === 1
    ? `${text}${charge > 0 ? '+' : '-'}`
    : `${text}^${Math.abs(charge)}${charge > 0 ? '+' : '-'}`;
}

function renderPlain(nodes: FormulaNode[]): string {
  let out = '';
  for (const node of nodes) {
    if (node.kind === 'atom') {
      out += node.element + (node.count > 1 ? String(node.count) : '');
    } else if (node.kind === 'group') {
      out +=
        node.open +
        renderPlain(node.items) +
        (node.open === '(' ? ')' : ']') +
        (node.count > 1 ? String(node.count) : '');
    } else {
      out += '.' + (node.count > 1 ? String(node.count) : '') + renderPlain(node.items);
    }
  }
  return out;
}

function subAtom(nodes: FormulaNode[], index: number): FormulaNode[] {
  return nodes.slice(index, index + 1);
}

function restAtoms(nodes: FormulaNode[], from: number): FormulaNode[] {
  return nodes.slice(from);
}

function isMetalNode(node: FormulaNode): boolean {
  return node.kind === 'atom' && METAL_SYMBOLS.has(node.element);
}

/**
 * The formula of ONE ion from a node list.
 *
 * Group multipliers are removed — `(OH)2` is two `OH-` ions, and `(NH4)2` is
 * two `NH4+` ions — while genuine polyatomic subscripts are kept, so `SO4`
 * stays `SO4` and `CaF2` gives the single body `F`.
 */
function ionUnit(nodes: FormulaNode[]): { body: string; units: number } {
  if (nodes.length === 1 && nodes[0].kind === 'atom') {
    return { body: nodes[0].element, units: nodes[0].count };
  }
  let units = 1;
  for (const node of nodes) if (node.kind !== 'atom') units *= node.count;
  return { body: ionUnitBody(nodes), units };
}

function ionUnitBody(nodes: FormulaNode[]): string {
  const order: string[] = [];
  const totals = new Map<string, number>();
  const walk = (list: FormulaNode[]): void => {
    for (const node of list) {
      if (node.kind === 'atom') {
        if (!totals.has(node.element)) {
          order.push(node.element);
          totals.set(node.element, node.count);
        } else {
          totals.set(node.element, (totals.get(node.element) as number) + node.count);
        }
      } else {
        walk(node.items);
      }
    }
  };
  walk(nodes);
  return order
    .map((element) => {
      const n = totals.get(element) as number;
      return n > 1 ? `${element}${n}` : element;
    })
    .join('');
}

/** Build a plain ion formula: `SO4` + (-2) -> `SO4^2-`. */
function bodyToIon(body: string, charge: number): string {
  if (!charge) return body;
  return Math.abs(charge) === 1
    ? `${body}${charge > 0 ? '+' : '-'}`
    : `${body}^${Math.abs(charge)}${charge > 0 ? '+' : '-'}`;
}

/** Charges of the monatomic anions that appear in salts. */
export const ANION_CHARGES: Record<string, number> = {
  H: -1, N: -3, P: -3, O: -2, S: -2, Se: -2, F: -1, Cl: -1, Br: -1, I: -1, C: -4, B: -3, Si: -4,
};

const emptySplit = (): IonSplit => ({
  cation: '',
  anion: '',
  cationCharge: 0,
  anionCharge: 0,
  isAcid: false,
  isPolyatomicIon: false,
});

/**
 * Split a neutral formula into its cation and anion.
 *
 * Handles monatomic salts (`CaCl2`), polyatomic salts (`Ca3(PO4)2`),
 * ammonium salts (`(NH4)2SO4`) and detects acids (`H2SO4`, `HCl`, `H2S`).
 * Each ion is written as one formula unit, so `Ba(NO3)2` gives `Ba^2+` and
 * `NO3^-` rather than `NO3^2-`.
 * Returns an all-empty split when the formula cannot be classified.
 */
export function splitIntoIons(formulaPlain: string): IonSplit {
  const parsed = parseFormula(formulaPlain);
  if (!parsed.ok || !parsed.group || parsed.group.length === 0) return emptySplit();

  const nodes = parsed.group;
  const first = nodes[0];
  const key = (list: FormulaNode[]): string => renderPlain(list);

  // A whole formula that is itself a polyatomic ion, e.g. SO4^2-.
  if (nodes.length === 1 && parsed.charge !== 0) {
    const body = ionUnit(nodes).body;
    return {
      cation: '',
      anion: bodyToIon(body, parsed.charge),
      cationCharge: 0,
      anionCharge: parsed.charge,
      isAcid: false,
      isPolyatomicIon: true,
    };
  }

  // Ammonium and hydronium lead the formula: ((NH4)2SO4, NH4Cl, H3O+).
  if (first.kind === 'group' && key(first.items) === 'NH4') {
    const cationCharge = 1;
    const tail = nodes.slice(1);
    const unit = ionUnit(tail);
    const anionCharge = unit.body ? POLYATOMIC_ANIONS[unit.body] ?? ANION_CHARGES[unit.body] ?? -1 : 0;
    return {
      cation: bodyToIon(ionUnit(first.items).body, cationCharge),
      anion: unit.body ? bodyToIon(unit.body, anionCharge) : '',
      cationCharge,
      anionCharge,
      isAcid: false,
      isPolyatomicIon: false,
    };
  }
  if (first.kind === 'group' && key(first.items) === 'H3O') {
    const unit = ionUnit(nodes.slice(1));
    const anionCharge = unit.body ? POLYATOMIC_ANIONS[unit.body] ?? ANION_CHARGES[unit.body] ?? -1 : 0;
    return {
      cation: 'H3O+',
      anion: unit.body ? bodyToIon(unit.body, anionCharge) : '',
      cationCharge: 1,
      anionCharge,
      isAcid: false,
      isPolyatomicIon: false,
    };
  }

  // A metal leads the formula: the metal is the cation, the rest is the anion.
  if (isMetalNode(first) && first.kind === 'atom') {
    const perIon = CATION_CHARGES[first.element] ?? 2;
    const rest = nodes.slice(1);
    const unit = ionUnit(rest);
    const anionBody = unit.body;
    const anionCharge = anionBody
      ? POLYATOMIC_ANIONS[anionBody] ?? ANION_CHARGES[anionBody] ?? -1
      : 0;
    return {
      cation: bodyToIon(first.element, perIon),
      anion: anionBody ? bodyToIon(anionBody, anionCharge) : '',
      cationCharge: perIon,
      anionCharge: anionCharge,
      isAcid: false,
      isPolyatomicIon: false,
    };
  }

  // Acids: hydrogen plus one or more non-metals, and nothing metallic. Water
  // itself is excluded — it is a molecular liquid, not an acid.
  if (first.kind === 'atom' && first.element === 'H') {
    const rest = nodes.slice(1);
    const body = ionUnit(nodes).body;
    if (rest.length > 0 && !rest.some(isMetalNode) && body !== 'H2O') {
      return { ...emptySplit(), isAcid: true };
    }
  }

  // No metal: look for a polyatomic or monatomic anion somewhere in the tail,
  // so NH4Cl and KNO3 still split.
  for (let splitAt = 1; splitAt < nodes.length; splitAt += 1) {
    const tail = nodes.slice(splitAt);
    const body = ionUnit(tail).body;
    const headBody = ionUnit(nodes.slice(0, splitAt)).body;
    const headIsPolycation = POLYCATIONIC_IONS[headBody] !== undefined;
    const known = POLYATOMIC_ANIONS[body] ?? (headIsPolycation ? ANION_CHARGES[body] : undefined);
    if (known === undefined) continue;
    return {
      cation: bodyToIon(headBody, -known),
      anion: bodyToIon(body, known),
      cationCharge: -known,
      anionCharge: known,
      isAcid: false,
      isPolyatomicIon: false,
    };
  }

  return emptySplit();
}

/** Total atom count of a node list, counting group multipliers. */
export function countCharge(nodes: FormulaNode[], perNode: number): number {
  let total = 0;
  for (const node of nodes) {
    if (node.kind === 'atom') total += node.count * perNode;
    else total += countCharge(node.items, perNode) * node.count;
  }
  return total;
}

/** Sum of all atom counts in an atom list. */
export function sumCounts(atoms: AtomCount[]): number {
  return atoms.reduce((sum, a) => sum + a.count, 0);
}

/** Total ionic charge magnitude implied by splitting `formulaPlain`. */
export function netIonicCharge(split: IonSplit): number {
  return split.cationCharge + split.anionCharge;
}

export { ELEMENT_NAMES };
