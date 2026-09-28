/**
 * Chemical equation parser, exact balancer, reaction classifier and
 * stoichiometry prose.
 *
 * The balancer is exact: the element x species conservation matrix is reduced by
 * Gaussian elimination with partial pivoting over the rationals (BigInt-backed),
 * so it always produces the smallest integer coefficients and never suffers from
 * floating-point drift. Nothing in this module throws — every failure comes back
 * as `ok: false` with a human-readable `error`.
 */

import {
  parseFormula,
  renderNodes,
  formatCharge,
  plainCharge,
  atomsToMap,
  sameComposition,
  type AtomCount,
  type FormulaNode,
} from './formula';
import { molarMass } from './mass';
import { compoundName } from './compoundNames';
import type { ReactionType } from '../../types/chem';

export type { ReactionType };

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

export interface Species {
  /** Unicode display form of the formula, e.g. `Fe₂O₃`. */
  formula: string;
  /** ASCII form of the formula, e.g. `Fe2O3`. */
  formulaPlain: string;
  /** The (derived) stoichiometric coefficient. */
  coefficient: number;
  atoms: AtomCount[];
  charge: number;
  /** Molar mass in g/mol, rounded to 3 decimals. */
  mass: number;
  /** English name from the compound-name table / systematic fallback. */
  name?: string;
}

export interface BalanceResult {
  ok: boolean;
  error?: string;
  reactants: Species[];
  products: Species[];
  /** Unicode balanced equation, e.g. `2H₂ + O₂ → 2H₂O`. */
  balanced: string;
  /** ASCII balanced equation, e.g. `2H2 + O2 -> 2H2O`. */
  balancedPlain: string;
  /** Coefficients in species order: reactants then products. */
  coefficients: number[];
  /** Human-readable walkthrough of the balance. */
  steps?: string[];
  /** True when the equation as typed was already balanced and in lowest terms. */
  reduced: boolean;
  /** True when the input is an ionic equation (at least one charged species). */
  ionic: boolean;
  /**
   * Number of free parameters in the solution space. Zero means the
   * coefficients are unique. Anything above zero means the equation is
   * UNDER-DETERMINED — e.g. `H2 + O2 -> H2O + H2O2` balances in infinitely
   * many ways — and the coefficients below are only ONE member of that family.
   * The UI must say so, or the student is taught a wrong answer: the tool
   * otherwise offered `2CH4 + 3O2 -> CO2 + 4H2O + C` where the reaction a
   * student is thinking of is `2CH4 + 2O2 -> CO2 + 4H2O`.
   */
  freeParameters?: number;
  /** Elements that appear on only one side — useful for spotting typos. */
  unbalancedElements: string[];
}

const UNICODE_ARROW = '→';
const PLAIN_ARROW = '->';
const ARROW_RE = /(?:--+>|-{1,2}>|→|⟶|⟹|⇒|↦|➔|⇌|↔|=)/;

/* ------------------------------------------------------------------ */
/* Exact rationals                                                     */
/* ------------------------------------------------------------------ */

class Q {
  readonly n: bigint;
  readonly d: bigint;

  private constructor(n: bigint, d: bigint) {
    if (d === 0n) throw new Error('rational with zero denominator');
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    const g = bigGcd(n < 0n ? -n : n, d);
    this.n = g === 0n ? 0n : n / g;
    this.d = d / g;
  }

  static of(n: bigint | number, d: bigint | number = 1n): Q {
    return new Q(BigInt(n), BigInt(d));
  }

  static zero(): Q {
    return new Q(0n, 1n);
  }

  get isZero(): boolean {
    return this.n === 0n;
  }

  abs(): Q {
    return this.n < 0n ? new Q(-this.n, this.d) : this;
  }

  add(o: Q): Q {
    return new Q(this.n * o.d + o.n * this.d, this.d * o.d);
  }

  sub(o: Q): Q {
    return new Q(this.n * o.d - o.n * this.d, this.d * o.d);
  }

  mul(o: Q): Q {
    return new Q(this.n * o.n, this.d * o.d);
  }

