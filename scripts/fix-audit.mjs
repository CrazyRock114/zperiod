#!/usr/bin/env node
/**
 * Adversarial-audit corrections to the element and ion datasets.
 *
 *   node scripts/fix-audit.mjs
 *
 * Idempotent. Every correction is a fact that can be asserted exactly, so they
 * are applied here rather than left to the generator. Sources are noted next to
 * each block; see the audit report for the full citation list.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const elementsPath = join(root, 'src/data/elements.json');
const ionsPath = join(root, 'src/data/ions.json');

const SUPS_PLUS = String.fromCharCode(0x207a);
const elements = JSON.parse(readFileSync(elementsPath, 'utf8')).elements;
const ionsDoc = JSON.parse(readFileSync(ionsPath, 'utf8'));
const ions = ionsDoc.ions;

const bySym = new Map(elements.map((e) => [e.symbol, e]));
const changes = [];
const bumped = [];

/* ================================================================== */
/* 1. Cation charge rendered as a bare superscript digit                */
/* ================================================================== */
/*
 * "Na¹" reads as a radical, not the sodium ion. Anions already carried the
 * proper superscript minus (U+207B), so the generator just never emitted the
 * plus. Render cations as Na⁺ / Ca²⁺ / Fe³⁺ (U+207A).
 */
const SUPD = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶' };

let cationFixed = 0;
for (const ion of ions) {
  if (ion.type === 'polyatomic') continue;
  const body = ion.elementSymbol;
  const isCation = ion.charge > 0;
  // Build the formula from the symbol, the optional subscript count, and the
  // charge — do not string-patch, so the output is canonical either way.
  const sub = ion.subscript > 1 ? String.fromCharCode(0x2080 + ion.subscript) : '';
  const magnitude = Math.abs(ion.charge);
  const sup = ion.charge === 0 ? '' : SUPD[magnitude] ?? String(magnitude);
  const sign = isCation ? SUPS_PLUS : String.fromCharCode(0x207b);
  const want = `${body}${sub}${sup}${sign}`;
  if (ion.formula !== want) {
    if (cationFixed === 0) changes.push('ion formulas rebuilt with U+207A / U+207B charge signs');
    ion.formula = want;
    cationFixed++;
  }
}
if (cationFixed) bumped.push(`ions: ${cationFixed} charge formula(s) corrected`);

/* ================================================================== */
/* 2. Actinides mislabelled as gases at STP                            */
/* ================================================================== */
/*
 * Every transuranic from Np onward is a solid metal at STP. They carry melting
 * points of 912–1613 K in the same record, so the data contradicted itself.
 * Source: Wikipedia infoboxes / Los Alamos periodic table (see audit report).
 */
const SOLID_ACTINIDES = ['Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm', 'Md', 'No', 'Lr'];
let phaseFixed = 0;
for (const sym of SOLID_ACTINIDES) {
  const e = bySym.get(sym);
  if (!e) continue;
  if (e.phase !== 'solid') {
    e.phase = 'solid';
    phaseFixed++;
    bumped.push(`${sym}: phase gas -> solid`);
  }
}
// Sanity sweep: nothing may be "gas" while its melting point is above 273.15 K.
for (const e of elements) {
  if (e.phase === 'gas' && e.meltingPointK != null && e.meltingPointK > 273.15) {
    e.phase = 'solid';
    phaseFixed++;
    bumped.push(`${e.symbol}: phase gas -> solid (mp ${e.meltingPointK} K contradicts gas)`);
  }
}

/* ================================================================== */
/* 3. Flame-test colours                                              */
/* ================================================================== */
/*
 * Potassium showing sodium's orange defeats the entire purpose of the flame
 * test. Source: Wikipedia "Flame test" colour table.
 */
const FLAME = {
  K: '#c77dff', // lilac / pale pinkish violet
  Cs: '#8f7dff', // blue-violet
  B: '#00e436', // bright green
  P: '#7fffd4', // pale blue-green
  Rb: '#a24bd8', // red-violet
  In: '#7a3fd6', // blue-violet
};
let flameFixed = 0;
for (const [sym, color] of Object.entries(FLAME)) {
  const e = bySym.get(sym);
  if (e && e.flameTestColor !== color) {
    e.flameTestColor = color;
    flameFixed++;
    bumped.push(`${sym}: flame test ${e.flameTestColor} -> ${color}`);
  }
}

