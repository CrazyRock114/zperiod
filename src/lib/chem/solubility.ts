/**
 * Aqueous solubility rules.
 *
 * The rule table normally comes from `/src/data/solubility.json`, which the
 * data worker owns. It is imported **lazily and defensively** through a Vite
 * `import.meta.glob` lookup so that this module never hard-fails at import time:
 * if the JSON is missing, unreadable, or in an unexpected shape, the built-in
 * rules in `./solubilityFallback` are used instead. Callers may also inject
 * their own table with `setSolubilityRules()`.
 */

import {
  parseFormula,
  toPlainFormula,
  formatCharge,
  renderNodes,
  plainCharge,
  type AtomCount,
  type FormulaNode,
} from './formula';
import { symbolToPlainIon, splitIntoIons, CATION_CHARGES, METAL_SYMBOLS, elementName } from './ions';
import { isElementSymbol } from './elementSymbols';
import { FALLBACK_SOLUBILITY_RULES } from './solubilityFallback';
import type { SolubilityRule } from '../../types/chem';

export { symbolToPlainIon };
export type { SolubilityRule };

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

export type SolubilityOutcome = 'soluble' | 'insoluble' | 'slightly-soluble' | 'reacts';
export type SolubilityVerdict = 'soluble' | 'insoluble' | 'partly' | 'reacts';

export interface SolubilityRow {
  /** Plain ASCII ion formula, e.g. `SO4^2-`. */
  ion: string;
  /** Unicode form for display, e.g. `SO₄²⁻`. */
  ionDisplay: string;
  result: SolubilityOutcome;
  rule: string;
  exceptions: string | null;
  /** True when this ion is one of the named exceptions of its own rule. */
  isException: boolean;
  kind: 'cation' | 'anion';
}

export interface SolubilityResult {
  ok: boolean;
  error?: string;
  formula: string;
  formulaDisplay: string;
  overall: SolubilityVerdict;
  rows: SolubilityRow[];
  note: string;
  /** True when the answer came from the built-in fallback table. */
  usedFallback: boolean;
}

/* ------------------------------------------------------------------ */
/* Rule loading                                                        */
/* ------------------------------------------------------------------ */

let cachedRules: SolubilityRule[] | null = null;
let cachedSource: 'json' | 'fallback' | 'injected' = 'fallback';
let attempted = false;

function looksLikeRule(value: unknown): value is SolubilityRule {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.ionFormula === 'string' &&
    typeof r.ionPlain === 'string' &&
    (r.kind === 'cation' || r.kind === 'anion') &&
    (r.outcome === 'soluble' ||
      r.outcome === 'insoluble' ||
      r.outcome === 'slightly-soluble' ||
      r.outcome === 'reacts')
  );
}

/** Normalise whatever shape the JSON has into a flat list of rules. */
function coerceRules(payload: unknown): SolubilityRule[] | null {
  if (!payload) return null;
  let list: unknown[] = [];
  if (Array.isArray(payload)) {
    list = payload;
  } else if (typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['rules', 'solubilityRules', 'solubility', 'items', 'data', 'ions']) {
      if (Array.isArray(record[key])) {
        list = record[key] as unknown[];
        break;
      }
    }
  }
  const rules = list.filter(looksLikeRule);
  return rules.length > 0 ? rules : null;
}

/**
 * Read `/src/data/solubility.json` through Vite's glob import.
 *
 * Wrapped in try/catch and feature-detected so it is a no-op outside Vite
 * (plain Node, unit tests without the plugin, SSR).
 */
function loadFromDataFile(): SolubilityRule[] | null {
  try {
    const meta = import.meta as ImportMeta & {
      glob?: (pattern: string, options?: { eager?: boolean; import?: string }) => Record<string, unknown>;
    };
    if (typeof meta.glob !== 'function') return null;
    for (const pattern of ['/src/data/solubility.json', '**/solubility.json']) {
      const modules = meta.glob(pattern, { eager: true, import: 'default' });
      for (const key of Object.keys(modules)) {
        const rules = coerceRules(modules[key]);
        if (rules) return rules;
      }
    }
  } catch {
    // Missing file, malformed JSON, or no glob support — fall through.
  }
  return null;
}

