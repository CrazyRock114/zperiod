/**
 * The 118 IUPAC element symbols, ordered by atomic number (index 0 === Z 1).
 *
 * This is the single validation source used by the formula parser: any
 * element token that is not in this list is rejected.
 */

export const ELEMENT_SYMBOLS: string[] = [
  'H', 'He',
  'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne',
  'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar',
  'K', 'Ca', 'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn',
  'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr',
  'Rb', 'Sr', 'Y', 'Zr', 'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd',
  'In', 'Sn', 'Sb', 'Te', 'I', 'Xe',
  'Cs', 'Ba',
  'La', 'Ce', 'Pr', 'Nd', 'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu',
  'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg',
  'Tl', 'Pb', 'Bi', 'Po', 'At', 'Rn',
  'Fr', 'Ra',
  'Ac', 'Th', 'Pa', 'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm', 'Md', 'No', 'Lr',
  'Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds', 'Rg', 'Cn',
  'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og',
];

/** symbol -> atomic number. */
export const SYMBOL_TO_Z: Record<string, number> = (() => {
  const map: Record<string, number> = Object.create(null);
  ELEMENT_SYMBOLS.forEach((symbol, i) => {
    map[symbol] = i + 1;
  });
  return map;
})();

/** Atomic number -> symbol (1-based; index 0 is unused). */
export const Z_TO_SYMBOL: Record<number, string> = (() => {
  const map: Record<number, string> = Object.create(null);
  ELEMENT_SYMBOLS.forEach((symbol, i) => {
    map[i + 1] = symbol;
  });
  return map;
})();

/** Fast membership test used by the parser hot path. */
export function isElementSymbol(token: string): boolean {
  return Object.prototype.hasOwnProperty.call(SYMBOL_TO_Z, token);
}

/** Atomic number for a symbol, or 0 when unknown. */
export function atomicNumberOf(symbol: string): number {
  return isElementSymbol(symbol) ? SYMBOL_TO_Z[symbol] : 0;
}