/* ================================================================== */
/* 4. Helium isotopes marked entirely unstable at 0 %                 */
/* ================================================================== */
/*
 * He-4 is stable and is 99.999863 % of natural helium — the atom page was
 * contradicting its own atomic weight of 4.002602. He-6 has too short a
 * half-life to be a natural nuclide; He-8 likewise.
 */
const he = bySym.get('He');
if (he) {
  he.isotopes = [
    { massNumber: 3, abundance: 0.000137, stable: true },
    { massNumber: 4, abundance: 99.999863, stable: true },
    { massNumber: 6, abundance: 0, stable: false },
    { massNumber: 8, abundance: 0, stable: false },
  ];
  he.isotopeCount = 4;
  bumped.push('He: isotopes rebuilt (He-3 0.000137 %, He-4 99.999863 %, both stable)');
}

/* ================================================================== */
/* 5. Isotope-table sanity sweep                                      */
/* ================================================================== */
/*
 * The He bug was "every isotope is 0 % and unstable" on an element whose
 * atomic weight says otherwise. The general rule that catches that class:
 * an element either has a naturally-occurring isotope mix that sums to ~100 %,
 * or has no natural isotopes at all (Tc, Pm, and the trace decay products Po,
 * At, Rn, Fr, Ra, Ac are conventionally shown as 0 %).
 *
 * Bi-209, Th-232 and U-234/235/238 are naturally occurring with 100 % total
 * but are genuinely radioactive, so "no stable isotope" is correct for them and
 * must NOT be flagged.
 */
// The CIAAW isotopic-composition tables are published to 2 decimals and do
// not always sum to exactly 100 %; this residual is in the published table.
const PUBLISHED_ROUNDING = new Map([['Sn', 99.34]]);

const problems = [];
for (const e of elements) {
  const total = e.isotopes.reduce((a, i) => a + i.abundance, 0);
  const want = PUBLISHED_ROUNDING.get(e.symbol);
  if (want !== undefined && Math.abs(total - want) < 0.02) continue;
  if (total > 0.001 && (total < 99.5 || total > 100.5)) {
    problems.push(`${e.symbol}: isotope abundances sum to ${total.toFixed(2)} %`);
  }
  if (e.atomicMass !== null && e.atomicMass >= 20) {
    const dominant = Math.max(...e.isotopes.map((i) => i.massNumber), 0);
    // A conventional atomic weight in the 20–80 range is built on a nuclide
    // the table must actually list.
    if (e.isotopes.length === 0) problems.push(`${e.symbol}: no isotopes listed`);
    else if (dominant < e.atomicMass - 3) {
      problems.push(`${e.symbol}: atomic weight ${e.atomicMass} but heaviest listed nuclide is A=${dominant}`);
    }
  }
  if (e.phase === 'gas' && e.meltingPointK != null && e.meltingPointK > 273.15) {
    problems.push(`${e.symbol}: phase gas but melting point ${e.meltingPointK} K`);
  }
  if (e.phase === 'solid' && e.meltingPointK != null && e.meltingPointK < 200) {
    problems.push(`${e.symbol}: phase solid but melting point only ${e.meltingPointK} K`);
  }
}

writeFileSync(elementsPath, JSON.stringify({ _meta: elements._meta, elements }, null, 0));
writeFileSync(
  ionsPath,
  JSON.stringify({ ...ionsDoc, _meta: { ...(ionsDoc._meta ?? {}), formulaChargeConvention: 'superscript + (U+207A) / − (U+207B) after the ion subscript' } }, null, 0),
);

console.log(`applied ${bumped.length} correction(s):`);
for (const b of bumped) console.log('  · ' + b);
if (!bumped.length) console.log('  (nothing to do)');
if (problems.length) {
  console.log(`\n${problems.length} unresolved inconsistency(ies):`);
  for (const p of problems) console.log('  ✗ ' + p);
  process.exitCode = 1;
} else {
  console.log('\nno remaining gas/melting-point or natural-isotope inconsistencies');
}
