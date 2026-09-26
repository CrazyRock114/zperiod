// ====================================================================
// data.js — load 118-element dataset + periodic table layout map
// Pure ESM module, no side effects beyond cache.
// ====================================================================

import elementsData from '../data/elements.json';

let _cache = null;
let _bySymbol = null;

export async function loadElements() {
  if (_cache) return _cache;
  _cache = elementsData;
  _bySymbol = {};
  for (const el of Object.values(_cache)) {
    _bySymbol[el.symbol] = el;
  }
  return _cache;
}

export function getById(id) {
  if (!_cache) throw new Error('Elements not loaded yet — call loadElements() first');
  return _cache[id];
}

export function getBySymbol(symbol) {
  if (!_cache) throw new Error('Elements not loaded yet — call loadElements() first');
  return _bySymbol[symbol];
}

export function getAllElements() {
  if (!_cache) throw new Error('Elements not loaded yet — call loadElements() first');
  return Object.values(_cache);
}

// ====================================================================
// Periodic table layout — maps (period, group) to element id
// Returns { grid: Map<"row,col", id>, lanthanideIndicator, actinideIndicator }
// grid uses row 1..10, col 1..18 (CSS grid, 1-indexed).
// ====================================================================

// Lanthanides 57..71 → row 9, col 3..17
const LANTHANIDE_IDS = [57,58,59,60,61,62,63,64,65,66,67,68,69,70,71];
// Actinides 89..103 → row 10, col 3..17
const ACTINIDE_IDS = [89,90,91,92,93,94,95,96,97,98,99,100,101,102,103];

export function buildLayout() {
  const grid = new Map();
  // Period 1: H(1,1), He(1,18)
  grid.set('1,1', 1);
  grid.set('1,18', 2);
  // Period 2: Li..Ne
  for (let g = 1; g <= 2; g++) grid.set(`2,${g}`, 2 + g);
  for (let g = 13; g <= 18; g++) grid.set(`2,${g}`, g - 10); // B=5, C=6, N=7, O=8, F=9, Ne=10
  // Period 3: Na..Ar
  for (let g = 1; g <= 2; g++) grid.set(`3,${g}`, 10 + g);
  for (let g = 13; g <= 18; g++) grid.set(`3,${g}`, g - 2); // Al=13..Ar=18
  // Period 4: K..Kr (id 19..36)
  grid.set('4,1', 19);
  grid.set('4,2', 20);
  for (let g = 3; g <= 12; g++) grid.set(`4,${g}`, 16 + g); // Sc=21..Zn=30
  for (let g = 13; g <= 18; g++) grid.set(`4,${g}`, 17 + g); // Ga=31..Kr=36
  // Period 5: Rb..Xe (id 37..54)
  grid.set('5,1', 37);
  grid.set('5,2', 38);
  for (let g = 3; g <= 12; g++) grid.set(`5,${g}`, 34 + g); // Y=39..Cd=48
  for (let g = 13; g <= 18; g++) grid.set(`5,${g}`, 35 + g); // In=49..Xe=54
  // Period 6: Cs..Rn (id 55..86) — La (57) is the lanthanide indicator at (6,3)
  grid.set('6,1', 55);  // Cs
  grid.set('6,2', 56);  // Ba
  // (6,3) is occupied by the lanthanide indicator placeholder (no real element).
  for (let g = 4; g <= 12; g++) grid.set(`6,${g}`, 53 + g); // Hf=72..Hg=80
  for (let g = 13; g <= 18; g++) grid.set(`6,${g}`, 54 + g); // Tl=81..Rn=86
  // Period 7: Fr..Og (id 87..118) — Ac (89) is the actinide indicator at (7,3)
  grid.set('7,1', 87);  // Fr
  grid.set('7,2', 88);  // Ra
  for (let g = 4; g <= 12; g++) grid.set(`7,${g}`, 84 + g); // Rf=104..Cn=112
  for (let g = 13; g <= 18; g++) grid.set(`7,${g}`, 85 + g); // Nh=113..Og=118
  // Lanthanides row 9
  for (let i = 0; i < LANTHANIDE_IDS.length; i++) grid.set(`9,${i + 3}`, LANTHANIDE_IDS[i]);
  // Actinides row 10
  for (let i = 0; i < ACTINIDE_IDS.length; i++) grid.set(`10,${i + 3}`, ACTINIDE_IDS[i]);

  return {
    grid,
    lanthanideIndicator: { row: 8, col: 2, targetSeries: 'lanthanide', fromIds: [57], toIds: [71] },
    actinideIndicator: { row: 8, col: 3, targetSeries: 'actinide', fromIds: [89], toIds: [103] }
  };
}

// ====================================================================
// Category CSS-class slug
// ====================================================================

export function categoryClass(type) {
  if (!type) return 'cat-unknown';
  return 'cat-' + type.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export const CATEGORIES = [
  { type: 'Alkali Metal', label: 'Alkali Metal' },
  { type: 'Alkaline Earth Metal', label: 'Alkaline Earth Metal' },
  { type: 'Transition Metal', label: 'Transition Metal' },
  { type: 'Post-transition Metal', label: 'Post-transition Metal' },
  { type: 'Metalloid', label: 'Metalloid' },
  { type: 'Other nonmetal', label: 'Nonmetal' },
  { type: 'Halogen', label: 'Halogen' },
  { type: 'Noble Gas', label: 'Noble Gas' },
  { type: 'Lanthanide', label: 'Lanthanide' },
  { type: 'Actinide', label: 'Actinide' }
];