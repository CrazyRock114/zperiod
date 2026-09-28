/**
 * Zperiod data layer verification.
 *
 * This is the task's acceptance check with the electron-count line repaired. The
 * original line cannot pass for any correct configuration, for two reasons:
 *
 *   1. /[0-9]+[<superscripts>]+/g can never match, because the subshell letter always
 *      sits between the shell number and the occupancy ("3d6" is d-letter in between).
 *   2. summing `'<superscript>'.indexOf(c)` is positional, so a two digit occupancy is
 *      read as 1 + 0 instead of 10: 3d10 would count as 1 electron, not 10.
 *
 * The repair keeps the same idea and the same failure messages:
 *
 *   -  /[0-9]+[<superscripts>]+/g  ->  /[0-9]+[spdf][<superscripts>]+/g
 *   -  t.slice(1)                   ->  strip the "<digits><letter>" head, then read the
 *                                       whole occupancy as one base-10 number
 *
 * Run:  node scripts/verify-data.mjs
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const els = require(path.join(ROOT, 'src/data/elements.json')).elements;
const ions = require(path.join(ROOT, 'src/data/ions.json')).ions;
const sol = require(path.join(ROOT, 'src/data/solubility.json')).rules;
const err = [];
if (els.length !== 118) err.push('elements: ' + els.length);
const seen = new Set();
for (let i = 0; i < 118; i++) {
  const e = els[i];
  if (!e) err.push('missing Z=' + (i + 1));
  if (!e) continue;
  if (e.atomicNumber !== i + 1) err.push('Z order ' + e.atomicNumber);
  const k = e.symbol;
  if (seen.has(k)) err.push('dup symbol ' + k);
  seen.add(k);
  if (!e.name || !e.electronConfiguration) err.push(k + ' missing name/config');
  if (!e.period || !e.group || !e.block || !e.category) err.push(k + ' missing placement');
  if (!Array.isArray(e.isotopes) || !e.isotopes.length) err.push(k + ' no isotopes');
  for (const iso of e.isotopes) {
    if (typeof iso.massNumber !== 'number' || typeof iso.abundance !== 'number' || typeof iso.stable !== 'boolean') err.push(k + ' bad isotope');
    if (iso.abundance < 0 || iso.abundance > 100) err.push(k + ' abundance out of range');
  }
}
const SU = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
for (const e of els) {
  if (!e) continue;
  const asDigits = (s) => s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c));
  const n = (e.electronConfiguration.match(/[0-9]+[spdf][⁰¹²³⁴⁵⁶⁷⁸⁹]+/g) || []).reduce((a, t) => {
    const occupancy = parseInt(asDigits(t.replace(/^[0-9]+[spdf]/, '')), 10);
    return a + occupancy;
  }, 0);
  if (n !== e.atomicNumber) err.push(e.symbol + ' config electrons ' + n + ' != Z ' + e.atomicNumber);
}
for (const ion of ions) {
  if (!ion.id || !ion.formula || ion.protons == null || ion.electrons == null) err.push('bad ion ' + (ion.id || '?'));
  if (ion.type !== 'polyatomic' && ion.electrons !== ion.atomicNumber - ion.charge) err.push(ion.id + ' electron count wrong');
  if (ion.subscript && ion.netCharge !== ion.charge * ion.subscript) err.push(ion.id + ' netCharge wrong');
}
const si = new Set(ions.map((i) => i.id));
if (si.size !== ions.length) err.push('dup ion id');
if (sol.length < 20) err.push('solubility rules: ' + sol.length);
console.log(err.length ? 'FAIL\n' + err.join('\n') : 'OK 118 elements / ' + ions.length + ' ions / ' + sol.length + ' solubility rules');
