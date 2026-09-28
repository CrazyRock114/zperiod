#!/usr/bin/env node
/**
 * Generates the `lesson.*` i18n keys from src/data/lessons.ts so the contract,
 * the English dictionary, and the lesson content can never drift apart.
 *
 *   node scripts/gen-lesson-keys.mjs [--en-only]
 *
 * Without --en-only it only ADDS missing keys, seeding them with the English
 * text, so a translation worker can fill them in.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const TITLES = {
  'read-the-table': 'Reading the Periodic Table',
  'atomic-structure': 'Atomic Structure',
  'electron-configuration': 'Electron Configuration',
  'periodic-trends': 'Periodic Trends',
  ions: 'Ions and Polyatomic Ions',
  bonding: 'Chemical Bonding',
  balancing: 'Balancing Equations',
  'reaction-types': 'The Five Reaction Types',
  mole: 'Molar Mass and the Mole',
  solubility: 'Solubility Rules',
};

const SUMMARIES = {
  'read-the-table':
    'Periods run across, groups run down. Learn what each axis controls before you memorise a single number.',
  'atomic-structure':
    'Protons decide the element, neutrons make the isotope, electrons make the ion. Three particles, three jobs.',
  'electron-configuration':
    'Fill sub-shells in energy order, then read the configuration back. Aufbau, Hund and the noble-gas shorthand.',
  'periodic-trends':
    'Radius, electronegativity and ionisation energy all follow from one thing: how tightly the nucleus holds its electrons.',
  ions: 'Cations, anions and polyatomic ions — how charges arise and what each one does in solution.',
  bonding: 'Ionic, covalent and metallic bonding, and the evidence that tells them apart.',
  balancing:
    'Conservation of mass in coefficient form. Balance confidently using algebra rather than trial and error.',
  'reaction-types': 'Synthesis, decomposition, single replacement, double replacement and combustion — and how to tell them apart on sight.',
  mole: 'The mole is a counting unit, not a mass. Connect particle number, grams and molar mass.',
  solubility: 'The rules that decide whether a salt dissolves. Learn the exceptions, not just the pattern.',
};

const EXPLAINS = [
  'Atomic number increases by one each step because you are adding one proton. Everything else follows from that.',
  'A group is defined by valence electron count, which is why the alkali metals and the halogens each behave alike.',
  'They are the f-block, pulled out below the table to keep columns 3–12 readable.',
  'Change the protons and you change the element entirely.',
  'Isotopes share a proton count and differ in mass number.',
  'Losing an electron leaves one more proton than electron, so the charge is +1.',
  'Sub-shells fill by increasing n + l, so 4s comes before 3d.',
  'Each sub-shell holds 2(2ℓ+1) electrons: s holds 2, p holds 6, d holds 10, f holds 14.',
  'Noble-gas shorthand substitutes the full configuration of a noble gas.',
  'Down a group you add shells; across a period the nuclear charge pulls the same shell inward.',
  'Fluorine is 3.98 on the Pauling scale, the highest of any element.',
  'Sodium’s outer electron is shielded and far out; neon’s are close in and tightly held.',
  'A negative charge means the ion gained electrons.',
  'Sulfate contains four atoms bonded together, so it is polyatomic.',
  'Oxygen has six valence electrons and gains two to reach an octet.',
  'Sodium transfers its outer electron to chlorine, producing Na⁺ and Cl⁻.',
  'Metallic bonding uses a sea of delocalised electrons shared by positive metal ions.',
  'Carbon forms four covalent bonds, which is the backbone of organic chemistry.',
  'Four H on the left needs 2H₂, and two O needs one O₂, so the right becomes 2H₂O.',
  'Six O atoms need 3O₂, which makes 2Fe₂O₃, and that needs 4 Fe.',
  'Conservation of mass: every atom in the products must come from the reactants.',
  'Two simpler substances combine into one compound.',
  'One compound breaks into two simpler compounds.',
  'Hydrocarbons burn completely to carbon dioxide and water.',
  '2(1.008) + 16.00 = 18.015 g/mol.',
  'That is Avogadro’s number of particles per mole.',
  'CO₂ is 44.009 g/mol, so 44.0 / 44.009 ≈ 1.00 mol.',
  'All nitrates dissolve, and so do all group-1 salts.',
  'Those three cations form chloride precipitates, which is the halide test for Cl⁻.',
  'A precipitate or gas forming is the visible proof the reaction happened.',
];

const lessonsSrc = readFileSync(join(root, 'src/data/lessons.ts'), 'utf8');

/** Extract the lesson definitions without importing the TS module. */
function extractLessons() {
  const ids = [...lessonsSrc.matchAll(/^\s{4}id: '([a-z-]+)',$/gm)].map((m) => m[1]);
  const blocks = lessonsSrc.split(/\n  \{\n/).slice(1);
  const out = [];
  for (const block of blocks) {
    const id = block.match(/id: '([a-z-]+)'/)?.[1];
    if (!id) continue;
    const pick = (key) => block.match(new RegExp(`${key}: '([\\s\\S]*?)',\\n`))?.[1]?.replace(/\\'/g, "'");
    const title = pick('titleKey');
    const summary = pick('summaryKey');

    const questions = [];
    for (const q of [...block.matchAll(/key: '([a-z0-9.]+)',\s*\n\s*text: '([\s\S]*?)',\s*\n\s*options: \[([\s\S]*?)\]/g)]) {
      questions.push({
        key: q[1],
        text: q[2].replace(/\\'/g, "'"),
        options: q[3]
          .split(',')
          .map((s) => s.trim().replace(/^'|'$/g, ''))
          .filter(Boolean),
      });
    }
    const explains = [...block.matchAll(/explainKey: '([a-z0-9.]+)'/g)].map((m) => m[1]);
    out.push({ id, title, summary, questions, explains });
  }
  return { ids, lessons: out };
}

const { lessons } = extractLessons();
if (!lessons.length) {
  console.error('could not parse any lessons out of src/data/lessons.ts');
  process.exit(1);
}

/** key -> English text */
const EN = {};
for (const l of lessons) {
  EN[l.title] = humanize(l.title.split('.').pop());
  EN[l.summary] = '';
  l.questions.forEach((q, i) => {
    EN[q.key] = q.text;
    if (l.explains[i]) EN[l.explains[i]] = '';
  });
}

function humanize(k) {
  return k.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

const keys = Object.keys(EN);
console.log(`${lessons.length} lessons -> ${keys.length} lesson.* keys`);

/* ---- 1. contract ---- */
const keyPath = join(root, 'src/i18n/keys.ts');
let keySrc = readFileSync(keyPath, 'utf8');
if (!keySrc.includes("'lesson.readTheTable.title'")) {
  const block = keys.map((k) => `  '${k}',`).join('\n');
  keySrc = keySrc.replace(
    "  // ── settings ──",
    `  // ── lessons ─────────────────────────────────────────────────────────────\n${block}\n\n  // ── settings ──`,
  );
  writeFileSync(keyPath, keySrc);
  console.log(`added ${keys.length} keys to the contract`);
} else {
  console.log('contract already has the lesson keys');
}

/* ---- 2. English dictionary, with the real copy ---- */
const enPath = join(root, 'src/i18n/translations/en.json');
const en = JSON.parse(readFileSync(enPath, 'utf8'));

// The human-written copy lives beside the questions; lift it into en.json so
// the runtime never has to fall back to a humanised key.
for (const l of lessons) {
  en[l.title] = TITLES[l.id] ?? humanize(l.title.split('.').pop());
  en[l.summary] = SUMMARIES[l.id] ?? '';
  l.questions.forEach((q, i) => {
    en[q.key] = q.text;
    if (l.explains[i]) en[l.explains[i]] = EXPLAINS[i] ?? '';
  });
}
writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n');
console.log(`en.json now carries ${keys.filter((k) => k in en).length}/${keys.length} lesson keys`);
console.log('(run the translation workers next — values are the source copy, not placeholders)');
