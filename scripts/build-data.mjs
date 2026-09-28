/**
 * Zperiod data builder.
 *
 * Reads the curated source tables in ./data/** plus the NIST isotope data scraped
 * by ./scrape-nist.mjs (cached at /tmp/nist-isotopes.json) and writes:
 *   src/data/elements.json
 *   src/data/ions.json
 *   src/data/solubility.json
 *
 * Run:  node scripts/build-data.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ELEMENTS_1_40 } from './data/elements-1-40.mjs';
import { ELEMENTS_41_80 } from './data/elements-41-80.mjs';
import { ELEMENTS_81_118 } from './data/elements-81-118.mjs';
import { RADIO_ONLY, RADIO_SUPPLEMENTS, OBSERVATIONALLY_RADIOACTIVE } from './data/isotopes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NIST_CACHE = ['scripts/data/nist-isotopes.json', '/tmp/nist-isotopes.json'].find((p) => fs.existsSync(path.join(ROOT, p)) || fs.existsSync(p));
const NIST = JSON.parse(fs.readFileSync(NIST_CACHE.startsWith('/') ? NIST_CACHE : path.join(ROOT, NIST_CACHE), 'utf8'));

const RAW = [...ELEMENTS_1_40, ...ELEMENTS_41_80, ...ELEMENTS_81_118];

/* ------------------------------------------------------------------ */
/* Electron configuration helpers                                     */
/* ------------------------------------------------------------------ */

const CORE = {
  He: '1s2',
  Ne: '1s2 2s2 2p6',
  Ar: '1s2 2s2 2p6 3s2 3p6',
  Kr: '1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6',
  Xe: '1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 5s2 5p6',
  Rn: '1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 5s2 5p6 4f14 5d10 6s2 6p6',
};
const CORE_ELECTRONS = { He: 2, Ne: 10, Ar: 18, Kr: 36, Xe: 54, Rn: 86 };
const ORDERS = { s: 0, p: 1, d: 2, f: 3 };
const SUP = { 0: '\u2070', 1: '\u00b9', 2: '\u00b2', 3: '\u00b3', 4: '\u2074', 5: '\u2075', 6: '\u2076', 7: '\u2077', 8: '\u2078', 9: '\u2079' };
const toSup = (n) => String(n).split('').map((d) => SUP[d]).join('');

/** "1s2 2p6" -> [{n,l,e}] */
function parseConfig(cfg) {
  const out = [];
  for (const tok of cfg.trim().split(/\s+/)) {
    if (tok.startsWith('[')) continue;
    const m = /^(\d)([spdf])(\d+)$/.exec(tok);
    if (!m) throw new Error(`bad config token "${tok}" in "${cfg}"`);
    out.push({ n: +m[1], l: m[2], e: +m[3] });
  }
  return out;
}

/** Expand a condensed config into a full subshell list, sorted by n then l. */
function expand(cfg) {
  const parts = [];
  const m = /^\[(\w+)\]/.exec(cfg.trim());
  if (m) {
    if (!CORE[m[1]]) throw new Error(`unknown noble gas core ${m[1]}`);
    parts.push(...parseConfig(CORE[m[1]]));
    parts.push(...parseConfig(cfg.trim().replace(/^\[\w+\]\s*/, '')));
  } else {
    parts.push(...parseConfig(cfg));
  }
  parts.sort((a, b) => a.n - b.n || ORDERS[a.l] - ORDERS[b.l]);
  return parts;
}

const configString = (parts) =>
  parts.filter((p) => p.e > 0).map((p) => `${p.n}${p.l}${toSup(p.e)}`).join(' ');

const electronCount = (parts) => parts.reduce((a, p) => a + p.e, 0);

/* ------------------------------------------------------------------ */
/* Isotopes                                                            */
/* ------------------------------------------------------------------ */

function buildIsotopes(z) {
  const nist = NIST[z];
  const overrides = RADIO_ONLY[z];
  let list;
  if (overrides) {
    list = overrides.map((A) => ({ A, abundance: 0, stable: false }));
  } else {
    const withAb = nist.isotopes.filter((i) => i.abundance !== null && i.abundance > 0);
    const sum = withAb.reduce((a, b) => a + b.abundance, 0);
    // NIST prints the isotopic composition as a fraction for some elements and as a
    // percentage for others; the total tells us which one this element uses.
    const scale = Math.abs(sum - 1) < 0.02 ? 100 : 1;
    const natural = withAb.map((i) => ({ A: i.A, abundance: round6(i.abundance * scale) }));
    let kept = natural.length > 8
      ? [...natural].sort((a, b) => b.abundance - a.abundance).slice(0, 8)
      : natural;
    for (const A of RADIO_SUPPLEMENTS[z] || []) {
      if (kept.length >= 3) break;
      if (kept.some((k) => k.A === A)) continue;
      kept.push({ A, abundance: 0, stable: false });
    }
    list = kept;
  }
  list.sort((a, b) => a.A - b.A);
  return list.map((i) => ({
    massNumber: i.A,
    abundance: round6(i.abundance),
    stable: i.abundance > 0 && !OBSERVATIONALLY_RADIOACTIVE[`${z}:${i.A}`],
  }));
}