  div(o: Q): Q {
    if (o.n === 0n) throw new Error('division by zero');
    return new Q(this.n * o.d, this.d * o.n);
  }

  neg(): Q {
    return new Q(-this.n, this.d);
  }

  /** True when |a| > |b|. */
  static absGreater(a: Q, b: Q): boolean {
    return a.abs().n * b.d > b.abs().n * a.d;
  }

  static lcm(a: bigint, b: bigint): bigint {
    if (a === 0n || b === 0n) return 0n;
    const aa = a < 0n ? -a : a;
    const bb = b < 0n ? -b : b;
    return (aa / bigGcd(aa, bb)) * bb;
  }

  toNumber(): number {
    return Number(this.n) / Number(this.d);
  }
}

function bigGcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

/* ------------------------------------------------------------------ */
/* Equation parsing                                                    */
/* ------------------------------------------------------------------ */

interface RawSpecies {
  /** The text exactly as it appeared between the `+` signs. */
  raw: string;
  /** Leading integer that was written, or 0 when none. */
  coefficient: number;
  formula: string;
  formulaPlain: string;
  atoms: AtomCount[];
  charge: number;
  group: FormulaNode[];
}

interface ParsedEquation {
  ok: boolean;
  error?: string;
  left: RawSpecies[];
  right: RawSpecies[];
  leftText: string;
  rightText: string;
  arrow: string;
}

const LEADING_COEFFICIENT_RE = /^\s*(\d+)\s*/;

/** Split a side into species, preferring a spaced `+` as the separator. */
function splitSpecies(side: string): string[] {
  const trimmed = side.trim();
  if (trimmed === '') return [];

  const spaced = trimmed
    .split(/\s+\+\s+/)
    .map((s) => s.trim())
    .filter((s) => s !== '');
  if (spaced.length > 1) return spaced;

  // `Na+ +Cl-` — a plus preceded by whitespace starts a new species.
  const afterSpace = trimmed
    .split(/\s\+/)
    .map((s) => s.trim())
    .filter((s) => s !== '');
  if (afterSpace.length > 1) return afterSpace;

  return [trimmed];
}

function parseSpeciesList(sideText: string, tokens: string[]): { list: RawSpecies[]; error?: string } {
  const list: RawSpecies[] = [];
  const seen = new Map<string, number>();

  for (const token of tokens) {
    const coeffMatch = LEADING_COEFFICIENT_RE.exec(token);
    let coefficient = 0;
    let body = token;
    if (coeffMatch) {
      coefficient = Number(coeffMatch[1]);
      body = token.slice(coeffMatch[0].length).trim();
      if (!Number.isFinite(coefficient) || coefficient < 1) {
        return { list, error: `"${token}" is not a valid species` };
      }
      if (body === '') return { list, error: `missing formula after the coefficient in "${token}"` };
    }

    const parsed = parseFormula(body);
    if (!parsed.ok) {
      return { list, error: `could not read "${token}": ${parsed.error ?? 'invalid formula'}` };
    }

    const formulaPlain = renderNodes(parsed.group as FormulaNode[], 'plain') + plainCharge(parsed.charge);
    const duplicateIndex = seen.get(formulaPlain);
    if (duplicateIndex !== undefined) {
      return {
        list,
        error: `the species ${formulaPlain} appears twice on the same side of the equation`,
      };
    }
    seen.set(formulaPlain, list.length);

    list.push({
      raw: token,
      coefficient,
      formula: renderNodes(parsed.group as FormulaNode[], 'unicode') + formatCharge(parsed.charge),
      formulaPlain,
      atoms: parsed.atoms,
      charge: parsed.charge,
      group: parsed.group as FormulaNode[],
    });
  }

  return { list };
}

