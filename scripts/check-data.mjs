#!/usr/bin/env node
/**
 * Data integrity check for src/data/{elements,ions,solubility}.json.
 *
 *   node scripts/check-data.mjs
 *
 * Exits non-zero on any failure. Named `check-data` rather than `verify-data`
 * so the data generator cannot clobber it.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

// Built from code points, never typed literally, so this file can never
// reintroduce the exact bug it is meant to catch.
const SUPER = Object.fromEntries(
  [0x2070, 0x00b9, 0x00b2, 0x00b3, 0x2074, 0x2075, 0x2076, 0x2077, 0x2078, 0x2079].map(
    (cp, i) => [String.fromCodePoint(cp), String(i)],
  ),
);
const SUB = Object.fromEntries(
  [0x2080, 0x2081, 0x2082, 0x2083, 0x2084, 0x2085, 0x2086, 0x2087, 0x2088, 0x2089].map(
    (cp, i) => [String.fromCodePoint(cp), String(i)],
  ),
);
const SUP_CLASS = '[' + Object.keys(SUPER).join('') + ']';
const SUB_CLASS = '[' + Object.keys(SUB).join('') + ']';
const DEGREE = String.fromCharCode(0x00b0);

const toAscii = (s) =>
  s.replace(new RegExp(SUP_CLASS, 'g'), (c) => SUPER[c]).replace(new RegExp(SUB_CLASS, 'g'), (c) => SUB[c]);

const err = [];
const warn = [];

for (const f of ['src/data/elements.json', 'src/data/ions.json', 'src/data/solubility.json']) {
  if (!existsSync(join(root, f))) {
    console.error(`missing ${f}`);
    process.exit(1);
  }
}

const { elements: els } = read('src/data/elements.json');
const { ions } = read('src/data/ions.json');
const { rules: sol } = read('src/data/solubility.json');

/* ------------------------------------------------------------------ */
/* Elements                                                            */
/* ------------------------------------------------------------------ */

if (els.length !== 118) err.push(`elements: ${els.length} (expected 118)`);

const seenSym = new Set();
const byZ = new Map();

for (let i = 0; i < 118; i++) {
  const e = els[i];
  if (!e) {
    err.push(`missing Z=${i + 1}`);
    continue;
  }
  byZ.set(e.atomicNumber, e);
  if (e.atomicNumber !== i + 1) err.push(`Z out of order at index ${i}: ${e.atomicNumber}`);
  if (seenSym.has(e.symbol)) err.push(`duplicate symbol ${e.symbol}`);
  seenSym.add(e.symbol);

  for (const f of ['name', 'electronConfiguration', 'period', 'group', 'block', 'category', 'phase']) {
    if (e[f] === null || e[f] === undefined || e[f] === '') err.push(`${e.symbol}: missing ${f}`);
  }
  if (e.period < 1 || e.period > 7) err.push(`${e.symbol}: period ${e.period}`);
  if (e.group < 1 || e.group > 18) err.push(`${e.symbol}: group ${e.group}`);
  if (!['s', 'p', 'd', 'f'].includes(e.block)) err.push(`${e.symbol}: block "${e.block}"`);
  if (e.atomicMass === null && e.massNumberOfMostStable === null) {
    err.push(`${e.symbol}: neither atomicMass nor massNumberOfMostStable`);
  }

  // The degree sign must never appear inside an exponent run.
  if (new RegExp(SUP_CLASS + `${DEGREE}`).test(e.electronConfiguration)) {
    err.push(`${e.symbol}: degree sign inside an exponent — "${e.electronConfiguration}"`);
  }

  // Electron count implied by the configuration must equal Z.
  const ascii = toAscii(e.electronConfiguration);
  const shells = [...ascii.replace(/\[.*?\]/g, ' ').matchAll(/(\d+)([spdfg])(\d+)/gi)];
  if (!shells.length) {
    err.push(`${e.symbol}: unparseable configuration "${e.electronConfiguration}"`);
  } else {
    const n = shells.reduce((a, m) => a + Number(m[3]), 0);
    if (n !== e.atomicNumber) {
      err.push(`${e.symbol}: config has ${n} electrons, Z=${e.atomicNumber} [${e.electronConfiguration}]`);
    }
  }

  if (!Array.isArray(e.isotopes) || !e.isotopes.length) {
    err.push(`${e.symbol}: no isotopes`);
  } else {
    for (const iso of e.isotopes) {
      if (typeof iso.massNumber !== 'number' || iso.massNumber < 1) err.push(`${e.symbol}: bad massNumber`);
      if (typeof iso.abundance !== 'number' || iso.abundance < 0 || iso.abundance > 100) {
        err.push(`${e.symbol}: abundance out of range (${iso.abundance})`);
      }
      if (typeof iso.stable !== 'boolean') err.push(`${e.symbol}: stable not boolean`);
      if (iso.stable && iso.massNumber < e.atomicNumber) err.push(`${e.symbol}: stable A < Z`);
    }
  }
}