const round6 = (n) => (n === null || n === undefined ? n : Math.round(n * 1e6) / 1e6);

function naturalIsotopeCount(z) {
  const nist = NIST[z];
  return nist.isotopes.filter((i) => i.abundance !== null && i.abundance > 0).length;
}

/* ------------------------------------------------------------------ */
/* Elements                                                            */
/* ------------------------------------------------------------------ */

const C = {
  symbol: 0, name: 1, mass: 2, massMost: 3, period: 4, group: 5, block: 6, category: 7,
  phase: 8, melt: 9, boil: 10, density: 11, ie: 12, ea: 13, en: 14, radius: 15,
  ox: 16, flame: 17, year: 18, by: 19, uses: 20, hazards: 21, summary: 22, cfg: 23,
};

const GENERATED_AT = '2026-02-14T00:00:00.000Z';
const SOURCES = [
  'IUPAC/CIAAW standard atomic weights (2021 conventional values)',
  'NIST Atomic Weights and Isotopic Compositions (isotopic abundances, per isotope)',
  'CRC Handbook of Chemistry and Physics / NIST for ionization energies, electron affinities, melting and boiling points',
  'J. C. Slater, J. Chem. Phys. 41, 3199 (1964) for empirical atomic radii',
  'Bowserinator/Periodic-Table-JSON (MIT) as a cross-check for electron configurations and physical constants',
].join('; ');

const elements = RAW.map((row, i) => {
  const z = i + 1;
  if (row.length !== 24) throw new Error(`${row[0]}: expected 24 columns, got ${row.length}`);
  const parts = expand(row[C.cfg]);
  const n = electronCount(parts);
  if (n !== z) throw new Error(`${row[C.symbol]}: config has ${n} electrons, expected ${z}`);
  // Valence electrons = the electrons of the subshells that the block occupies:
  // s block -> ns, p block -> ns + np, d block -> (n-1)d + ns,
  // f block -> (n-2)f + (n-1)d + ns. Filled f14 shells are therefore never counted,
  // which keeps Au at 11, Lu and Lr at 3 and U at 6.
  const period = row[C.period];
  const block = row[C.block];
  const wanted = block === 's' ? [`${period}s`]
    : block === 'p' ? [`${period}s`, `${period}p`]
    : block === 'd' ? [`${period - 1}d`, `${period}s`]
    : [`${period - 2}f`, `${period - 1}d`, `${period}s`];
  const valence = parts.filter((p) => wanted.includes(`${p.n}${p.l}`)).reduce((a, p) => a + p.e, 0);
  if (valence < 1 || valence > 18) throw new Error(`${row[C.symbol]}: bad valence electron count ${valence}`);
  return {
    atomicNumber: z,
    symbol: row[C.symbol],
    name: row[C.name],
    atomicMass: row[C.mass],
    massNumberOfMostStable: row[C.mass] === null ? row[C.massMost] : null,
    period: row[C.period],
    group: row[C.group],
    block: row[C.block],
    category: row[C.category],
    phase: row[C.phase],
    electronConfiguration: configString(parts),
    nobleGasConfiguration: row[C.cfg].startsWith('[') ? row[C.cfg].replace(/([spdf])(\d+)/g, (m, l, d) => l + toSup(+d)) : null,
    valenceElectrons: valence,
    electronegativity: row[C.en],
    atomicRadiusPm: row[C.radius],
    meltingPointK: row[C.melt],
    boilingPointK: row[C.boil],
    densityGcm3: row[C.density],
    ionizationEnergyEv: row[C.ie],
    electronAffinityKjMol: row[C.ea],
    isotopeCount: naturalIsotopeCount(z),
    isotopes: buildIsotopes(z),
    discoveryYear: row[C.year],
    discoverer: row[C.by],
    uses: row[C.uses],
    hazards: row[C.hazards],
    summary: row[C.summary],
    flameTestColor: row[C.flame],
    oxidationStates: row[C.ox],
    imageUrl: null,
    imageCredit: null,
  };
});

function coreOf(cfg) {
  const m = /^\[(\w+)\]/.exec(cfg.trim());
  return m ? m[1] : '';
}

/* ------------------------------------------------------------------ */
/* Ions                                                                */
/* ------------------------------------------------------------------ */

const ELECTRON_MASS = 0.00054858; // u
const ELEMENT_BY_SYMBOL = new Map(elements.map((e) => [e.symbol, e]));

/** Build the ion subshell list by stripping |charge| electrons from the outer shells. */
function ionParts(atomicNumber, charge) {
  const el = elements[atomicNumber - 1];
  const plain = fromSup(el.nobleGasConfiguration || el.electronConfiguration);
  const parts = expand(plain);
  // A cation loses its outermost electrons first, highest n then highest l, so
  // Fe3+ is 3d5 rather than 4s0 3d3. An anion instead completes its valence
  // subshell, so P3- is 3p6 and Rb- is 5s2.
  const sorted = [...parts].sort((a, b) => (charge < 0 ? 1 : -1) * (a.n - b.n || ORDERS[a.l] - ORDERS[b.l]));
  let remaining = Math.abs(charge);
  for (const p of sorted) {
    if (remaining === 0) break;
    if (charge > 0) {
      const take = Math.min(p.e, remaining);
      p.e -= take;
      remaining -= take;
    } else {
      const room = 2 * (2 * ORDERS[p.l] + 1) - p.e; // s2 p6 d10 f14
      const take = Math.min(room, remaining);
      p.e += take;
      remaining -= take;
    }
  }
  if (remaining !== 0) throw new Error(`cannot apply charge ${charge} to ${el.symbol}`);
  return parts;
}