/** Parse `A + B -> C + D`. Never throws. */
export function parseEquation(input: string): ParsedEquation {
  const fail = (error: string, leftText = '', rightText = '', arrow = ''): ParsedEquation => ({
    ok: false,
    error,
    left: [],
    right: [],
    leftText,
    rightText,
    arrow,
  });

  if (typeof input !== 'string') return fail('equation must be a string');
  const text = input.trim();
  if (text === '') return fail('the equation is empty');

  const match = ARROW_RE.exec(text);
  if (!match) return fail(`no reaction arrow found in "${text}" — use "->" or "→"`);

  const leftText = text.slice(0, match.index).trim();
  const rightText = text.slice(match.index + match[0].length).trim();
  if (leftText === '') return fail('the left-hand side of the equation is empty', leftText, rightText, match[0]);
  if (rightText === '') return fail('the right-hand side of the equation is empty', leftText, rightText, match[0]);

  let leftTokens = splitSpecies(leftText);
  if (leftTokens.length === 0) return fail('the left-hand side of the equation is empty', leftText, rightText, match[0]);
  let rightTokens = splitSpecies(rightText);
  if (rightTokens.length === 0) return fail('the right-hand side of the equation is empty', leftText, rightText, match[0]);

  let left = parseSpeciesList(leftText, leftTokens);
  let right = parseSpeciesList(rightText, rightTokens);

  // Retry with an aggressive split if a token could not be read: the equation
  // was probably written without spaces, e.g. `H2+O2->H2O`.
  if (left.error || right.error) {
    const leftAll = leftText.split('+').map((s) => s.trim()).filter(Boolean);
    const rightAll = rightText.split('+').map((s) => s.trim()).filter(Boolean);
    if (leftAll.length > leftTokens.length || rightAll.length > rightTokens.length) {
      const leftRetry = parseSpeciesList(leftText, leftAll);
      const rightRetry = parseSpeciesList(rightText, rightAll);
      if (!leftRetry.error && !rightRetry.error) {
        left = leftRetry;
        right = rightRetry;
        leftTokens = leftAll;
        rightTokens = rightAll;
      }
    }
  }

  if (left.error) return fail(left.error, leftText, rightText, match[0]);
  if (right.error) return fail(right.error, leftText, rightText, match[0]);

  // The same species on both sides makes the equation meaningless.
  const leftKeys = new Set(left.list.map((s) => s.formulaPlain));
  const shared = right.list.find((s) => leftKeys.has(s.formulaPlain));
  if (shared) {
    return fail(`${shared.formulaPlain} appears on both sides of the equation`, leftText, rightText, match[0]);
  }

  return { ok: true, left: left.list, right: right.list, leftText, rightText, arrow: match[0] };
}

/* ------------------------------------------------------------------ */
/* Matrix balancing                                                    */
/* ------------------------------------------------------------------ */

interface MatrixBalance {
  ok: boolean;
  error?: string;
  coefficients: number[];
  rank: number;
  nullity: number;
  unbalancedElements: string[];
}

/**
 * Solve `M c = 0` for the smallest all-positive integer `c`.
 *
 * `M` is `rows x speciesCount`; reactants are positive, products negative.
 */
