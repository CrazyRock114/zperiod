/**
 * Chemical formula parser / renderer.
 *
 * Pure TypeScript, zero runtime dependencies. The only external input is the
 * 118-element symbol table in `./elementSymbols`.
 *
 * Supported input grammar (all optional parts independent):
 *
 *   formula   := coefficient? body charge?
 *   body      := unit ( hydrateSep unit )*
 *   unit      := atom group?
 *   atom      := ElementSymbol digits?
 *   group     := '(' body ')' digits?  |  '[' body ']' digits?
 *   hydrateSep:= '·' | '⋅' | '.'
 *   charge    := '2+' | '3-' | '^2-' | '⁺' | '²⁻' | 'Fe3+' | 'Ca²⁺' | 'Na+' | 'Cl-'
 *
 * Unicode subscripts (₀–₉) are accepted anywhere a count may appear and are
 * normalised to ASCII internally.
 */

import { SYMBOL_TO_Z, isElementSymbol } from './elementSymbols';

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

export interface AtomCount {
  /** IUPAC element symbol, e.g. "Ca". */
  element: string;
  /** How many atoms of this element. Always >= 1. */
  count: number;
}

/** A node of the preserved grouping tree. */
export type FormulaNode =
  | { kind: 'atom'; element: string; count: number }
  | { kind: 'group'; open: '(' | '['; items: FormulaNode[]; count: number }
  /** `CuSO4·5H2O` — a hydrate unit repeated `count` times. */
  | { kind: 'hydrate'; items: FormulaNode[]; count: number };

export interface ParsedFormula {
  /** Flat element list, merged in first-appearance order. */
  atoms: AtomCount[];
  /** Net charge; positive for cations, negative for anions, 0 when neutral. */
  charge: number;
  ok: boolean;
  error?: string;
  /**
   * Preserved grouping tree (leading coefficient excluded) so that a formula
   * can be re-displayed exactly as written, e.g. `Ca(OH)2` does not become
   * `CaO2H2`. `null` when parsing failed.
   */
  group: FormulaNode[] | null;
  /** Integer written in front of the formula, e.g. 2 in `2H2O`. 0 when absent. */
  coefficient: number;
}

/* ------------------------------------------------------------------ */
/* Unicode tables                                                      */
/* ------------------------------------------------------------------ */

const SUBSCRIPT_CHARS = '₀₁₂₃₄₅₆₇₈₉';
const SUPERSCRIPT_DIGIT_CHARS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const SUPERSCRIPT_PLUS = '⁺';
const SUPERSCRIPT_MINUS = '⁻';
const HYDRATE_CHARS = '·⋅.';

const ASCII_DIGITS = '0123456789';

/** `'H2O' | 'H₂O' | 'H 2 O'` -> `'h2o'` (all lowercase, all subscripts as ASCII). */
export function normalizeFormula(input: string): string {
  let out = '';
  for (const ch of input) {
    const sub = SUBSCRIPT_CHARS.indexOf(ch);
    if (sub >= 0) {
      out += ASCII_DIGITS[sub];
      continue;
    }
    if (ch === SUPERSCRIPT_PLUS) {
      out += '+';
      continue;
    }
    if (ch === SUPERSCRIPT_MINUS) {
      out += '-';
      continue;
    }
    const sup = SUPERSCRIPT_DIGIT_CHARS.indexOf(ch);
    if (sup >= 0) {
      // A superscript digit in the body position is meaningless; keep it so the
      // parser can report a precise "unexpected character" error.
      out += ch;
      continue;
    }
    out += ch;
  }
  return out;
}

function isAsciiUpper(ch: string): boolean {
  return ch >= 'A' && ch <= 'Z';
}
function isAsciiLower(ch: string): boolean {
  return ch >= 'a' && ch <= 'z';
}
function isAsciiDigit(ch: string | undefined): boolean {
  return !!ch && ch >= '0' && ch <= '9';
}
function isSupDigit(ch: string | undefined): boolean {
  return !!ch && SUPERSCRIPT_DIGIT_CHARS.indexOf(ch) >= 0;
}
function isSupSign(ch: string | undefined): boolean {
  return ch === SUPERSCRIPT_PLUS || ch === SUPERSCRIPT_MINUS;
}

/** `2` -> `'₂'`. */
export function toSubscript(n: number): string {
  let out = '';
  for (const ch of String(n)) out += SUBSCRIPT_CHARS[ASCII_DIGITS.indexOf(ch)];
  return out;
}