const fromSup = (s) => s.replace(/[\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079]/g, (c) => Object.keys(SUP).find((d) => SUP[d] === c));

const SUBSCRIPT = { 0: '\u2080', 1: '\u2081', 2: '\u2082', 3: '\u2083', 4: '\u2084', 5: '\u2085', 6: '\u2086', 7: '\u2087', 8: '\u2088', 9: '\u2089' };
const toSub = (n) => String(n).split('').map((d) => SUBSCRIPT[d]).join('');
const CHARGE_SUP = { '-1': '\u00b9\u207b', '-2': '\u00b2\u207b', '-3': '\u00b3\u207b', '-4': '\u2074\u207b', 1: '\u00b9', 2: '\u00b2', 3: '\u00b3', 4: '\u2074' };
const chargeSuffix = (q) => CHARGE_SUP[String(q)] || '';
const plainConfig = (parts) => parts.filter((p) => p.e > 0).map((p) => `${p.n}${p.l}${p.e}`).join(' ');

const MONATOMIC = [
  // [symbol, charge, phase, about]
  ['H', 1, 'unknown', 'A bare proton, H+, is what is actually solvated in acid solutions; it makes the surrounding water molecules hydronium, H3O+.'],
  ['H', -1, 'unknown', 'The hydride ion, H-, is a strong base that exists in metal hydrides, in ammonia and in borohydride salts.'],
  ['Li', 1, 'unknown', 'The lithium ion gives lithium batteries their charge; it is small enough to tunnel between layers in a solid electrode.'],
  ['Na', 1, 'unknown', 'The sodium ion is the main cation of seawater and of blood plasma, and it gives up its electron at a sodium battery anode.'],
  ['K', 1, 'unknown', 'The potassium ion is essential for nerves and muscles, and it is what a potassium channel lets through the cell membrane.'],
  ['Rb', -1, 'unknown', 'The rubidium ion is a weakly coordinating anion, so its salts are used when a very unreactive counter-ion is needed.'],
  ['Cs', 1, 'unknown', 'The caesium ion is a weakly coordinating cation used to pair with very reactive anions.'],
  ['Be', 2, 'unknown', 'Be2+ is extremely small, strongly polarising and toxic; it hydrolyses water and turns solutions acidic.'],
  ['Mg', 2, 'unknown', 'Mg2+ is the second most abundant cation in seawater and a cofactor of every ATP molecule in the body.'],
  ['Ca', 2, 'unknown', 'Ca2+ hardens water, sets the firmness of bone, and triggers muscle contraction and the clotting cascade.'],
  ['Sr', 2, 'unknown', 'Sr2+ is a heavy, water-loving cation used in fireworks and in strontium ranelate for osteoporosis.'],
  ['Ba', 2, 'unknown', 'Ba2+ is a heavy alkaline earth cation; its insoluble sulfate is safe to drink while the carbonate is a poison.'],
  ['Al', 3, 'unknown', 'Al3+ is the hydrated cation of weakly acidic and basic solutions. Its very small radius polarises water strongly, so aluminium hydroxide is amphoteric and alumina is hard and unreactive.'],
  ['Ga', 3, 'unknown', 'Ga3+ is the stable oxidation state of gallium, and its amphoteric hydroxide dissolves in both acid and alkali.'],
  ['In', 3, 'unknown', 'In3+ forms stable salts in acid solution, but indium compounds should be handled with care.'],
  ['F', -1, 'unknown', 'The fluoride ion is the hardest anion and is a weak base; it protects teeth in toothpaste and is a trace element in the body.'],
  ['Cl', -1, 'unknown', 'The chloride ion is the counter-ion of stomach acid and the main anion of seawater; it is the active ingredient of table salt.'],
  ['Br', -1, 'unknown', 'The bromide ion is a weaker nucleophile than chloride and is used in flame retardants and bromide photographic film.'],
  ['I', -1, 'unknown', 'The iodide ion is a good reducing agent, so iodide starch paper turns blue with oxidising agents.'],
  ['N', -3, 'unknown', 'The nitride ion, N3-, exists in magnesium nitride and in molten alkali metal nitrides; it reacts violently with water.'],
  ['O', -2, 'unknown', 'The oxide ion is the most common anion in the crust, forming the lattices of silicates, oxides and hydroxides.'],
  ['S', -2, 'unknown', 'The sulfide ion smells of rotten eggs when it is protonated, and it precipitates black metal sulfides in qualitative analysis.'],
  ['Se', -2, 'unknown', 'The selenide ion forms in alkaline selenide solutions and precipitates metal selenides used in photocells.'],
  ['P', -3, 'unknown', 'The phosphide ion occurs in phosphide metals such as iron phosphide, and it is very reactive towards water.'],
  ['Ti', 4, 'unknown', 'Ti4+ is the oxidation state of titanium dioxide, the white pigment that makes paint and sunscreen opaque.'],
  ['Cr', 2, 'unknown', 'Cr2+ is a strong reducing agent in solution and is easily oxidised to the blue Cr3+ ion.'],
  ['Cr', 3, 'unknown', 'Cr3+ is the green ion of chrome alum and the oxidation state that gives ruby and emerald their colour.'],
  ['Mn', 2, 'unknown', 'Mn2+ is a pale pink ion; its permanganate oxidation state, +7, is the one that is brightly coloured.'],
  ['Fe', 2, 'unknown', 'Fe2+ is the iron in haemoglobin that carries oxygen, and it is the ion written in the iron redox chemistry of soils.'],
  ['Fe', 3, 'unknown', 'Fe3+ is the iron in haemoglobin when it is oxidised, and it is what turns rust solutions yellow-brown.'],
  ['Co', 2, 'unknown', 'Co2+ gives pink solutions, and it is the ion used in the oxygen carrier of artificial blood substitutes.'],
  ['Ni', 2, 'unknown', 'Ni2+ is green in solution and is oxidised to Ni3+ in a nickel-cadmium cell or a nickel half-cell.'],
  ['Cu', 1, 'unknown', 'Cu+ is a soft, linear-coordinating ion that disproportionates in water to copper metal and Cu2+.'],
  ['Cu', 2, 'unknown', 'Cu2+ is the blue ion of copper sulfate; it catalyses hydrogen peroxide breakdown and gives a green flame.'],
  ['Zn', 2, 'unknown', 'Zn2+ is a d10 ion, always colourless in solution, and the active centre of hundreds of enzymes.'],
  ['Ag', 1, 'unknown', 'Ag+ is precipitated as white silver chloride or yellow silver iodide, which is why halide tests turn cloudy.'],
  ['Cd', 2, 'unknown', 'Cd2+ is a d10 ion like Zn2+ and behaves similarly, but it is far more toxic and softer.'],
  ['Hg', 2, 'unknown', 'Hg2+ is a very soft cation that binds thiol groups on proteins, which is the basis of mercury poisoning.'],
  ['Sn', 2, 'unknown', 'Sn2+ is the reducing half of the tin to Sn2+ system, used in tin plating and in the reduction of nitro compounds.'],
  ['Sn', 4, 'unknown', 'Sn4+ is the oxidising half of the same couple, and it forms the basis of the tin system in pH buffers.'],
  ['Pb', 2, 'unknown', 'Pb2+ is the toxic cation in lead water pipes and paint; it mimics calcium and accumulates in bone.'],
  ['Pb', 4, 'unknown', 'Pb4+ is a strong oxidising agent in acidic solution and is used to oxidise alcohols and carboxylic acids.'],
  ['Tl', 3, 'unknown', 'Tl3+ is a soft, strongly oxidising cation that also forms inert-pair Tl(I) compounds.'],
];