function solveNullSpace(M: Q[][], speciesCount: number, rowLabels: string[]): MatrixBalance {
  const rowCount = M.length;
  if (rowCount === 0) {
    return { ok: false, error: 'there are no elements to balance', coefficients: [], rank: 0, nullity: speciesCount, unbalancedElements: [] };
  }

  // Reduced row echelon form with partial pivoting.
  const A = M.map((row) => row.slice());
  const pivotColOfRow: number[] = new Array(rowCount).fill(-1);
  let rank = 0;

  for (let col = 0; col < speciesCount && rank < rowCount; col += 1) {
    let best = -1;
    for (let r = rank; r < rowCount; r += 1) {
      if (A[r][col].isZero) continue;
      if (best === -1 || Q.absGreater(A[r][col], A[best][col])) best = r;
    }
    if (best === -1) continue;

    const tmp = A[rank];
    A[rank] = A[best];
    A[best] = tmp;

    const pivot = A[rank][col];
    for (let c = 0; c < speciesCount; c += 1) A[rank][c] = A[rank][c].div(pivot);

    for (let r = 0; r < rowCount; r += 1) {
      if (r === rank) continue;
      const factor = A[r][col];
      if (factor.isZero) continue;
      for (let c = 0; c < speciesCount; c += 1) {
        A[r][c] = A[r][c].sub(factor.mul(A[rank][c]));
      }
    }

    pivotColOfRow[rank] = col;
    rank += 1;
  }

  const pivotCols = pivotColOfRow.slice(0, rank).filter((c) => c >= 0);
  const freeCols: number[] = [];
  const isPivot = new Set(pivotCols);
  for (let c = 0; c < speciesCount; c += 1) if (!isPivot.has(c)) freeCols.push(c);

  if (freeCols.length === 0) {
    return {
      ok: false,
      error: 'the equation cannot be balanced — some element appears on only one side',
      coefficients: [],
      rank,
      nullity: 0,
      unbalancedElements: rowLabels.filter((_, i) => i < rank),
    };
  }

  // Which rows are the conservation equations that are still satisfiable?
  const oneSided: string[] = [];
  for (let i = 0; i < rank; i += 1) {
    const rowHasNonZero = A[i].some((v) => !v.isZero);
    if (!rowHasNonZero) oneSided.push(rowLabels[i] ?? '');
  }

  // Null-space basis.
  const basis: Q[][] = freeCols.map((free) => {
    const v = Array.from({ length: speciesCount }, () => Q.zero());
    v[free] = Q.of(1n);
    for (let i = 0; i < rank; i += 1) {
      const pc = pivotColOfRow[i];
      if (pc < 0) continue;
      v[pc] = A[i][free].neg();
    }
    return v;
  });

  let bestVec: number[] | null = null;
  const freeParameters = freeCols.length; // reported back as `freeParameters`

  if (freeCols.length === 1) {
    bestVec = toSmallestIntegers(basis[0]);
  } else {
    // Under-determined (e.g. an extra reagent that does not take part): search a
    // small, deterministic box of combinations for the smallest all-positive
    // integer solution.
    bestVec = searchSmallPositive(basis, freeCols.length);
  }

  if (!bestVec) {
    return {
      ok: false,
      error:
        freeParameters > MAX_SEARCH_NULLITY
          ? `this equation has ${freeParameters} independent balances to solve and is too complex to balance automatically — try a simpler equation`
          : 'no set of positive whole-number coefficients balances this equation',
      coefficients: [],
      rank,
      nullity: freeCols.length,
      unbalancedElements: oneSided,
    };
  }

  const zero = bestVec.findIndex((c) => c === 0);
  if (zero >= 0) {
    return {
      ok: false,
      error:
        `species ${zero + 1} would need a coefficient of 0, so it does not take part in this reaction — remove it from the equation`,
      coefficients: bestVec,
      rank,
      nullity: freeCols.length,
      unbalancedElements: oneSided,
    };
  }
  if (bestVec.some((c) => c < 0)) {
    return {
      ok: false,
      error: 'the equation balances only with a negative coefficient, so the products should be swapped for the reactants',
      coefficients: bestVec,
      rank,
      nullity: freeCols.length,
      unbalancedElements: oneSided,
    };
  }

  return { ok: true, coefficients: bestVec, rank, nullity: freeCols.length, unbalancedElements: oneSided };
}

/** Scale a rational vector to coprime positive-ish integers. */
function toSmallestIntegers(vec: Q[]): number[] {
  let l = 1n;
  for (const v of vec) l = Q.lcm(l, v.d);
  const ints = vec.map((v) => (v.n * l) / v.d);
  let g = 0n;
  for (const i of ints) {
    const abs = i < 0n ? -i : i;
    g = bigGcd(g, abs);
  }
  const scaled = (g === 0n ? ints : ints.map((i) => i / g)).map((i) => Number(i));
  const sum = scaled.reduce((a, b) => a + b, 0);
  return sum < 0 ? scaled.map((i) => -i) : scaled;
}

const SEARCH_RANGE = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

/** How many free parameters the bounded search is willing to enumerate. */
const MAX_SEARCH_NULLITY = 4;

/**
 * Deterministic bounded search for a small all-positive integer solution.
 *
 * The box is 9^nullity entries, so the cap matters: nullity 4 is 6561
 * combinations (fine), nullity 5 would be 59049. Beyond the cap we return
 * null and the caller reports a specific, honest error rather than the old
 * misleading "no set of positive coefficients balances this equation" — a
 * high-nullity equation often IS balanceable, it just needs a wider search
 * than a grid can give.
 */