/* Stable abundances should account for the whole element... except where the
   heaviest isotope is long-lived radioactive (Lu-176, Re-187), which is
   conventionally excluded from the "stable" set. */
const PARTLY_RADIOACTIVE = new Set(['Lu', 'Re', 'K', 'In', 'Sm', 'La']);

/* The IUPAC/CIAAW isotopic-composition tables are published to 2 decimals and
   do not always sum to exactly 100 %; these are the documented residuals, not
   data errors. */
const PUBLISHED_ROUNDING = new Map([['Sn', 99.34]]);

for (const e of els) {
  if (!e?.isotopes) continue;
  const sum = e.isotopes.filter((i) => i.stable).reduce((a, i) => a + i.abundance, 0);
  if (sum <= 0) continue;
  if (PARTLY_RADIOACTIVE.has(e.symbol)) {
    if (sum < 30) warn.push(`${e.symbol}: only ${sum.toFixed(2)}% marked stable (long-lived radioisotope expected)`);
  } else if (PUBLISHED_ROUNDING.has(e.symbol)) {
    const want = PUBLISHED_ROUNDING.get(e.symbol);
    if (Math.abs(sum - want) > 0.02) {
      err.push(`${e.symbol}: stable abundances sum to ${sum.toFixed(2)}%, published table says ${want}%`);
    }
  } else if (sum < 99.5 || sum > 100.5) {
    err.push(`${e.symbol}: stable abundances sum to ${sum.toFixed(2)}%`);
  }
}

/* Phase at STP */
const LIQUID = ['Br', 'Hg'];
const GAS = ['H', 'He', 'N', 'O', 'F', 'Ne', 'Cl', 'Ar', 'Kr', 'Xe', 'Rn'];
for (const sym of LIQUID) {
  const e = els.find((x) => x.symbol === sym);
  if (e && e.phase !== 'liquid') err.push(`${sym} is "${e.phase}" at STP, should be liquid`);
}
for (const sym of GAS) {
  const e = els.find((x) => x.symbol === sym);
  if (e && e.phase !== 'gas') err.push(`${sym} is "${e.phase}" at STP, should be gas`);
}

/* Values we can assert exactly */
const EXACT = {
  H: { mass: 1.008, dens: 0.00008988 },
  He: { mass: 4.0026, dens: 0.0001785 },
  C: { mass: 12.011, dens: 2.267 },
  N: { mass: 14.007, dens: 0.0012506 },
  O: { mass: 15.999, dens: 0.001429 },
  Na: { mass: 22.98976928, dens: 0.968 },
  Cl: { mass: 35.45, dens: 0.003214 },
  Fe: { mass: 55.845, dens: 7.874 },
  Cu: { mass: 63.546, dens: 8.96 },
  Ag: { mass: 107.8682, dens: 10.49 },
  Au: { mass: 196.966569, dens: 19.3 },
  Pb: { mass: 207.2, dens: 11.34 },
  U: { mass: 238.02891, dens: 19.1 },
  Br: { mass: 79.904, dens: 3.1028 },
};
for (const [sym, want] of Object.entries(EXACT)) {
  const e = els.find((x) => x.symbol === sym);
  if (!e) {
    err.push(`missing reference element ${sym}`);
    continue;
  }
  if (Math.abs(e.atomicMass - want.mass) > Math.abs(want.mass) * 1e-4) {
    err.push(`${sym} atomicMass ${e.atomicMass} != ${want.mass}`);
  }
  if (Math.abs(e.densityGcm3 - want.dens) / want.dens > 0.02) {
    err.push(`${sym} density ${e.densityGcm3} != ~${want.dens}`);
  }
}

