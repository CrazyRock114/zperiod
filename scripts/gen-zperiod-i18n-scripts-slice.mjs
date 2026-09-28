#!/usr/bin/env node
/**
 * Zperiod i18n generator — worker slice "scripts" (13 locales).
 *
 * Locales owned by THIS worker:
 *   uk, el, he, fa, ur, vi, id, th, ms, ta, bn, tl, hi
 *
 * Source of truth for the strings is the per-locale data module in
 * ./i18n-scripts-slice/<code>.mjs — this file only validates and emits.
 *
 * Usage:
 *   node scripts/gen-zperiod-i18n-scripts-slice.mjs          # write JSON
 *   node scripts/gen-zperiod-i18n-scripts-slice.mjs --check  # validate only
 *
 * Contract (src/i18n/keys.ts):
 *  - every UI_KEY present, non-empty string
 *  - placeholders {n} {el} {z} {sym} preserved verbatim (same multiset per key)
 *  - no extra keys, no HTML tags, no bidi control marks
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const KEYS_TS = path.join(ROOT, 'src/i18n/keys.ts');
const OUT_DIR = path.join(ROOT, 'src/i18n/translations');
const DATA_DIR = path.join(HERE, 'i18n-scripts-slice');

export const SLICE = ['uk', 'el', 'he', 'fa', 'ur', 'vi', 'id', 'th', 'ms', 'ta', 'bn', 'tl', 'hi'];

/** Keys that legitimately carry interpolation slots, and which ones. */
const PLACEHOLDER_KEYS = {
  'table.viewDetails': ['el'],
  'element.compareHint': ['el', 'n', 'z'],
  'tools.molar.massOf': ['el'],
  'tools.molar.numberOf': ['n'],
  'tools.balancer.massLeft': ['n'],
  'tools.balancer.massRight': ['n'],
  'tools.balancer.error.unknownElement': ['sym'],
  'worksheet.questionOf': ['n', 'n'],
};

/** `<`/`>` are only banned as markup; `->` is the chemical reaction arrow. */
const FORBIDDEN = /[‎‏؜‪-‮⁦-⁩]/;
const BANNED_ANGLE = /[<>]/;
const isClean = (v) =>
  !FORBIDDEN.test(v) && !BANNED_ANGLE.test(v.replace(/->/g, '').replace(/<=/g, '').replace(/>=/g, ''));

function readContract() {
  const src = fs.readFileSync(KEYS_TS, 'utf8');
  return [...src.matchAll(/^ {2}'([a-zA-Z0-9._-]+)',$/gm)].map((m) => m[1]);
}

function ph(s) {
  return (s.match(/\{[a-z]+\}/g) || []).slice().sort().join(',');
}

function validate(code, dict, keys) {
  const errs = [];
  const extra = Object.keys(dict).filter((k) => !keys.includes(k));
  for (const k of extra) errs.push(`${code}: EXTRA key not in contract -> ${k}`);
  for (const k of keys) {
    const v = dict[k];
    if (typeof v !== 'string') errs.push(`${code}: missing ${k}`);
    else if (!v.trim()) errs.push(`${code}: empty ${k}`);
    else {
      if (!isClean(v)) errs.push(`${code}: forbidden char in ${k}`);
      const want = (PLACEHOLDER_KEYS[k] || []).map((n) => `{${n}}`).sort().join(',');
      const got = ph(v);
      if (want !== got) errs.push(`${code}: placeholder drift ${k} want [${want}] got [${got}]`);
    }
  }
  return errs;
}

async function main() {
  const check = process.argv.includes('--check');
  const keys = readContract();
  const dicts = {};
  for (const code of SLICE) {
    const mod = await import(path.join(DATA_DIR, `${code}.mjs`));
    dicts[code] = mod.default;
  }

  const errs = [];
  for (const code of SLICE) errs.push(...validate(code, dicts[code], keys));

  // pairwise copy detection
  for (let i = 0; i < SLICE.length; i++) {
    for (let j = i + 1; j < SLICE.length; j++) {
      const same = keys.filter((k) => dicts[SLICE[i]][k] === dicts[SLICE[j]][k]).length;
      if (same > keys.length * 0.8) {
        errs.push(`${SLICE[i]} vs ${SLICE[j]} ${((same * 100) / keys.length).toFixed(0)}% identical`);
      }
    }
  }

  if (errs.length) {
    console.error(`FAIL (${errs.length})\n${errs.slice(0, 40).join('\n')}`);
    process.exit(1);
  }

  if (!check) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    for (const code of SLICE) {
      const out = {};
      for (const k of keys) out[k] = dicts[code][k];
      fs.writeFileSync(path.join(OUT_DIR, `${code}.json`), JSON.stringify(out, null, 2) + '\n');
    }
  }

  console.log(`OK 13 locales x ${keys.length} keys -> ${check ? 'validated only' : OUT_DIR}`);
}

main();