function searchSmallPositive(basis: Q[][], nullity: number): number[] | null {
  if (nullity > MAX_SEARCH_NULLITY) return null;
  let best: number[] | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  const combo = new Array<number>(nullity).fill(1);
  const total = SEARCH_RANGE.length ** nullity;
  for (let index = 0; index < total; index += 1) {
    let rest = index;
    for (let k = 0; k < nullity; k += 1) {
      combo[k] = SEARCH_RANGE[rest % SEARCH_RANGE.length];
      rest = Math.floor(rest / SEARCH_RANGE.length);
    }

    const vec = Array.from({ length: basis[0].length }, () => Q.zero());
    for (let k = 0; k < nullity; k += 1) {
      if (combo[k] === 0) continue;
      for (let i = 0; i < vec.length; i += 1) vec[i] = vec[i].add(basis[k][i].mul(Q.of(combo[k])));
    }

    const ints = toSmallestIntegers(vec);
    if (ints.some((c) => c <= 0)) continue;
    const score = ints.reduce((a, b) => a + b, 0) * 1000 + Math.max(...ints);
    if (score < bestScore) {
      bestScore = score;
      best = ints;
    }
  }

  return best;
}

/* ------------------------------------------------------------------ */
/* Balancing                                                           */
/* ------------------------------------------------------------------ */

function speciesMass(formulaPlain: string): number {
  return molarMass(formulaPlain).molarMass;
}

function toSpecies(raw: RawSpecies, coefficient: number): Species {
  const name = compoundName(raw.formulaPlain);
  return {
    formula: raw.formula,
    formulaPlain: raw.formulaPlain,
    coefficient,
    atoms: raw.atoms,
    charge: raw.charge,
    mass: speciesMass(raw.formulaPlain),
    name: name || undefined,
  };
}

/**
 * Render a side of an equation.
 *
 * The explicit leading `1` is a worksheet convention: it marks the very first
 * species of the WHOLE equation as a slot the student still has to fill in, as
 * in `1C3H8 + 5O2 -> 3CO2 + 4H2O`. It must be scoped to that one species:
 * applying it to index 0 of every side also stamped a spurious `1` on ordinary
 * unit-coefficient products, e.g. `2Al(OH)3 -> 1Al2O3 + 3H2O`.
 *
 * `leadingOne` is therefore decided by the caller, not inferred here.
 */
export function formatEquationSide(
  species: Species[],
  style: 'unicode' | 'plain' = 'unicode',
  leadingOne = false,
): string {
  return species
    .map((s, i) => {
      const text = style === 'plain' ? s.formulaPlain : s.formula;
      if (s.coefficient === 1) return i === 0 && leadingOne ? `1${text}` : text;
      return `${s.coefficient}${text}`;
    })
    .join(' + ');
}

/**
 * Should the equation's very first species print an explicit `1`?
 *
 * Only when that species really has coefficient 1 and a later species on the
 * SAME side has a larger one — otherwise every coefficient would be 1 and the
 * "1" would be noise.
 */
function wantsLeadingOne(species: Species[]): boolean {
  return species.length > 1 && species[0].coefficient === 1 && species.some((s, i) => i > 0 && s.coefficient > 1);
}

function countElement(atoms: AtomCount[], element: string): number {
  return atomsToMap(atoms)[element] ?? 0;
}

/**
 * Balance a chemical equation.
 *
 * Existing leading coefficients are stripped and re-derived, species order on
 * each side is preserved, and `reduced` is true when the equation as typed was
 * already balanced in lowest terms.
 */