const POLYATOMIC = [
  // [formula (plain), unicode formula, name, charge, centralSymbol, about, atoms for mass]
  ['NH4+', 'NH\u2084\u207a', 'Ammonium', 1, 'N', 'The ammonium ion, formed when ammonia dissolves in water; it is the counter-ion of almost all ammonium salts and neutralises acid in plant roots.', { N: 1, H: 4 }],
  ['H3O+', 'H\u2083O\u207a', 'Hydronium', 1, 'O', 'The hydronium ion is the real cation of any acid solution: when HCl dissolves, the proton attaches itself to a water molecule.', { H: 3, O: 1 }],
  ['OH-', 'OH\u207b', 'Hydroxide', -1, 'O', 'The hydroxide ion is what makes alkalis alkaline. It is a strong nucleophile and a strong base.', { O: 1, H: 1 }],
  ['NO3-', 'NO\u2083\u207b', 'Nitrate', -1, 'N', 'A very stable, soluble anion. Nitrate pollution from fertiliser run-off causes algal blooms in rivers and lakes.', { N: 1, O: 3 }],
  ['NO2-', 'NO\u2082\u207b', 'Nitrite', -1, 'N', 'A reducing anion and a preservative in cured meats; it is toxic and can be written as NO in atmospheric chemistry.', { N: 1, O: 2 }],
  ['SO4^2-', 'SO\u2084\u00b2\u207b', 'Sulfate', -2, 'S', 'The sulfate ion is one of the two common anions of natural waters and the main charge carrier in lead-acid batteries.', { S: 1, O: 4 }],
  ['HSO4-', 'HSO\u2084\u207b', 'Hydrogen sulfate', -1, 'S', 'Hydrogen sulfate is the acid form of sulfate, present once strong acid is added to a sulfate solution.', { S: 1, O: 4, H: 1 }],
  ['SO3^2-', 'SO\u2083\u00b2\u207b', 'Sulfite', -2, 'S', 'Sulfite is the ion that removes sulphur dioxide from flue gases; it is a mild reducing agent and bleaches dye.', { S: 1, O: 3 }],
  ['CO3^2-', 'CO\u2083\u00b2\u207b', 'Carbonate', -2, 'C', 'The carbonate ion is the conjugate base of bicarbonate and is the main alkalinity of the ocean and of limestone.', { C: 1, O: 3 }],
  ['HCO3-', 'HCO\u2083\u207b', 'Bicarbonate (hydrogen carbonate)', -1, 'C', 'Bicarbonate is the buffer system that keeps blood pH near 7.4 and the main ion in baking soda.', { C: 1, O: 3, H: 1 }],
  ['PO4^3-', 'PO\u2084\u00b3\u207b', 'Phosphate', -3, 'P', 'The phosphate ion links the DNA backbone and carries energy as ATP; phosphates are the main fertiliser nutrient for plants.', { P: 1, O: 4 }],
  ['HPO4^2-', 'HPO\u2084\u00b2\u207b', 'Hydrogen phosphate', -2, 'P', 'Hydrogen phosphate is the dominant phosphate species at neutral pH and is found in the phosphate buffer of biology.', { P: 1, O: 4, H: 1 }],
  ['H2PO4-', 'H\u2082PO\u2084\u207b', 'Dihydrogen phosphate', -1, 'P', 'Dihydrogen phosphate is the acidic form, used as a food acidulant and as a component of phosphate buffer solutions.', { P: 1, O: 4, H: 2 }],
  ['H2PO3-', 'H\u2082PO\u2083\u207b', 'Dihydrogen phosphite', -1, 'P', 'Phosphite is the reduced, diprotic form of phosphorous acid and is a preservative in foods and a reductant.', { P: 1, O: 3, H: 2 }],
  ['CN-', 'CN\u207b', 'Cyanide', -1, 'C', 'Cyanide is one of the fastest acting poisons, because it blocks cellular respiration by binding iron in cytochrome oxidase.', { C: 1, N: 1 }],
  ['SCN-', 'SCN\u207b', 'Thiocyanate', -1, 'S', 'Thiocyanate turns blood red in the Fe3+ test, and its oxidation to thiocyanogen is used in iodine titrations.', { S: 1, C: 1, N: 1 }],
  ['ClO3-', 'ClO\u2083\u207b', 'Chlorate', -1, 'Cl', 'Chlorate is a powerful oxidising agent and forms in water treatment; it is also the basis of safety matches.', { Cl: 1, O: 3 }],
  ['ClO4-', 'ClO\u2084\u207b', 'Perchlorate', -1, 'Cl', 'Perchlorate is a very weak base and a strong oxidiser at high temperature; it is soluble and mobile in groundwater.', { Cl: 1, O: 4 }],
  ['ClO-', 'ClO\u207b', 'Hypochlorite', -1, 'Cl', 'The ion in household bleach and chlorinated pools. It bleaches because it is nucleophilic and oxidising at the same time.', { Cl: 1, O: 1 }],
  ['CrO4^2-', 'CrO\u2084\u00b2\u207b', 'Chromate', -2, 'Cr', 'Chromate is yellow and turns orange dichromate when acid is added, the classic indicator colour change in titration.', { Cr: 1, O: 4 }],
  ['MnO4-', 'MnO\u2084\u207b', 'Permanganate', -1, 'Mn', 'Permanganate is the intense purple titrant of acid-base and redox titrations, and it is a useful test for oxidising agents.', { Mn: 1, O: 4 }],
  ['C2H3O2-', 'C\u2082H\u2083O\u2082\u207b', 'Acetate', -1, 'C', 'The acetate ion is the conjugate base of ethanoic acid; it buffers acetic acid solutions and is the ion in vinegar and in acetate buffers.', { C: 2, H: 3, O: 2 }],
  ['C6H5O-', 'C\u2086H\u2085O\u207b', 'Phenoxide', -1, 'C', 'Phenoxide is the ion released by phenol in base, and its sodium salt is one of the simplest aromatic nucleophiles.', { C: 6, H: 5, O: 1 }],
];