/** The active rule table, loading it on first use. */
export function getSolubilityRules(): SolubilityRule[] {
  if (!attempted) {
    attempted = true;
    const fromData = loadFromDataFile();
    if (fromData && fromData.length > 0) {
      cachedRules = fromData;
      cachedSource = 'json';
    } else {
      cachedRules = FALLBACK_SOLUBILITY_RULES.slice();
      cachedSource = 'fallback';
    }
  }
  return cachedRules ?? FALLBACK_SOLUBILITY_RULES;
}

/** Where the active rules came from: `json`, `fallback` or `injected`. */
export function getSolubilityRuleSource(): 'json' | 'fallback' | 'injected' {
  getSolubilityRules();
  return cachedSource;
}

/** Replace the rule table (used by the UI, tests and custom content). */
export function setSolubilityRules(rules: SolubilityRule[] | null): void {
  if (rules && rules.length > 0) {
    cachedRules = rules.filter(looksLikeRule);
    cachedSource = 'injected';
  } else {
    cachedRules = null;
    cachedSource = 'fallback';
  }
  attempted = cachedRules !== null;
}

/** Drop any injected/loaded table so the next call re-reads the data file. */
export function resetSolubilityRules(): void {
  cachedRules = null;
  cachedSource = 'fallback';
  attempted = false;
}

/* ------------------------------------------------------------------ */
/* Rule matching                                                       */
/* ------------------------------------------------------------------ */

/** Plain body of an ion, e.g. `SO4^2-` -> `SO4`. */
function ionBody(ionPlain: string): string {
  return ionPlain.replace(/\^?\d*[+-]$/, '').replace(/[+-]$/, '');
}

function ionChargeOf(ionPlain: string): number {
  const caret = /\^(\d*)([+-])$/.exec(ionPlain);
  if (caret) return caret[2] === '+' ? Number(caret[1] || 1) : -Number(caret[1] || 1);
  const tail = ionPlain.slice(-1);
  if (tail === '+') return 1;
  if (tail === '-') return -1;
  return 0;
}

/**
 * Ion bodies named in a rule's `exceptions` list and `rule` sentence.
 *
 * Only complete element symbols and known polyatomic cations are kept, so prose
 * like "All hydroxides ... except those of Ca²⁺" cannot produce bogus matches
 * such as the "Al" inside "All".
 */
function exceptionSymbols(rule: SolubilityRule): string[] {
  const out = new Set<string>();
  const push = (text: string | null | undefined): void => {
    if (!text) return;
    // Normalise unicode sub/superscripts so one regex handles every notation.
    let norm = text;
    for (let i = 0; i < '₀₁₂₃₄₅₆₇₈₉'.length; i += 1) {
      norm = norm.split('₀₁₂₃₄₅₆₇₈₉'[i]).join(String(i));
    }
    norm = norm.replace(/[⁰¹²³⁴-⁹]/g, '').replace(/⁺/g, '+').replace(/⁻/g, '-');

    // Polyatomic cations first, then blank them out.
    for (const match of norm.matchAll(/(NH4|H3O)(?![a-z0-9])/gi)) out.add(match[1].toUpperCase());
    norm = norm.replace(/N[_-]?H4/gi, ' ').replace(/H3O/gi, ' ');

    // Rules are also allowed to name whole groups in words rather than by
    // symbol: "group 1", "alkali metals", "group 2", "alkaline earth".
    const lower = norm.toLowerCase();
    if (/group\s*(1|i)\b|\balkali\b/.test(lower)) {
      for (const symbol of ['Li', 'Na', 'K', 'Rb', 'Cs']) out.add(symbol);
    }
    if (/group\s*(2|ii)\b|\balkaline[\s-]*earth\b/.test(lower)) {
      for (const symbol of ['Be', 'Mg', 'Ca', 'Sr', 'Ba', 'Ra']) out.add(symbol);
    }
    if (/ammonium/.test(lower)) out.add('NH4');

    // Element symbols, but only when they form a whole word.
    for (const match of norm.matchAll(/\b([A-Z][a-z]?)(?:\d+)?(?=[+,\s;.]|$)/g)) {
      if (isElementSymbol(match[1])) out.add(match[1]);
    }
  };
  push(rule.exceptions);
  push(rule.rule);
  out.delete(ionBody(rule.ionPlain));
  return [...out];
}