export function balanceEquation(input: string): BalanceResult {
  const empty: BalanceResult = {
    ok: false,
    error: 'could not read the equation',
    reactants: [],
    products: [],
    balanced: '',
    balancedPlain: '',
    coefficients: [],
    reduced: false,
    ionic: false,
    unbalancedElements: [],
  };

  const parsed = parseEquation(input);
  if (!parsed.ok) {
    return { ...empty, error: parsed.error ?? 'invalid equation' };
  }

  const left = parsed.left;
  const right = parsed.right;
  const all = [...left, ...right];

  // Element list in order of first appearance, plus a charge row when the
  // equation is ionic.
  const elements: string[] = [];
  for (const s of all) {
    for (const a of s.atoms) if (!elements.includes(a.element)) elements.push(a.element);
  }
  const ionic = all.some((s) => s.charge !== 0);
  const rowLabels = ionic ? [...elements, 'charge'] : elements;

  // Conservation matrix: +1 for reactants, -1 for products, so that the null
  // vector c satisfies `M c = 0` for every element (and for charge when the
  // equation is ionic).
  const M: Q[][] = rowLabels.map((label) =>
    all.map((s, i) => {
      const sign = i < left.length ? 1 : -1;
      if (label === 'charge') return Q.of(sign * s.charge);
      return Q.of(sign * countElement(s.atoms, label));
    }),
  );

  const solved = solveNullSpace(M, all.length, rowLabels);
  if (!solved.ok) {
    return { ...empty, error: solved.error ?? 'could not balance', unbalancedElements: solved.unbalancedElements };
  }

  const coefficients = solved.coefficients;
  // The stoichiometric system is HOMOGENEOUS, so its null space always has at
  // least one dimension: scaling every coefficient leaves the equations
  // satisfied. That scaling is the one degree of freedom that primitivity
  // then fixes (smallest integers), and it is not a real ambiguity. So the
  // number of genuine free parameters is nullity - 1:
  //   C3H8 + O2 -> CO2 + H2O   nullity 1 -> 0   uniquely determined
  //   H2 + O2 -> H2O + H2O2    nullity 2 -> 1   under-determined
  const freeParameters = Math.max(0, solved.nullity - 1);
  const reactants = left.map((s, i) => toSpecies(s, coefficients[i]));
  const products = right.map((s, i) => toSpecies(s, coefficients[left.length + i]));

  // The leading `1` belongs to the equation's first species only.
  const lead = wantsLeadingOne(reactants);
  const balanced = `${formatEquationSide(reactants, 'unicode', lead)} ${UNICODE_ARROW} ${formatEquationSide(products, 'unicode')}`;
  const balancedPlain = `${formatEquationSide(reactants, 'plain', lead)} ${PLAIN_ARROW} ${formatEquationSide(products, 'plain')}`;

  // The equation was already balanced (and in lowest terms) when every written
  // coefficient matches the derived one, treating an absent coefficient as 1.
  const reduced = all.every((s, i) => (s.coefficient === 0 ? 1 : s.coefficient) === coefficients[i]);

  const steps = buildSteps(elements, ionic, left, right, coefficients, reduced);

  return {
    ok: true,
    reactants,
    products,
    freeParameters,
    balanced,
    balancedPlain,
    coefficients,
    steps,
    reduced,
    ionic,
    unbalancedElements: solved.unbalancedElements,
  };
}

function buildSteps(
  elements: string[],
  ionic: boolean,
  left: RawSpecies[],
  right: RawSpecies[],
  coefficients: number[],
  reduced: boolean,
): string[] {
  const steps: string[] = [];
  steps.push('1. Write the number of atoms of each element on both sides.');

  for (const element of elements) {
    let inReactants = 0;
    for (let i = 0; i < left.length; i += 1) inReactants += countElement(left[i].atoms, element) * coefficients[i];
    let inProducts = 0;
    for (let i = 0; i < right.length; i += 1) inProducts += countElement(right[i].atoms, element) * coefficients[right.length + i];
    const status = inReactants === inProducts ? 'balanced' : 'not yet balanced';
    steps.push(`   ${element}: ${inReactants} in the reactants, ${inProducts} in the products (${status}).`);
  }

  if (ionic) {
    let leftCharge = 0;
    for (let i = 0; i < left.length; i += 1) leftCharge += left[i].charge * coefficients[i];
    let rightCharge = 0;
    for (let i = 0; i < right.length; i += 1) rightCharge += right[i].charge * coefficients[right.length + i];
    steps.push(`   charge: ${leftCharge > 0 ? '+' : ''}${leftCharge} on the left, ${rightCharge > 0 ? '+' : ''}${rightCharge} on the right.`);
  }

  steps.push(
    '2. Choose the smallest whole numbers that make every count equal, keeping the first species as 1 where possible.',
  );
  steps.push(`3. Coefficients (smallest whole numbers): ${coefficients.join(', ')}.`);
  steps.push(
    reduced
      ? '4. The equation was already balanced, so nothing needed to be changed.'
      : '4. Divide through by the common factor if every coefficient shares one — the result is the lowest-terms equation.',
  );
  return steps;
}