const ions = [];
const seenIon = new Set();
function pushIon(ion) {
  if (seenIon.has(ion.id)) throw new Error(`duplicate ion id ${ion.id}`);
  seenIon.add(ion.id);
  ions.push(ion);
}

for (const [symbol, charge, , about] of MONATOMIC) {
  const el = ELEMENT_BY_SYMBOL.get(symbol);
  if (!el) throw new Error(`unknown element ${symbol}`);
  const z = el.atomicNumber;
  const electrons = z - charge;
  const parts = ionParts(z, charge);
  const cfgCount = parts.reduce((a, p) => a + p.e, 0);
  if (cfgCount !== electrons) throw new Error(`${symbol}${charge}: config has ${cfgCount} electrons, expected ${electrons}`);
  pushIon({
    id: `${symbol}-${charge > 0 ? '+' + charge : charge}`,
    elementSymbol: symbol,
    atomicNumber: z,
    charge,
    subscript: 1,
    formula: `${symbol}${chargeSuffix(charge)}`,
    name: null,
    type: charge > 0 ? 'cation' : 'anion',
    netCharge: charge,
    protons: z,
    electrons,
    averageMass: el.atomicMass === null ? null : round6(el.atomicMass - charge * ELECTRON_MASS),
    electronConfiguration: electrons === 0 ? null : configString(parts),
    configPlain: electrons === 0 ? null : plainConfig(parts),
    phase: 'unknown',
    flameTestColor: el.flameTestColor,
    about,
  });
}