interface RuleMatch {
  rule: SolubilityRule;
  isException: boolean;
  /** Symbol named in the rule's exception list, when there is one. */
  exceptionSymbol: string;
}

/**
 * Exceptions that are only slightly soluble rather than fully insoluble.
 * Keyed by the plain ion formula, then by the exception's element symbol.
 */
const EXCEPTION_TWEAKS: Record<string, Record<string, SolubilityOutcome>> = {
  SO4: { Ca: 'slightly-soluble', Sr: 'slightly-soluble' },
  Cl: { Pb: 'slightly-soluble' },
  Br: { Pb: 'slightly-soluble' },
  I: { Pb: 'slightly-soluble' },
  OH: { Ca: 'slightly-soluble', Sr: 'slightly-soluble', Ba: 'slightly-soluble' },
};

function tweakFor(anionBody: string, exceptionSymbol: string): SolubilityOutcome | null {
  return EXCEPTION_TWEAKS[anionBody]?.[exceptionSymbol] ?? null;
}

/**
 * Pairs that every textbook calls only *slightly* soluble.
 *
 * The rule tables disagree about these — some list Ca²⁺ as a hydroxide
 * exception, some do not — so the engine applies the correction itself once a
 * table has said "insoluble". Anion body -> cation symbols.
 */
const SLIGHTLY_SOLUBLE_PAIRS: Record<string, string[]> = {
  OH: ['Ca', 'Sr', 'Ba'],
  SO4: ['Ca', 'Sr'],
  Cl: ['Pb'],
  Br: ['Pb'],
  I: ['Pb'],
};

/** Force a verdict down to "slightly soluble" for the known tricky pairs. */
function applyChemistryOverride(
  result: SolubilityOutcome,
  anionBody: string,
  cationBody: string,
): SolubilityOutcome {
  if (result !== 'insoluble' || !anionBody || !cationBody) return result;
  const cations = SLIGHTLY_SOLUBLE_PAIRS[anionBody];
  return cations && cations.includes(cationBody) ? 'slightly-soluble' : result;
}

function findRule(ionPlain: string, kind: 'cation' | 'anion', otherBody: string): RuleMatch | null {
  const body = ionBody(ionPlain);
  const rules = getSolubilityRules().filter((r) => r.kind === kind);
  if (rules.length === 0) return null;

  // 1. Exact ion match. Even then the partner may be a named exception:
  //    "all carbonates are insoluble except those of Group 1 and NH4+".
  const exact = rules.find((r) => ionBody(r.ionPlain) === body && r.ionPlain === ionPlain);
  if (exact) {
    const hit = otherBody && exceptionSymbols(exact).includes(otherBody) ? otherBody : '';
    return { rule: exact, isException: hit !== '', exceptionSymbol: hit };
  }

  // 2. Monatomic ion named directly by a rule of the same kind.
  const monatomic = rules.find((r) => {
    const ruleBody = ionBody(r.ionPlain);
    return /^[A-Z][a-z]?$/.test(ruleBody) && ruleBody === body;
  });
  if (monatomic) return { rule: monatomic, isException: false, exceptionSymbol: '' };

  // 3. The rule text names this ion.
  for (const rule of rules) {
    if (exceptionSymbols(rule).includes(body)) {
      return { rule, isException: false, exceptionSymbol: '' };
    }
  }

  // 4. The other ion of the pair is named as an exception of this rule — the
  //    classic "all chlorides are soluble except those of Ag+".
  if (otherBody) {
    for (const rule of rules) {
      if (exceptionSymbols(rule).includes(otherBody)) {
        return { rule, isException: true, exceptionSymbol: otherBody };
      }
    }
  }

  return null;
}