/* ------------------------------------------------------------------ */
/* Classification                                                      */
/* ------------------------------------------------------------------ */

const isElementOnly = (atoms: AtomCount[]): boolean => atoms.length === 1;

function isHydrocarbon(atoms: AtomCount[]): boolean {
  const map = atomsToMap(atoms);
  return (map.C ?? 0) > 0 && (map.H ?? 0) > 0 && (map.O ?? 0) === 0;
}

/**
 * A carbon-and-hydrogen fuel that also contains oxygen — a hydrocarbon such as
 * CH4 or an oxygenated fuel such as ethanol, CH3OH or sucrose. Complete
 * combustion of any of these still gives only CO2 and H2O.
 */
function isCarbonHydrogenFuel(atoms: AtomCount[]): boolean {
  const map = atomsToMap(atoms);
  // `!(x) > 0` parses as `(!(x)) > 0`, i.e. `false > 0`, so this test was
  // always false and combustion could never be recognised. Compare the counts.
  if ((map.C ?? 0) <= 0 || (map.H ?? 0) <= 0) return false;
  return atoms.every((a) => a.element === 'C' || a.element === 'H' || a.element === 'O');
}

function isWater(atoms: AtomCount[]): boolean {
  const map = atomsToMap(atoms);
  return map.H === 2 && map.O === 1 && atoms.length === 2;
}

function isCarbonDioxide(atoms: AtomCount[]): boolean {
  const map = atomsToMap(atoms);
  return map.C === 1 && map.O === 2 && atoms.length === 2;
}

function isOxygen(atoms: AtomCount[]): boolean {
  return atoms.length === 1 && atoms[0].element === 'O' && atoms[0].count === 2;
}

function isCarbonMonoxide(atoms: AtomCount[]): boolean {
  const map = atomsToMap(atoms);
  return map.C === 1 && map.O === 1 && atoms.length === 2;
}

function isMetalOxide(atoms: AtomCount[]): boolean {
  const map = atomsToMap(atoms);
  const hasOxygen = (map.O ?? 0) > 0;
  const other = atoms.filter((a) => a.element !== 'O');
  return hasOxygen && other.length === 1 && ['Fe', 'Cu', 'Mg', 'Zn', 'Al', 'Ca', 'Mn'].includes(other[0].element);
}

/**
 * Classify a balanced equation into one of the five reaction types.
 *
 * Heuristics, in order:
 *   1. combustion  — a hydrocarbon (or an oxygenated C/H fuel) plus O2 giving
 *                     CO2 and H2O; also a CO/metal oxide burning in oxygen.
 *   2. decomposition — one reactant, two or more products.
 *   3. synthesis   — two or more reactants, exactly one product.
 *   4. single-replacement — two species per side, at least one element present,
 *                           and a compound on both sides.
 *   5. double-replacement — no free elements on either side and nothing
 *                           appearing unchanged on both sides.
 *
 * Returns `null` when the pattern does not clearly match.
 */