/** `2` -> `'²'`. */
export function toSuperscript(n: number): string {
  let out = '';
  for (const ch of String(n)) out += SUPERSCRIPT_DIGIT_CHARS[ASCII_DIGITS.indexOf(ch)];
  return out;
}

/** Render a signed charge as unicode, e.g. `-2` -> `'²⁻'`, `1` -> `'⁺'`. */
export function formatCharge(charge: number): string {
  if (!charge) return '';
  const sign = charge > 0 ? SUPERSCRIPT_PLUS : SUPERSCRIPT_MINUS;
  const mag = Math.abs(charge);
  return mag === 1 ? sign : toSuperscript(mag) + sign;
}

/** Render a signed charge as ASCII, e.g. `-2` -> `'^2-'`, `1` -> `'-'`. */
export function plainCharge(charge: number): string {
  if (!charge) return '';
  const sign = charge > 0 ? '+' : '-';
  return Math.abs(charge) === 1 ? sign : `^${Math.abs(charge)}${sign}`;
}

/* ------------------------------------------------------------------ */
/* Charge extraction                                                   */
/* ------------------------------------------------------------------ */

interface ChargeSplit {
  body: string;
  charge: number;
  error?: string;
}

const SINGLE_ELEMENT_RE = /^[A-Z][a-z]?$/;

/**
 * Peel a charge suffix off the (raw, not yet normalised) formula string.
 *
 * Charge notations, in the order they are attempted:
 *   1. superscript digits + superscript sign      `²⁻`, `³⁻`, `⁺`
 *   2. bare superscript sign                       `⁺`, `⁻`
 *   3. caret form                                  `^2-`, `^-`
 *   4. sign before digits                          `Fe+3`
 *   5. ASCII digits + sign, body must be one element  `Fe3+`, `Ca2+`, `S2-`
 *   6. bare ASCII sign                             `Na+`, `Cl-`
 *
 * Rule 5 is restricted to a single remaining element so that plain-ASCII
 * nitrate `NO3-` (a subscript 3, not a charge) is not mis-read as `NO` with a
 * 3- charge.
 */
function splitCharge(raw: string): ChargeSplit {
  const fail = (body: string, error: string): ChargeSplit => ({ body, charge: 0, error });

  // 1. superscript digits followed by a superscript sign.
  let m = /([⁰¹²³⁴⁵⁶⁷⁸⁹]+)([⁺⁻])$/.exec(raw);
  if (m) {
    const digits = m[1]
      .split('')
      .map((c) => SUPERSCRIPT_DIGIT_CHARS.indexOf(c))
      .join('');
    const magnitude = Number(digits);
    if (!Number.isFinite(magnitude) || magnitude < 1) return fail(raw, 'invalid charge magnitude');
    return { body: raw.slice(0, m.index), charge: m[2] === SUPERSCRIPT_PLUS ? magnitude : -magnitude };
  }

  // 2. bare superscript sign.
  m = /([⁺⁻])$/.exec(raw);
  if (m) {
    return { body: raw.slice(0, m.index), charge: m[1] === SUPERSCRIPT_PLUS ? 1 : -1 };
  }

  // 3. caret form.
  m = /\^(\d*)([+-])$/.exec(raw);
  if (m) {
    const magnitude = m[1] === '' ? 1 : Number(m[1]);
    if (!Number.isFinite(magnitude) || magnitude < 1) return fail(raw, 'invalid charge magnitude');
    return { body: raw.slice(0, m.index), charge: m[2] === '+' ? magnitude : -magnitude };
  }

  // 4. sign before digits, e.g. `Fe+3` (single remaining element only).
  m = /([A-Za-z)\]])([+-])(\d+)$/.exec(raw);
  if (m) {
    const body = raw.slice(0, m.index + 1);
    if (SINGLE_ELEMENT_RE.test(body) && isElementSymbol(body)) {
      const magnitude = Number(m[3]);
      if (magnitude < 1) return fail(raw, 'invalid charge magnitude');
      return { body, charge: m[2] === '+' ? magnitude : -magnitude };
    }
  }

  // 5. ASCII digits + sign, e.g. `Fe3+`, `Ca2+`, `S2-` (single element only).
  m = /(\d+)([+-])$/.exec(raw);
  if (m) {
    const body = raw.slice(0, m.index);
    if (SINGLE_ELEMENT_RE.test(body) && isElementSymbol(body)) {
      const magnitude = Number(m[1]);
      if (magnitude < 1) return fail(raw, 'invalid charge magnitude');
      return { body, charge: m[2] === '+' ? magnitude : -magnitude };
    }
  }

  // 6. bare ASCII sign, e.g. `Na+`, `Cl-`.
  m = /([+-])$/.exec(raw);
  if (m) {
    return { body: raw.slice(0, m.index), charge: m[1] === '+' ? 1 : -1 };
  }

  return { body: raw, charge: 0 };
}