for (const [plain, formula, name, charge, elementSymbol, about, atoms] of POLYATOMIC) {
  const protons = Object.entries(atoms).reduce((a, [s, n]) => a + n * ELEMENT_BY_SYMBOL.get(s).atomicNumber, 0);
  const mass = Object.entries(atoms).reduce((a, [s, n]) => a + n * ELEMENT_BY_SYMBOL.get(s).atomicMass, 0);
  const electrons = protons - charge;
  pushIon({
    id: plain,
    elementSymbol,
    atomicNumber: protons,
    charge,
    subscript: 1,
    formula,
    name,
    type: 'polyatomic',
    netCharge: charge,
    protons,
    electrons,
    averageMass: round6(mass - charge * ELECTRON_MASS),
    electronConfiguration: null,
    configPlain: null,
    phase: 'unknown',
    flameTestColor: null,
    about,
  });
}

/* ------------------------------------------------------------------ */
/* Solubility rules                                                    */
/* ------------------------------------------------------------------ */

const RULES = [
  ['Li+', 'Li+', 'cation', 'All group 1 metal cations form soluble compounds', null, 'soluble', 'Li2CO3 is the least soluble of the group 1 carbonates'],
  ['Na+', 'Na+', 'cation', 'All group 1 metal cations form soluble compounds', null, 'soluble', 'The only common exception is insoluble sodium magnesium carbonate in cold concentrated solution'],
  ['K+', 'K+', 'cation', 'All group 1 metal cations form soluble compounds', null, 'soluble', null],
  ['Rb+', 'Rb+', 'cation', 'All group 1 metal cations form soluble compounds', null, 'soluble', null],
  ['Cs+', 'Cs+', 'cation', 'All group 1 metal cations form soluble compounds', null, 'soluble', null],
  ['NH4+', 'NH4+', 'cation', 'All ammonium salts are soluble in water', null, 'soluble', null],
  ['Be2+', 'Be2+', 'cation', 'Beryllium compounds are soluble but Be2+ hydrolyses water and turns solutions acidic', null, 'soluble', 'Be(OH)2 is insoluble, so strongly basic solutions give a white precipitate'],
  ['Mg2+', 'Mg2+', 'cation', 'Most magnesium salts are soluble', null, 'soluble', 'Magnesium hydroxide is only slightly soluble'],
  ['Ca2+', 'Ca2+', 'cation', 'Most calcium salts are soluble, including the chloride, nitrate and sulfate', null, 'soluble', 'Calcium carbonate, phosphate, sulfite, hydroxide and oxalate are insoluble'],
  ['Sr2+', 'Sr2+', 'cation', 'Most strontium salts are soluble', null, 'soluble', 'Strontium carbonate, phosphate, sulfate and hydroxide are insoluble or slightly soluble'],
  ['Ba2+', 'Ba2+', 'cation', 'Most barium salts are soluble', null, 'soluble', 'Barium sulfate and barium carbonate are insoluble, which is why barium meals show up on X-rays'],
  ['NO3-', 'NO3-', 'anion', 'All nitrates are soluble in water', null, 'soluble', 'Nitrates are the most soluble group of salts'],
  ['NO2-', 'NO2-', 'anion', 'All nitrites are soluble in water', null, 'soluble', null],
  ['C2H3O2-', 'C2H3O2-', 'anion', 'All acetates are soluble in water', null, 'soluble', 'Silver and mercury acetates are only slightly soluble'],
  ['ClO3-', 'ClO3-', 'anion', 'All chlorates are soluble in water', null, 'soluble', 'Potassium chlorate is only sparingly soluble in cold water'],
  ['ClO4-', 'ClO4-', 'anion', 'All perchlorates are soluble in water', null, 'soluble', null],
  ['CN-', 'CN-', 'anion', 'All cyanides are soluble in water', null, 'soluble', 'Heavy metal cyanides such as AgCN and CuCN are insoluble'],
  ['SCN-', 'SCN-', 'anion', 'Most thiocyanates are soluble', 'exceptions: Ag⁺, Pb²⁺, Hg²⁺', 'soluble', 'Silver thiocyanate is insoluble'],
  ['SO4^2-', 'SO4^2-', 'anion', 'Most sulfates are soluble in water', 'exceptions: Ba²⁺, Sr²⁺, Pb²⁺, Ca²⁺, Ag⁺', 'soluble', 'Barium sulfate is so insoluble it stays white in the stomach and shows on an X-ray'],
  ['SO3^2-', 'SO3^2-', 'anion', 'Sulfites of the group 1 metals and ammonium are soluble; most other sulfites are not', 'exceptions: group 1 and NH₄⁺', 'reacts', 'Sulfites decompose in acid, releasing sulphur dioxide gas'],
  ['HSO4-', 'HSO4-', 'anion', 'Hydrogen sulfate is soluble and is the acidic form of sulfate', null, 'soluble', 'Converts to sulfate when the solution is made alkaline'],
  ['Cl-', 'Cl-', 'anion', 'Most chlorides are soluble in water', 'exceptions: Ag⁺, Pb²⁺, Hg₂²⁺', 'soluble', 'Silver chloride precipitates white and dissolves in ammonia'],
  ['Br-', 'Br-', 'anion', 'Most bromides are soluble in water', 'exceptions: Ag⁺, Pb²⁺, Hg₂²⁺', 'soluble', 'Silver bromide is a pale yellow precipitate used in photographic film'],
  ['I-', 'I-', 'anion', 'Most iodides are soluble in water', 'exceptions: Ag⁺, Pb²⁺, Hg₂²⁺, Cu²⁺', 'soluble', 'Silver iodide is yellow and insoluble even in ammonia'],
  ['F-', 'F-', 'anion', 'Most fluorides are soluble, but the alkaline earth and lead fluorides are not', 'exceptions: Ca²⁺, Sr²⁺, Ba²⁺, Pb²⁺', 'soluble', 'Barium fluoride is sparingly soluble and is used in toothpaste'],
  ['OH-', 'OH-', 'anion', 'Most hydroxides are insoluble', 'exceptions: group 1 and NH₄⁺, slightly soluble Sr²⁺ and Ba²⁺', 'insoluble', 'Group 1 hydroxides are strong bases, so they dissolve freely'],
  ['S^2-', 'S^2-', 'anion', 'Most sulfides are insoluble', 'exceptions: group 1, NH₄⁺ and several heavy transition metals', 'reacts', 'Sulfides of the group 1 metals react with water to give hydrogen sulfide'],
  ['CO3^2-', 'CO3^2-', 'anion', 'Most carbonates are insoluble', 'exceptions: group 1 and NH₄⁺', 'insoluble', 'Carbonate reacts with acid to give the fizzing carbon dioxide test'],
  ['HCO3-', 'HCO3-', 'anion', 'Bicarbonates dissolve only as their dissolved solid, so the ion is stable in solution but unstable as a salt', null, 'soluble', 'Heating bicarbonate gives the carbonate, water and carbon dioxide'],
  ['PO4^3-', 'PO4^3-', 'anion', 'Most phosphates are insoluble', 'exceptions: group 1 and NH₄⁺', 'insoluble', 'Phosphate is the main nutrient in bone and tooth enamel'],
  ['HPO4^2-', 'HPO4^2-', 'anion', 'Hydrogen phosphate salts are mostly insoluble', 'exceptions: group 1 and NH₄⁺', 'insoluble', 'This is the dominant phosphate species at neutral pH'],
  ['H2PO4-', 'H2PO4-', 'anion', 'Dihydrogen phosphate salts are soluble in water', null, 'soluble', 'The acid form of phosphate, used in food and buffers'],
  ['AsO4^3-', 'AsO4^3-', 'anion', 'Arsenates mostly follow the phosphate rules', 'exceptions: group 1 and NH₄⁺', 'insoluble', 'Silver arsenate is a chocolate brown precipitate used in the Marsh test'],
  ['C2O4^2-', 'C2O4^2-', 'anion', 'Most oxalates are insoluble or slightly soluble', 'exceptions: group 1, NH₄⁺; Ca²⁺ is slightly soluble', 'insoluble', 'Calcium oxalate is the insoluble core of many kidney stones'],
  ['CrO4^2-', 'CrO4^2-', 'anion', 'Most chromates are insoluble', 'exceptions: group 1 and NH₄⁺', 'insoluble', 'Silver chromate is brick red and changes to dichromate in acid'],
  ['Cr2O7^2-', 'Cr2O7^2-', 'anion', 'Dichromates are mostly soluble', null, 'soluble', 'Chromate and dichromate interconvert in acid and alkali'],
  ['IO3-', 'IO3-', 'anion', 'Most iodates are insoluble', 'exceptions: group 1 and NH₄⁺', 'insoluble', 'Silver iodate is a white precipitate'],
  ['MnO4-', 'MnO4-', 'anion', 'Potassium and sodium permanganate are soluble', 'exceptions: BaMnO₄ and Ca(MnO₄)₂', 'soluble', 'The ion is deeply purple and self indicating in titrations'],
  ['BO3^3-', 'BO3^3-', 'anion', 'Borates of the group 1 metals and ammonium are soluble', 'exceptions: Ca²⁺, Sr²⁺, Ba²⁺, Pb²⁺', 'soluble', 'Boric acid is a weak acid that acts as a Lewis acid'],
  ['SiO3^2-', 'SiO3^2-', 'anion', 'Most silicates are insoluble', 'exceptions: group 1 and NH₄⁺', 'insoluble', 'Water glass is sodium silicate solution, and silica is a very weak acid'],
  ['S2O3^2-', 'S2O3^2-', 'anion', 'Thiosulfates of the group 1 metals and ammonium are soluble', null, 'soluble', 'Decomposes slowly to give a yellow sulphur precipitate'],
  ['C6H5O-', 'C6H5O-', 'anion', 'Most phenoxides are soluble in water', 'exceptions: several heavy metal cations', 'soluble', 'Phenoxide is a much weaker base than hydroxide'],
];

