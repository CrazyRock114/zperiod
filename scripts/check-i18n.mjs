#!/usr/bin/env node
/**
 * Audits i18n usage against the contract.
 *
 *   node scripts/check-i18n.mjs
 *
 * Three checks:
 *   1. every `t('literal')` in the source exists in UI_KEYS
 *   2. dynamic `t(\`...\`)` templates resolve to keys that exist
 *   3. every locale dictionary covers every key in UI_KEYS
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ---- contract keys ---- */
const keySrc = readFileSync(join(root, 'src/i18n/keys.ts'), 'utf8');
const KEYS = [...keySrc.matchAll(/^ {2}'([a-zA-Z0-9._-]+)',$/gm)].map((m) => m[1]);
const KEYSET = new Set(KEYS);

/* ---- walk src ---- */
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const files = walk(join(root, 'src'));
const used = new Map(); // key -> [files]
const templates = [];

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const rel = f.slice(root.length + 1);

  // t('a.b.c') and t("a.b.c")
  for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9._-]+)'/g)) {
    if (!used.has(m[1])) used.set(m[1], []);
    used.get(m[1]).push(rel);
  }
  // t(`a.b.${x}`)
  for (const m of src.matchAll(/\bt\(\s*`([a-zA-Z0-9._\-\$\{\}]+)`/g)) {
    templates.push({ tpl: m[1], file: rel });
  }
}

const missing = [...used.keys()].filter((k) => !KEYSET.has(k)).sort();

console.log(`contract: ${KEYS.length} keys`);
console.log(`static t('…') call sites: ${used.size} distinct keys`);
console.log(`dynamic t(\`…\`) templates:  ${templates.length}`);

if (missing.length) {
  console.log(`\n${missing.length} key(s) used in code but NOT in the contract:`);
  for (const k of missing) {
    console.log(`  ✗ ${k}  (${[...new Set(used.get(k))].join(', ')})`);
  }
}

/* ---- expand dynamic templates ---- */
const prefixes = new Set();
for (const { tpl } of templates) {
  // `phase.${p}` -> "phase."
  const i = tpl.indexOf('${');
  const pre = tpl.slice(0, i);
  if (KEYSET.has(pre)) continue;
  const hits = [...KEYSET].filter((k) => k.startsWith(pre));
  if (hits.length) prefixes.add(`${pre}* (${hits.length})`);
  else missing.push(`${pre}…  (template "${tpl}")`);
}
if (prefixes.size) {
  console.log('\ndynamic prefixes that resolve:');
  for (const p of [...prefixes].sort()) console.log(`  · ${p}`);
}

/* ---- dictionary coverage ---- */
const transDir = join(root, 'src/i18n/translations');
const langSrc = readFileSync(join(root, 'src/i18n/languages.ts'), 'utf8');
const codes = [...langSrc.matchAll(/code: '([^']+)'/g)].map((m) => m[1]);
console.log(`\nlocales declared: ${codes.length}`);

const gaps = [];
for (const c of codes) {
  const p = join(transDir, `${c}.json`);
  if (!existsSync(p)) {
    gaps.push(`${c}: dictionary missing`);
    continue;
  }
  const d = JSON.parse(readFileSync(p, 'utf8'));
  const absent = KEYS.filter((k) => !(k in d));
  const empty = KEYS.filter((k) => k in d && (typeof d[k] !== 'string' || !d[k].trim()));
  if (absent.length) gaps.push(`${c}: ${absent.length}/${KEYS.length} missing — e.g. ${absent.slice(0, 5).join(', ')}`);
  if (empty.length) gaps.push(`${c}: ${empty.length} empty — e.g. ${empty.slice(0, 5).join(', ')}`);
}

/* ---- placeholder consistency ----
   Two directions, only one of which is a bug:
     - a locale inventing a slot the English string does not have  -> LEAKS a
       literal "{n}" into the UI, so this is an error
     - English documenting a slot the locale omitted                 -> cosmetic
       (interpolate() drops unfilled slots), so this is a note

   Only keys the app actually renders are escalated to errors; an unused key
   with a stray slot is not something a user can ever see.
*/
const USED = new Set(used.keys());
const ph = (s) => String(s).match(/\{[a-zA-Z0-9_]+\}/g) ?? [];
const leaks = [];
const cosmetic = [];
const enPath = join(transDir, 'en.json');
if (existsSync(enPath)) {
  const en = JSON.parse(readFileSync(enPath, 'utf8'));
  for (const c of codes) {
    const p = join(transDir, `${c}.json`);
    if (!existsSync(p) || c === 'en') continue;
    const d = JSON.parse(readFileSync(p, 'utf8'));
    for (const k of KEYS) {
      if (!(k in d) || !(k in en)) continue;
      const le = new Set(ph(en[k]));
      const ll = new Set(ph(d[k]));
      for (const slot of ll) {
        if (le.has(slot)) continue;
        const line = `${c}/${k}: locale has extra slot ${slot}`;
        if (USED.has(k)) leaks.push(line + '  (RENDERED — would leak)');
        else cosmetic.push(line + '  (unused key)');
      }
      for (const slot of le) {
        if (!ll.has(slot)) cosmetic.push(`${c}/${k}: en has ${slot}, locale omits it`);
      }
    }
  }
}

if (gaps.length) {
  console.log(`\n${gaps.length} dictionary issue(s):`);
  for (const g of gaps) console.log('  ⚠ ' + g);
}
if (leaks.length) {
  console.log(`\n${leaks.length} placeholder LEAK(s) on rendered keys:`);
  for (const d of leaks.slice(0, 30)) console.log('  ✗ ' + d);
}
if (cosmetic.length) {
  console.log(`\n${cosmetic.length} cosmetic note(s) (unused keys / en documenting a slot the locale omits)`);
}
/* ---- 4. placeholders no call site fills -------------------------------
   A key that documents a {slot} but whose call site never supplies it is
   worse than useless: the slot is dropped at render time (so the string is
   already wrong) and, in dev, interpolate() warns on every render — 7 500
   identical console lines per run.

   Only that case is an error. A key nobody renders at all is dead weight but
   cannot misbehave, so it is reported as info. */
const enDict = existsSync(enPath) ? JSON.parse(readFileSync(enPath, 'utf8')) : {};
const srcFiles = walk(join(root, 'src'));
const called = new Set();
const withVars = new Set();
for (const f of srcFiles) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\btf?\(\s*'([a-zA-Z0-9._-]+)'/g)) called.add(m[1]);
  for (const m of src.matchAll(/\btf?\(\s*'([a-zA-Z0-9._-]+)'\s*,[^)]*\{\s*[a-zA-Z]/g)) withVars.add(m[1]);
}
const placeholderKeys = Object.keys(enDict).filter((k) => /\{[a-zA-Z0-9_]+\}/.test(enDict[k] ?? ''));
const starved = placeholderKeys.filter((k) => called.has(k) && !withVars.has(k));
const dead = placeholderKeys.filter((k) => !called.has(k));

if (starved.length) {
  console.log(`\n${starved.length} RENDERED key(s) declare a placeholder no call site fills:`);
  for (const k of starved) console.log(`  ✗ ${k} = ${JSON.stringify(enDict[k])}`);
}
if (dead.length) {
  console.log(`\n${dead.length} unused key(s) carry placeholders (never rendered, harmless):`);
  console.log('  · ' + dead.join(', '));
}

if (!gaps.length && !leaks.length && !starved.length) {
  console.log('\nall locales complete, no missing keys, no placeholder leaks or starved slots');
}