/* ------------------------------------------------------------------ */
/* Parser                                                              */
/* ------------------------------------------------------------------ */

const MAX_DEPTH = 32;
const MAX_LENGTH = 2048;

interface SeqResult {
  nodes: FormulaNode[];
  next: number;
  error?: string;
}

function readDigits(s: string, start: number): { value: number; next: number } {
  let i = start;
  let digits = '';
  while (i < s.length && isAsciiDigit(s[i])) {
    digits += s[i];
    i += 1;
  }
  return { value: digits === '' ? 1 : Number(digits), next: i };
}

/**
 * Parse a flat run of units starting at `start`, stopping at (and consuming) the
 * matching `closer` bracket, or at the end of the string when `closer` is null.
 */
function parseSequence(
  s: string,
  start: number,
  depth: number,
  closer: ')' | ']' | null,
): SeqResult {
  if (depth > MAX_DEPTH) return { nodes: [], next: start, error: 'formula nested too deeply' };
  const nodes: FormulaNode[] = [];
  let i = start;

  while (i < s.length) {
    const ch = s[i];

    if (ch === ')' || ch === ']') {
      if (closer === null) {
        return { nodes: [], next: i, error: `unmatched "${ch}"` };
      }
      if (ch !== closer) {
        return { nodes: [], next: i, error: `mismatched brackets: expected "${closer}" but found "${ch}"` };
      }
      if (nodes.length === 0) return { nodes: [], next: i, error: 'empty group' };
      return { nodes, next: i + 1 };
    }

    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i += 1;
      continue;
    }

    // Hydrate separator: the rest of this group forms a hydrate unit, e.g. the
    // `5H2O` in `CuSO4·5H2O`, whose leading digits repeat the whole unit.
    if (HYDRATE_CHARS.indexOf(ch) >= 0) {
      let hydrateCount = 1;
      let cursor = i + 1;
      if (isAsciiDigit(s[cursor])) {
        const d = readDigits(s, cursor);
        if (d.value > 999) return { nodes: [], next: i, error: 'number is too large' };
        hydrateCount = d.value;
        cursor = d.next;
      }
      const rest = parseSequence(s, cursor, depth + 1, closer);
      if (rest.error) return rest;
      if (rest.nodes.length === 0) {
        return { nodes: [], next: i, error: 'hydrate separator is not followed by a unit' };
      }
      nodes.push({ kind: 'hydrate', items: rest.nodes, count: hydrateCount });
      i = rest.next;
      continue;
    }

    let leadMultiplier = 1;
    if (isAsciiDigit(ch)) {
      if (nodes.length > 0) {
        return { nodes: [], next: i, error: `unexpected number at position ${i + 1}` };
      }
      const d = readDigits(s, i);
      if (d.value > 9999) return { nodes: [], next: i, error: 'number is too large' };
      leadMultiplier = d.value;
      i = d.next;
      if (i >= s.length) return { nodes: [], next: i, error: 'formula ends with a number' };
    }

    const unit = s[i];
    let node: FormulaNode;

    if (unit === '(' || unit === '[') {
      const inner = parseSequence(s, i + 1, depth + 1, unit === '(' ? ')' : ']');
      if (inner.error) return inner;
      if (inner.nodes.length === 0) return { nodes: [], next: i, error: 'empty group' };
      const count = readDigits(s, inner.next);
      if (count.value > 9999) return { nodes: [], next: i, error: 'number is too large' };
      node = { kind: 'group', open: unit, items: inner.nodes, count: count.value * leadMultiplier };
      i = count.next;
    } else if (isAsciiUpper(unit)) {
      const two = s.slice(i, i + 2);
      let symbol: string;
      if (two.length === 2 && isAsciiLower(two[1]) && isElementSymbol(two)) {
        symbol = two;
      } else if (isElementSymbol(unit)) {
        symbol = unit;
      } else {
        return {
          nodes: [],
          next: i,
          error: `unknown element symbol "${isAsciiLower(two[1] ?? '') ? two : unit}"`,
        };
      }
      const count = readDigits(s, i + symbol.length);
      if (count.value > 9999) return { nodes: [], next: i, error: 'number is too large' };
      node = { kind: 'atom', element: symbol, count: count.value * leadMultiplier };
      i = count.next;
    } else if (unit === '+' || unit === '-') {
      return { nodes: [], next: i, error: `unexpected sign "${unit}" at position ${i + 1}` };
    } else {
      return { nodes: [], next: i, error: `unexpected character "${unit}" at position ${i + 1}` };
    }

    nodes.push(node);
  }

  if (closer !== null) return { nodes: [], next: i, error: `unclosed "${closer === ')' ? '(' : '['}"` };
  return { nodes, next: i };
}

