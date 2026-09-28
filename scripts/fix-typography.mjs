#!/usr/bin/env node
/**
 * Repair + audit the unicode typography in the element dataset.
 *
 * The generator that produced elements.json used U+00B0 DEGREE SIGN where
 * U+2070 SUPERSCRIPT ZERO was required, so "3d^10" was written "3d^1°".
 * That renders as a wrong exponent everywhere it is shown, so it gets fixed
 * here and re-audited for any other stray glyph.
 *
 *   node scripts/fix-typography.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(root, 'src/data/elements.json');

const SUPER = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
const SUB = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };

// Digits we accept inside an exponent run.
const ALLOWED = new Set([
  ...Object.keys(SUPER),
  ...Object.keys(SUB),
  ...'0123456789',
  // Ordinary punctuation and latin letters that legitimately appear in prose.
  ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ ,.;:'\"()[]{}+-*/=~%&@#<>?!_|",
  // Greek + common scientific symbols used in the free-text fields.
  ...'αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ',
  '°', // Kelvin/degree, legitimate OUTSIDE an exponent run
  'é', 'è', 'ê', 'ë', 'á', 'à', 'ä', 'å', 'ø', 'ü', 'ö', 'ß', 'ñ', 'ç', 'ī', 'ō', 'ū', 'ĭ', 'ĕ', 'ĕ',
  '—', '–', '·', '°', '“', '”', '‘', '’', '…', '→', '⁺', '⁻', '∼', '′', '″', 'Å', 'µ',
  '●', '★', '™', '©',
  // Fractions and operators that legitimately appear in the prose fields.
  '½', '¼', '¾', '⅓', '⅔', '×', '÷', '±', '≈', '≠', '≤', '≥', '∞', 'Δ',
]);

let raw = readFileSync(FILE, 'utf8');

const before = raw;
let degreeFixes = 0;

// A degree sign directly after a superscript digit (or after a run of them) is
// always a mistyped superscript zero.
raw = raw.replace(/([⁰¹²³⁴⁵⁶⁷⁸⁹])°/g, (m) => {
  degreeFixes++;
  return m.slice(0, -1) + '⁰';
});
// "3d°" with no leading superscript at all is the same bug.
raw = raw.replace(/([0-9])°(?=\s|["'})])/g, (m, d) => {
  degreeFixes++;
  return d + '⁰';
});

if (raw !== before) {
  writeFileSync(FILE, raw);
  console.log(`repaired ${degreeFixes} mistyped superscript zero(s) (° → ⁰)`);
} else {
  console.log('no superscript-zero repairs needed');
}

/* ---- audit: every non-ASCII glyph, and where ---- */
const data = JSON.parse(raw);
const els = data.elements;

const toAscii = (s) =>
  s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => SUPER[c]).replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (c) => SUB[c]);

// 1. electron counts must now reconcile
let bad = 0;
for (const e of els) {
  const ascii = toAscii(e.electronConfiguration).replace(/\[.*?\]/g, ' ');
  const n = [...ascii.matchAll(/(\d+)([spdfg])(\d+)/gi)].reduce((a, m) => a + Number(m[3]), 0);
  if (n !== e.atomicNumber) {
    console.log(`  ✗ ${e.symbol}: config electrons ${n} != Z ${e.atomicNumber}  [${e.electronConfiguration}]`);
    bad++;
  }
  if (e.nobleGasConfiguration) {
    const n2 = [...toAscii(e.nobleGasConfiguration).replace(/\[.*?\]/g, ' ').matchAll(/(\d+)([spdfg])(\d+)/gi)].reduce(
      (a, m) => a + Number(m[3]),
      0,
    );
    // noble gas shorthand only carries the valence part, so just check it parses
    if (!n2 && e.nobleGasConfiguration !== '—') {
      console.log(`  ? ${e.symbol}: noble gas shorthand unparseable [${e.nobleGasConfiguration}]`);
    }
  }
}
console.log(bad === 0 ? 'electron counts reconcile for all 118' : `${bad} still mismatched`);

/* ---- 2. glyph audit ---- */
const seen = new Map();
const walk = (node, path) => {
  if (typeof node === 'string') {
    for (const ch of node) {
      if (ch.charCodeAt(0) < 128) continue;
      if (!seen.has(ch)) seen.set(ch, { count: 0, where: path });
      seen.get(ch).count++;
    }
  } else if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, `${path}[${i}]`));
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
  }
};
walk(data, '');

const unknown = [...seen.entries()].filter(([ch]) => !ALLOWED.has(ch));
if (unknown.length) {
  console.log(`\n${unknown.length} unexpected glyph(s):`);
  for (const [ch, info] of unknown) {
    console.log(
      `  ${JSON.stringify(ch)} U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')} × ${info.count} (${info.where})`,
    );
  }
  process.exitCode = 1;
} else {
  console.log(`glyph audit clean — ${seen.size} distinct non-ASCII characters, all expected`);
}