export function classifyReaction(balancedPlain: string): ReactionType | null {
  const parsed = parseEquation(balancedPlain);
  if (!parsed.ok) return null;

  const L = parsed.left.map((s) => s.atoms);
  const R = parsed.right.map((s) => s.atoms);

  // 1. Combustion.
  const burnsHydrocarbon =
    L.some(isCarbonHydrogenFuel) && L.some(isOxygen) && R.some(isCarbonDioxide) && R.some(isWater);
  const burnsOther =
    L.some((a) => isCarbonMonoxide(a) || isMetalOxide(a)) &&
    L.some(isOxygen) &&
    R.some((a) => isCarbonDioxide(a) || isMetalOxide(a)) &&
    !L.some(isCarbonHydrogenFuel);
  if (burnsHydrocarbon || burnsOther) return 'combustion';

  // 2. Decomposition.
  if (L.length === 1 && R.length >= 2) return 'decomposition';

  // 3. Synthesis.
  if (L.length >= 2 && R.length === 1) return 'synthesis';

  // 4. Single replacement: a free element somewhere, a compound on each side.
  //    This covers both `Fe + CuSO4 -> FeSO4 + Cu` and the 3-product form
  //    `Cu + 2H2SO4 -> CuSO4 + SO2 + 2H2O`.
  if (L.length >= 2 && R.length >= 2) {
    const all = [...L, ...R];
    const hasFreeElement = all.some(isElementOnly);
    const compoundOnEachSide = L.some((a) => !isElementOnly(a)) && R.some((a) => !isElementOnly(a));
    if (hasFreeElement && compoundOnEachSide) return 'single-replacement';
  }

  // 5. Double replacement.
  if (L.length >= 2 && R.length >= 2) {
    const all = [...L, ...R];
    const noFreeElements = all.every((a) => !isElementOnly(a));
    const nothingUnchanged = !L.some((l) => R.some((r) => sameComposition(l, r)));
    if (noFreeElements && nothingUnchanged) return 'double-replacement';
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* Prose                                                               */
/* ------------------------------------------------------------------ */

function joinWithAnd(parts: string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

function molPhrase(species: Species): string {
  // "2 mol of water", never "2 waters" — a mole is a counted amount, so the
  // substance name stays singular.
  const name = species.name || compoundName(species.formulaPlain) || species.formulaPlain;
  return `${species.coefficient} mol of ${name}`;
}

/**
 * A short English sentence naming every product of a balanced equation, e.g.
 * `"1 mol of carbon dioxide and 2 mol of water"`.
 */
export function describeStoichiometry(result: BalanceResult | null | undefined): string {
  if (!result || !result.ok || result.products.length === 0) return '';
  return joinWithAnd(result.products.map(molPhrase));
}

/**
 * A longer sentence naming the reactants and the products, e.g.
 * `"1 mol of methane and 2 mol of oxygen produce 1 mol of carbon dioxide and 2 mol of water."`
 */
export function describeReaction(result: BalanceResult | null | undefined): string {
  if (!result || !result.ok) return '';
  const reactants = joinWithAnd(result.reactants.map(molPhrase));
  const products = joinWithAnd(result.products.map(molPhrase));
  return `${reactants} produce${result.products.length === 1 ? 's' : ''} ${products}.`;
}

/** One-line rationale for a reaction-type answer, used by the worksheet. */
export function explainReactionType(balancedPlain: string, type: ReactionType): string {
  const parsed = parseEquation(balancedPlain);
  const names = (list: typeof parsed.left): string =>
    list
      .map((species) => compoundName(species.formulaPlain) || species.formulaPlain)
      .join(' and ');

  if (!parsed.ok) return '';
  switch (type) {
    case 'combustion':
      return 'A hydrocarbon reacts with O2 and the only products are CO2 and H2O, which is the definition of complete combustion.';
    case 'decomposition':
      return `The single reactant, ${names(parsed.left)}, breaks down into ${parsed.right.length} products, so this is a decomposition reaction.`;
    case 'synthesis':
      return `${parsed.left.length} reactants combine to give exactly one product, ${names(parsed.right)}, so this is a synthesis (combination) reaction.`;
    case 'single-replacement':
      return 'A single element takes the place of another element in a compound, so this is a single-replacement reaction.';
    case 'double-replacement':
      return 'Two compounds exchange partners: the cations swap anions, producing a precipitate, a gas or water. This is a double-replacement reaction.';
    default:
      return '';
  }
}

/** Convenience: balance, then classify in one call. */
export function balanceAndClassify(input: string): { result: BalanceResult; type: ReactionType | null } {
  const result = balanceEquation(input);
  return { result, type: result.ok ? classifyReaction(result.balancedPlain) : null };
}