function rowFor(
  ionPlain: string,
  kind: 'cation' | 'anion',
  display: string,
  otherBody: string,
): SolubilityRow {
  const match = findRule(ionPlain, kind, otherBody);

  if (!match) {
    return {
      ion: ionPlain,
      ionDisplay: display,
      result: kind === 'cation' ? 'soluble' : 'slightly-soluble',
      rule:
        kind === 'cation'
          ? 'Most metal cations form soluble salts, so no precipitate forms.'
          : 'No specific rule is listed for this anion, so no precipitate is expected.',
      exceptions: null,
      isException: false,
      kind,
    };
  }

  const { rule, isException, exceptionSymbol } = match;
  let result: SolubilityOutcome = rule.outcome;

  if (isException) {
    const tweak = kind === 'anion' ? tweakFor(ionBody(ionPlain), exceptionSymbol) : null;
    if (tweak) {
      result = tweak;
    } else if (rule.outcome === 'insoluble') {
      // A named exception of an "insoluble except ..." rule is soluble.
      result = 'soluble';
    } else {
      // A named exception of a "soluble except ..." rule does not dissolve.
      result = 'insoluble';
    }
  }

  return {
    ion: ionPlain,
    ionDisplay: display,
    result,
    rule: rule.rule,
    exceptions: rule.exceptions,
    isException,
    kind,
  };
}

function toDisplay(plain: string): string {
  return toPlainFormula(plain) === plain ? plain : formatParsed(plain);
}

function formatParsed(plain: string): string {
  const parsed = parseFormula(plain);
  if (!parsed.ok || !parsed.group) return plain;
  return renderNodes(parsed.group, 'unicode') + formatCharge(parsed.charge);
}

/* ------------------------------------------------------------------ */
/* classifyCompound                                                    */
/* ------------------------------------------------------------------ */

/**
 * Apply the aqueous solubility rules to every cation x anion pair in a formula.
 *
 * Never throws. An unparseable formula comes back as `ok: false` with an error.
 */