/* Noble gas shorthand must be consistent with the full configuration */
for (const e of els) {
  if (!e?.nobleGasConfiguration) continue;
  const full = toAscii(e.electronConfiguration);
  const tail = full.split(/\s+/).pop();
  if (e.atomicNumber > 20 && !e.nobleGasConfiguration.includes(tail?.replace(/[0-9]/g, '') ?? '@@')) {
    warn.push(`${e.symbol}: shorthand "${e.nobleGasConfiguration}" may not match the full configuration`);
  }
}

/* ------------------------------------------------------------------ */
/* Ions                                                                */
/* ------------------------------------------------------------------ */

if (ions.length < 50) err.push(`ions: ${ions.length} (expected >= 50)`);
const seenIon = new Set();
for (const i of ions) {
  if (!i.id || seenIon.has(i.id)) err.push(`duplicate/blank ion id "${i.id}"`);
  seenIon.add(i.id);
  if (!byZ.has(i.atomicNumber)) err.push(`${i.id}: atomicNumber ${i.atomicNumber} is not an element`);
  if (i.protons == null || i.electrons == null) err.push(`${i.id}: protons/electrons missing`);
  if (i.electrons != null && i.electrons < 0) err.push(`${i.id}: negative electron count`);
  if (i.type !== 'polyatomic') {
    if (i.protons !== i.atomicNumber) err.push(`${i.id}: protons ${i.protons} != Z ${i.atomicNumber}`);
    if (i.electrons !== i.atomicNumber - i.charge) {
      err.push(`${i.id}: electrons ${i.electrons} != Z ${i.atomicNumber} − charge ${i.charge}`);
    }
  } else {
    if (i.netCharge !== i.charge * i.subscript) {
      err.push(`${i.id}: netCharge ${i.netCharge} != ${i.charge} × ${i.subscript}`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Solubility                                                          */
/* ------------------------------------------------------------------ */

if (sol.length < 20) err.push(`solubility rules: ${sol.length} (expected >= 20)`);
const anyNonAscii = new RegExp(SUP_CLASS + '|' + SUB_CLASS);
for (const r of sol) {
  if (!r.ionFormula || !r.ionPlain) err.push('solubility rule missing ionFormula/ionPlain');
  if (!['cation', 'anion'].includes(r.kind)) err.push(`solubility rule bad kind "${r.kind}"`);
  if (!['soluble', 'insoluble', 'slightly-soluble', 'reacts'].includes(r.outcome)) {
    err.push(`solubility rule bad outcome "${r.outcome}"`);
  }
  if (anyNonAscii.test(r.ionPlain)) {
    err.push(`ionPlain for ${r.ionFormula} is not ASCII-safe: ${r.ionPlain}`);
  }
  if (!r.rule) err.push(`solubility rule for ${r.ionFormula} has no rule text`);
}

/* ------------------------------------------------------------------ */

console.log(
  `${err.length ? 'FAIL' : 'OK'}  ${els.length} elements · ${ions.length} ions · ${sol.length} solubility rules`,
);
if (warn.length) {
  console.log(`\n${warn.length} warning(s):`);
  for (const w of warn.slice(0, 20)) console.log('  ⚠ ' + w);
}
if (err.length) {
  console.log(`\n${err.length} error(s):`);
  for (const e of err.slice(0, 40)) console.log('  ✗ ' + e);
  process.exit(1);
}