function makeFail(error: string): ParsedFormula {
  return { atoms: [], charge: 0, ok: false, error, group: null, coefficient: 0 };
}

/**
 * Parse a chemical formula or formula unit.
 *
 * Never throws: every failure is reported through `ok: false` + `error`.
 */
export function parseFormula(input: string): ParsedFormula {
  if (typeof input !== 'string') return makeFail('formula must be a string');
  if (input.length > MAX_LENGTH) return makeFail('formula is too long');

  const stripped = input.replace(/[\s\r\n]+/g, '');
  if (stripped === '') return makeFail('empty formula');

  const { body: rawBody, charge, error: chargeError } = splitCharge(stripped);
  if (chargeError) return makeFail(chargeError);

  const body = normalizeFormula(rawBody);
  if (body === '') return makeFail(charge !== 0 ? 'formula has no elements' : 'empty formula');

  let start = 0;
  let coefficient = 0;
  if (isAsciiDigit(body[0])) {
    const d = readDigits(body, 0);
    if (d.value > 9999) return makeFail('number is too large');
    coefficient = d.value;
    start = d.next;
    if (start >= body.length) return makeFail('formula ends with a number');
  }

  const seq = parseSequence(body, start, 0, null);
  if (seq.error) return makeFail(seq.error);
  if (seq.next < body.length) {
    return makeFail(`unexpected "${body[seq.next]}" at position ${seq.next + 1}`);
  }
  if (seq.nodes.length === 0) return makeFail('formula has no elements');

  const atoms = flattenNodes(seq.nodes);
  if (atoms.length === 0) return makeFail('formula has no elements');

  return { atoms, charge, ok: true, group: seq.nodes, coefficient };
}

/** Merge a grouping tree into a flat, first-appearance-ordered element list. */
export function flattenNodes(nodes: FormulaNode[]): AtomCount[] {
  const order: string[] = [];
  const totals = new Map<string, number>();
  const walk = (list: FormulaNode[], factor: number): void => {
    for (const node of list) {
      if (node.kind === 'atom') {
        const amount = node.count * factor;
        if (!totals.has(node.element)) {
          order.push(node.element);
          totals.set(node.element, amount);
        } else {
          totals.set(node.element, (totals.get(node.element) as number) + amount);
        }
      } else {
        walk(node.items, factor * node.count);
      }    }
  };
  walk(nodes, 1);
  return order.map((element) => ({ element, count: totals.get(element) as number }));
}

/** `['H','O'] -> {H:2,O:1}` style lookup, from a flat atom list. */
export function atomsToMap(atoms: AtomCount[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const { element, count } of atoms) {
    out[element] = (out[element] ?? 0) + count;
  }
  return out;
}

/** Total number of atoms in one formula unit. */
export function totalAtomCount(atoms: AtomCount[]): number {
  return atoms.reduce((sum, a) => sum + a.count, 0);
}