export function classifyCompound(formulaPlain: string): SolubilityResult {
  const fail = (error: string): SolubilityResult => ({
    ok: false,
    error,
    formula: typeof formulaPlain === 'string' ? formulaPlain : String(formulaPlain ?? ''),
    formulaDisplay: typeof formulaPlain === 'string' ? formulaPlain : '',
    overall: 'insoluble',
    rows: [],
    note: error,
    usedFallback: getSolubilityRuleSource() === 'fallback',
  });

  if (typeof formulaPlain !== 'string' || formulaPlain.trim() === '') {
    return fail('empty formula');
  }

  const parsed = parseFormula(formulaPlain);
  if (!parsed.ok || !parsed.group) {
    return fail(parsed.error ?? 'invalid formula');
  }

  const plain = renderNodes(parsed.group, 'plain') + plainCharge(parsed.charge);
  const split = splitIntoIons(plain);
  const rows: SolubilityRow[] = [];
  const cationBody = split.cation ? ionBody(split.cation) : '';
  const anionBody = split.anion ? ionBody(split.anion) : '';

  if (split.cation) {
    rows.push(rowFor(split.cation, 'cation', formatParsed(split.cation), anionBody));
  }
  if (split.anion) {
    const row = rowFor(split.anion, 'anion', formatParsed(split.anion), cationBody);
    const corrected = applyChemistryOverride(row.result, anionBody, cationBody);
    if (corrected !== row.result) {
      row.result = corrected;
      row.rule = `${row.rule} ${cationBody} salts of this ion are only slightly soluble.`;
    }
    rows.push(row);
  }

  if (rows.length === 0) {
    // Molecular acid, element, or something the splitter does not recognise.
    const atoms = parsed.atoms;
    const isAcid = split.isAcid;
    if (isAcid) {
      return {
        ok: true,
        formula: plain,
        formulaDisplay: renderNodes(parsed.group, 'unicode') + formatCharge(parsed.charge),
        overall: 'soluble',
        rows: [
          {
            ion: 'H+',
            ionDisplay: 'H⁺',
            result: 'soluble',
            rule: 'Acids dissociate in water to give H₃O⁺, which is always soluble.',
            exceptions: null,
            isException: false,
            kind: 'cation',
          },
          {
            ion: 'H2O',
            ionDisplay: 'H₂O',
            result: 'soluble',
            rule: 'The conjugate base of an acid is already present in solution as water.',
            exceptions: null,
            isException: false,
            kind: 'anion',
          },
        ],
        note: 'This is a molecular acid: it ionises in water, so it is soluble.',
        usedFallback: getSolubilityRuleSource() === 'fallback',
      };
    }

    const onlyElement = atoms.length === 1;
    return {
      ok: true,
      formula: plain,
      formulaDisplay: renderNodes(parsed.group, 'unicode') + formatCharge(parsed.charge),
      overall: onlyElement ? 'reacts' : 'soluble',
      rows: [
        {
          ion: atoms.map((a) => a.element).join('') || plain,
          ionDisplay: renderNodes(parsed.group, 'unicode'),
          result: onlyElement ? 'reacts' : 'soluble',
          rule: onlyElement
            ? 'An element on its own has no ions; it must react with water rather than dissolve.'
            : 'A molecular substance with no ions: solubility depends on its own properties.',
          exceptions: null,
          isException: false,
          kind: 'cation',
        },
      ],
      note: onlyElement
        ? 'Elements do not dissolve — they react with water or remain as a solid.'
        : 'A molecular substance; no ion-exchange rules apply.',
      usedFallback: getSolubilityRuleSource() === 'fallback',
    };
  }

  const results = rows.map((r) => r.result);
  let overall: SolubilityVerdict;
  if (results.includes('insoluble')) overall = 'insoluble';
  else if (results.includes('reacts')) overall = 'reacts';
  else if (results.includes('slightly-soluble')) overall = 'partly';
  else overall = 'soluble';

  const note = buildNote(overall, rows, split.cation, split.anion);

  return {
    ok: true,
    formula: plain,
    formulaDisplay: renderNodes(parsed.group, 'unicode') + formatCharge(parsed.charge),
    overall,
    rows,
    note,
    usedFallback: getSolubilityRuleSource() === 'fallback',
  };
}

function describeIon(ion: string): string {
  const body = ionBody(ion);
  const parsed = parseFormula(body);
  if (parsed.ok) {
    if (parsed.atoms.length === 1) return elementName(parsed.atoms[0].element);
    return body;
  }
  return body;
}

function buildNote(
  overall: SolubilityVerdict,
  rows: SolubilityRow[],
  cation: string,
  anion: string,
): string {
  const names = rows
    .map((r) => (r.isException ? `${describeIon(r.ion)} (an exception)` : describeIon(r.ion)))
    .join(' and ');
  switch (overall) {
    case 'soluble':
      return `The ${names} do not form a precipitate, so the compound dissolves in water.`;
    case 'insoluble':
      return `The ${names} form an insoluble salt, so a precipitate forms and the compound does not dissolve.`;
    case 'partly':
      return `The ${names} form a slightly soluble salt, so only part of the compound dissolves.`;
    case 'reacts':
      return `The ${names} react with water instead of simply dissolving.`;
    default:
      return cation || anion ? 'No solubility rule matched.' : '';
  }
}

/* ------------------------------------------------------------------ */
/* Convenience                                                         */
/* ------------------------------------------------------------------ */

/** Is this compound soluble in water? */
export function isSoluble(formulaPlain: string): boolean {
  return classifyCompound(formulaPlain).overall === 'soluble';
}

/** A one-line summary, e.g. `AgCl — insoluble (Ag⁺ is an exception to the chloride rule)`. */
export function solubilitySummary(formulaPlain: string): string {
  const result = classifyCompound(formulaPlain);
  if (!result.ok) return `${result.formula}: ${result.error ?? 'unreadable'}`;
  return `${result.formula} — ${result.overall}. ${result.note}`;
}

export { CATION_CHARGES, METAL_SYMBOLS, ionBody, ionChargeOf, symbolToPlainIon as toPlainIon };
export type { AtomCount, FormulaNode };