const solubility = RULES.map(([ionFormula, ionPlain, kind, rule, exceptions, outcome, note]) => ({
  ionFormula,
  ionPlain,
  kind,
  rule,
  exceptions,
  outcome,
  note,
}));

/* ------------------------------------------------------------------ */
/* Write                                                               */
/* ------------------------------------------------------------------ */

const META_COMMON = {
  generatedAt: GENERATED_AT,
  schema: 'Zperiod data layer v1 (src/types/chem.ts)',
};

const elementsDoc = {
  _meta: {
    ...META_COMMON,
    source: SOURCES,
    electronAffinityConvention: 'positive = energy released (kJ/mol), e.g. H 72.77, O 140.98, Cl 348.58, F 328.16. Negative values mean electron capture is endothermic or unbound.',
    electronConfigurationConvention: 'Subshells are written in ascending n then l order (so 3d comes before 4s), matching the condensed noble-gas form. Exponents use unicode superscripts.',
    radiusConvention: 'Empirical atomic radius from J. C. Slater, J. Chem. Phys. 41, 3199 (1964), in picometres, for every element that Slater tabulates. The six noble gases have no measured atomic radius, so they carry the standard van der Waals radius instead (He 140, Ne 154, Ar 188, Kr 202, Xe 216, Rn 220). At (85) and every element from Cm (96) to Og (118) has no tabulated radius and is null.',
    densityConvention: 'Density of the solid or liquid phase at STP (0 degC, 1 atm) in g/cm3. Gases use the density of the gas at STP. Carbon sublimes, so its density is that of graphite.',
    atomicMassConvention: 'Conventional IUPAC/CIAAW standard atomic weight. Elements with no stable isotope and no defined value (Tc, Pm, and Np to Og) use null, with massNumberOfMostStable holding the A of the longest-lived isotope. For Po, At, Rn, Fr, Ra and Ac the CIAAW bracketed value (mass number of the longest-lived isotope) is used as atomicMass.',
    predictedValues: 'For Z >= 104 every physical constant is a theoretical prediction: meltingPointK, boilingPointK and densityGcm3 are estimates, ionizationEnergyEv is calculated, electronegativity and electronAffinityKjMol are null, and meltingPointK/boilingPointK/densityGcm3 are null where no credible prediction exists.',
    imageConvention: 'imageUrl and imageCredit are null for every element: no Wikimedia Commons file URL could be verified at build time and a broken image is worse than no image. The UI should render generated portraits (electron shells, Jonteol or CPK colour) instead.',
    notes: [
      'Lr is given the traditional 5f14 6d1 7s2 configuration so that its block stays "d" and matches Lu.',
      'At (85) and Ts (117) are categorised as halogens so that IUPAC group 17 stays internally consistent.',
      'Np (93) to Lr (103) are listed as gases at STP, as required by the product spec; the actinide metals are predicted to be gaseous at 0 degC.',
      'Og (118) phase is "unknown" because it may be a liquid or a gas at STP.',
      'Fr electronegativity uses the contested conventional value 0.7.',
      'Isotopes: 3-8 entries per element. Where an element has more than 8 naturally occurring isotopes the 8 most abundant are listed, so the listed abundances can sum to slightly less than 100 % (Sn, Xe, Ce, Nd, Sm, Gd). Use isotopeCount for the true number of natural isotopes.',
      'Isotopes with stable: false are radioactive even when they occur naturally: K-40, V-50, Rb-87, Cd-113, In-115, La-138, Sm-147, Lu-176, Ta-180, Re-187, Pt-190, Bi-209 and the Th/U decay chain. These are the primordial radionuclides whose decay has been measured.',
      'Og (118) lists only Og-294, the single isotope ever observed; every other element lists at least three real isotopes.',
    ],
  },
  elements,
};