/** Do two atom lists describe the same composition? Charge is ignored. */
export function sameComposition(a: AtomCount[], b: AtomCount[]): boolean {
  const ma = atomsToMap(a);
  const mb = atomsToMap(b);
  const keys = new Set([...Object.keys(ma), ...Object.keys(mb)]);
  for (const k of keys) if ((ma[k] ?? 0) !== (mb[k] ?? 0)) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* Renderers                                                           */
/* ------------------------------------------------------------------ */

/** Render a preserved grouping tree. */
export function renderNodes(nodes: FormulaNode[], style: 'unicode' | 'plain' = 'unicode'): string {
  const count = (n: number) => (n > 1 ? (style === 'unicode' ? toSubscript(n) : String(n)) : '');
  let out = '';
  for (const node of nodes) {
    if (node.kind === 'atom') {
      out += node.element + count(node.count);
    } else if (node.kind === 'group') {
      const close = node.open === '(' ? ')' : ']';
      out += node.open + renderNodes(node.items, style) + close + count(node.count);
    } else {
      // A hydrate multiplier is written before the unit: CuSO4·5H2O.
      const dot = style === 'plain' ? '.' : '·';
      out += dot + (node.count > 1 ? String(node.count) : '') + renderNodes(node.items, style);
    }
  }
  return out;
}

/**
 * Render a flat atom list, parenthesising the tail when — and only when — that
 * is provably the original form.
 *
 * A flat list carries no grouping information, so:
 *   - 1 element      -> `H2O`
 *   - 2 elements     -> `NaCl`, `CO2`
 *   - 3+ elements    -> parenthesised when every trailing element shares the
 *                       same count, i.e. the group can only have been
 *                       `(...)n` (gives `Ca(OH)2`), otherwise written inline.
 *
 * When you have the original string, prefer `formatParsedFormula`: it is exact
 * for every input, including `Al2(SO4)3` and `CuSO4·5H2O`.
 */
export function formatFormula(
  atoms: AtomCount[],
  charge = 0,
  group?: FormulaNode[] | null,
): string {
  if (!Array.isArray(atoms) || atoms.length === 0) return '';

  let body: string;
  if (group && group.length > 0) {
    body = renderNodes(group, 'unicode');
  } else {
    const part = (a: AtomCount) => a.element + (a.count > 1 ? toSubscript(a.count) : '');
    if (atoms.length <= 2) {
      body = atoms.map(part).join('');
    } else {
      const head = atoms[0];
      const tail = atoms.slice(1);
      const uniform = tail.every((a) => a.count === tail[0].count);
      body = uniform
        ? `${part(head)}(${tail.map((a) => a.element).join('')})${toSubscript(tail[0].count)}`
        : atoms.map(part).join('');
    }
  }

  return body + formatCharge(charge);
}

/** Same as `formatFormula` but forces ASCII (`SO4^2-`). */
export function plainFormula(atoms: AtomCount[], charge = 0, group?: FormulaNode[] | null): string {
  if (!Array.isArray(atoms) || atoms.length === 0) return '';

  let body: string;
  if (group && group.length > 0) {
    body = renderNodes(group, 'plain');
  } else {
    const part = (a: AtomCount) => a.element + (a.count > 1 ? String(a.count) : '');
    if (atoms.length <= 2) {
      body = atoms.map(part).join('');
    } else {
      const head = atoms[0];
      const tail = atoms.slice(1);
      const uniform = tail.every((a) => a.count === tail[0].count);
      body = uniform
        ? `${part(head)}(${tail.map((a) => a.element).join('')})${tail[0].count}`
        : atoms.map(part).join('');
    }
  }

  return body + plainCharge(charge);
}

/** Re-render a formula string, preserving its grouping. Falls back to the input. */
export function formatParsedFormula(input: string, style: 'unicode' | 'plain' = 'unicode'): string {
  const parsed = parseFormula(input);
  if (!parsed.ok || !parsed.group) return typeof input === 'string' ? input.trim() : '';
  return renderNodes(parsed.group, style) + (style === 'unicode' ? formatCharge(parsed.charge) : plainCharge(parsed.charge));
}

/**
 * ASCII form of a formula, e.g. `Ca(OH)2` stays `Ca(OH)2` and `SO₄²⁻`
 * becomes `SO4^2-`. Returns the trimmed input unchanged when it cannot parse.
 */
export function toPlainFormula(input: string): string {
  return formatParsedFormula(input, 'plain');
}

/** Unicode display form of a formula, e.g. `SO4^2-` becomes `SO₄²⁻`. */
export function toUnicodeFormula(input: string): string {
  return formatParsedFormula(input, 'unicode');
}

/** Convenience: does this string parse as a formula? */
export function isValidFormula(input: string): boolean {
  return parseFormula(input).ok;
}

/** Atomic number of a parsed formula's first element — handy for sanity checks. */
export function firstAtomicNumber(atoms: AtomCount[]): number {
  const first = atoms[0];
  return first ? SYMBOL_TO_Z[first.element] ?? 0 : 0;
}
