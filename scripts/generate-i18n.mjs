#!/usr/bin/env node
/**
 * i18n dictionary generator.
 *
 * SOURCE OF TRUTH for localised strings: `scripts/i18n/data/<code>.mjs`
 *   one data module per locale, each a flat `{ key: "string" }` object.
 *
 * CONTRACT: `src/i18n/keys.ts` (the `UI_KEYS` array). A key that is missing from
 * a dictionary falls back to English at runtime, which is a visible bug, so this
 * script refuses to write a dictionary that is not 100% complete.
 *
 * Usage:
 *   node scripts/generate-i18n.mjs            # write all 14 dictionaries
 *   node scripts/generate-i18n.mjs --check    # validate only, write nothing
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const DATA_DIR = join(HERE, 'i18n', 'data');
const KEYS_FILE = join(ROOT, 'src', 'i18n', 'keys.ts');
const OUT_DIR = join(ROOT, 'src', 'i18n', 'translations');

/** Locales owned by this slice (the other 26 fall back to English per key). */
export const LOCALES = [
  'en', 'zh-Hans', 'zh-Hant', 'es', 'fr', 'de', 'ja',
  'ko', 'pt-BR', 'it', 'ru', 'ar', 'tr', 'pl',
];

/** Pull the literal key list out of keys.ts so the contract is never retyped. */
export function readContractKeys() {
  const src = readFileSync(KEYS_FILE, 'utf8');
  const keys = [...src.matchAll(/^ {2}'([a-zA-Z0-9._-]+)',$/gm)].map((m) => m[1]);
  if (keys.length < 100) throw new Error(`key contract parse looks wrong: ${keys.length} keys`);
  return keys;
}

const placeholders = (s) => (s.match(/\{[a-z]+\}/g) ?? []).sort().join(',');

/**
 * English values that are legitimately spelled the same in several target
 * languages: SI unit names, international loanwords, and the "{el} ({sym},
 * Z = {z})" caption whose only variable parts are placeholders. Anything else
 * identical to English is treated as an untranslated leftover.
 */
const SHARED_TERMS = new Set([
  'Actinide', 'Alkali metal', 'Anion', 'Block', 'Cation', 'Celsius', 'Charge',
  'Combustion', 'Correct', 'Date', 'Email', 'Fahrenheit', 'Gas', 'Halogen',
  'Ions', 'Isotopes', 'Kelvin', 'Lanthanide', 'Layout', 'Menu', 'Message',
  'Name', 'Neutrons', 'Normal', 'Plasma', 'Protons', 'Question', 'Quiz',
  'Solutions', 'Symbol', 'System', 'Type', '{el} ({sym}, Z = {z})', '{n} ions',
]);

async function loadLocale(code) {
  const mod = await import(pathToFileURL(join(DATA_DIR, `${code}.mjs`)).href);
  const dict = mod.default;
  if (!dict || typeof dict !== 'object') throw new Error(`${code}.mjs has no default export object`);
  return dict;
}

function validate(code, dict, keys, en) {
  const errs = [];
  const extra = Object.keys(dict).filter((k) => !keys.includes(k));
  for (const k of extra) errs.push(`${code}: key not in contract: ${k}`);
  for (const k of keys) {
    const v = dict[k];
    if (v === undefined) { errs.push(`${code}: missing ${k}`); continue; }
    if (typeof v !== 'string' || !v.trim()) { errs.push(`${code}: empty ${k}`); continue; }
    if (code !== 'en' && placeholders(v) !== placeholders(en[k])) {
      errs.push(`${code}: placeholder mismatch ${k} -> ${v}`);
    }
    if (/<[a-z/][^>]*>/i.test(v)) errs.push(`${code}: looks like HTML ${k} -> ${v}`);
    if (code !== 'en' && v === en[k] && !SHARED_TERMS.has(v)
        && !/^(app\.name|footer\.|settings\.version|tools\.|misc\.)/.test(k)) {
      errs.push(`${code}: untranslated (identical to en) ${k}`);
    }
  }
  return errs;
}

function serialise(keys, dict) {
  const out = {};
  for (const k of keys) out[k] = dict[k];
  return JSON.stringify(out, null, 2) + '\n';
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const keys = readContractKeys();
  const en = await loadLocale('en');
  const all = { en };
  for (const code of LOCALES) if (code !== 'en') all[code] = await loadLocale(code);

  const errors = [];
  for (const code of LOCALES) errors.push(...validate(code, all[code], keys, en));

  const counts = LOCALES.map((c) => `${c}=${Object.keys(all[c]).length}`).join(' ');
  console.log(`contract keys: ${keys.length}`);
  console.log(`dictionaries:  ${counts}`);

  if (errors.length) {
    console.error(`FAIL (${errors.length})`);
    for (const e of errors.slice(0, 60)) console.error('  ' + e);
    process.exit(1);
  }

  if (checkOnly) {
    console.log(`OK ${LOCALES.length} locales x ${keys.length} keys (no write)`);
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  for (const code of LOCALES) {
    writeFileSync(join(OUT_DIR, `${code}.json`), serialise(keys, all[code]), 'utf8');
  }
  // Only count files this slice owns; other locales are produced by other generators.
  const written = LOCALES.filter((c) => existsSync(join(OUT_DIR, `${c}.json`)));
  const total = readdirSync(OUT_DIR).filter((f) => f.endsWith('.json')).length;
  console.log(`OK ${written.length} locales x ${keys.length} keys -> ${OUT_DIR} (${total} files in dir)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
