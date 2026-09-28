#!/usr/bin/env node
/**
 * Targeted chemistry corrections the bulk generator got wrong.
 *
 *   node scripts/fix-chemistry.mjs
 *
 * Idempotent: safe to re-run after the data generator has rewritten
 * elements.json.
 *
 * These are facts we can assert exactly, so they are patched deterministically
 * rather than left to the generator:
 *   - Br is a LIQUID at STP (mp 265.8 K, bp 332.0 K) — 0 °C sits between them.
 *   - Seven elements listed only some of their stable isotopes, so the
 *     abundances did not sum to 100 % and the isotope table looked wrong.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(root, 'src/data/elements.json');
const data = JSON.parse(readFileSync(FILE, 'utf8'));
const els = data.elements;
const bySym = new Map(els.map((e) => [e.symbol, e]));

const changes = [];

/* ---- 1. Br is liquid at STP ---- */
const br = bySym.get('Br');
if (br && br.phase !== 'liquid') {
  changes.push(`Br phase ${br.phase} -> liquid`);
  br.phase = 'liquid';
  br.meltingPointK = 265.8;
  br.boilingPointK = 332.0;
  br.densityGcm3 = 3.1028; // liquid at 25 °C; the 2.79 figure is the solid
}

/* ---- 2. complete the stable-isotope tables ---- */
const STABLE = {
  // CIAAW / NIST conventional isotopic compositions.
  Rb: [
    [85, 72.17],
    [87, 27.83],
  ],
  Cd: [
    [106, 1.25],
    [108, 0.89],
    [110, 12.49],
    [111, 12.8],
    [112, 24.13],
    [113, 12.22],
    [114, 28.73],
    [116, 7.49],
  ],
  In: [
    [113, 4.29],
    [115, 95.71],
  ],
  Sn: [
    [112, 0.97],
    [115, 0.34],
    [116, 14.54],
    [117, 7.68],
    [118, 24.22],
    [119, 8.59],
    [120, 32.58],
    [122, 4.63],
    [124, 5.79],
  ],
  Sm: [
    [144, 3.07],
    [147, 14.99],
    [148, 11.24],
    [149, 13.82],
    [150, 7.38],
    [152, 26.75],
    [154, 22.75],
  ],
};

for (const [sym, list] of Object.entries(STABLE)) {
  const e = bySym.get(sym);
  if (!e) continue;
  const have = new Map(e.isotopes.map((i) => [i.massNumber, i]));
  for (const [A, pct] of list) {
    if (have.has(A)) {
      have.get(A).abundance = pct;
      have.get(A).stable = true;
    } else {
      e.isotopes.push({ massNumber: A, abundance: pct, stable: true });
    }
  }
  e.isotopeCount = list.length;
  // Keep the table ordered by mass number.
  e.isotopes.sort((a, b) => a.massNumber - b.massNumber);
  const sum = list.reduce((a, [, p]) => a + p, 0);
  changes.push(`${sym}: ${list.length} stable isotopes, ${sum.toFixed(2)}%`);
}

/* ---- 3. Re-verify the sum for every element ---- */
const warnings = [];
for (const e of els) {
  const sum = e.isotopes.filter((i) => i.stable).reduce((a, i) => a + i.abundance, 0);
  if (sum > 0 && (sum < 99.5 || sum > 100.5)) warnings.push(`${e.symbol}: ${sum.toFixed(2)}%`);
}

/* ---- 4. Lu / Re: the second isotope is long-lived radioactive, not stable ---- */
for (const [sym, A, pct, why] of [
  [71, 176, 2.599, 't½ 3.78 × 10¹⁰ y'],
  [75, 187, 62.6, 't½ 4.12 × 10¹⁰ y'],
]) {
  const e = bySym.get(sym === 71 ? 'Lu' : 'Re');
  if (!e) continue;
  const iso = e.isotopes.find((i) => i.massNumber === A);
  if (iso) {
    iso.stable = false;
    e.hazards = e.hazards
      ? `${e.hazards} (weakly radioactive: ${sym}-${A}, ${why})`
      : `Naturally occurring ${sym}-${A} is weakly radioactive (${why}).`;
    changes.push(`${sym}-${A} marked radioactive (${pct}%)`);
  } else {
    e.isotopes.push({ massNumber: A, abundance: pct, stable: false });
    changes.push(`${sym}-${A} added as radioactive (${pct}%)`);
  }
  e.isotopes.sort((a, b) => a.massNumber - b.massNumber);
}

writeFileSync(FILE, JSON.stringify(data, null, 0));

console.log(`applied ${changes.length} correction(s):`);
for (const c of changes) console.log('  · ' + c);
if (warnings.length) {
  console.log(`\nremaining abundance warnings (${warnings.length}):`);
  for (const w of warnings) console.log('  ⚠ ' + w);
} else {
  console.log('\nall stable-isotope abundances now sum to 100%');
}