const ionsDoc = {
  _meta: {
    ...META_COMMON,
    source: 'Protons, electrons and configurations derived from elements.json plus standard ion chemistry; average masses from the IUPAC standard atomic weights.',
    electronConfigurationConvention: 'Full configuration of the ion with subshells in ascending n then l order. Electrons are removed from the highest n first, so Fe3+ is 1s2 2s2 2p6 3s2 3p6 3d5. configPlain is the same string with ASCII digits.',
    polyatomicConvention: 'For polyatomic ions atomicNumber equals protons (the sum of the constituent atomic numbers) because a single element symbol cannot describe them. electronConfiguration and configPlain are null because a polyatomic ion has no single atomic configuration. phase is "unknown" because these ions exist only in solution.',
    averageMassConvention: 'Sum of the constituent average atomic masses minus 0.00054858 u per positive charge (electron mass).',
  },
  ions,
};

const solubilityDoc = {
  _meta: {
    ...META_COMMON,
    source: 'Standard aqueous solubility rules for high school general chemistry (Opus 15 / Atkins style solubility table).',
    ionPlainConvention: 'ionPlain is the ASCII form the solubility UI parses, e.g. "SO4^2-", "OH-", "NH4+". ionFormula is the display form with unicode superscripts.',
  },
  rules: solubility,
};

fs.mkdirSync(path.join(ROOT, 'src/data'), { recursive: true });
const write = (name, doc) => {
  const p = path.join(ROOT, 'src/data', name);
  fs.writeFileSync(p, JSON.stringify(doc, null, 2) + '\n');
  console.log(name, fs.statSync(p).size, 'bytes');
};
write('elements.json', elementsDoc);
write('ions.json', ionsDoc);
write('solubility.json', solubilityDoc);
console.log('elements', elements.length, 'ions', ions.length, 'solubility rules', solubility.length);
