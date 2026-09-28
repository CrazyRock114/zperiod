/**
 * Standard atomic weights (average masses) for all 118 elements.
 *
 * Values are the IUPAC/CODATA conventional standard atomic weights (the set
 * used by most reference tables and by PubChem), which reproduces the familiar
 * tabulated molar masses: H2O 18.015, CO2 44.009, Ca(OH)2 74.093, C6H12O6
 * 180.156 g/mol.
 *
 * Elements with no stable isotope (Tc, Pm, and everything from Po up) carry the
 * mass number of their most stable isotope instead.
 */

import { ELEMENT_SYMBOLS } from './elementSymbols';

const MASSES: number[] = [
  1.00794,      // 1  H
  4.002602,     // 2  He
  6.941,        // 3  Li
  9.012182,     // 4  Be
  10.811,       // 5  B
  12.0107,      // 6  C
  14.0067,      // 7  N
  15.9994,      // 8  O
  18.9984032,   // 9  F
  20.1797,      // 10 Ne
  22.98976928,  // 11 Na
  24.305,       // 12 Mg
  26.9815386,   // 13 Al
  28.0855,      // 14 Si
  30.973762,    // 15 P
  32.065,       // 16 S
  35.453,       // 17 Cl
  39.948,       // 18 Ar
  39.0983,      // 19 K
  40.078,       // 20 Ca
  44.955912,    // 21 Sc
  47.867,       // 22 Ti
  50.9415,      // 23 V
  51.9961,      // 24 Cr
  54.938045,    // 25 Mn
  55.845,       // 26 Fe
  58.933195,    // 27 Co
  58.6934,      // 28 Ni
  63.546,       // 29 Cu
  65.38,        // 30 Zn
  69.723,       // 31 Ga
  72.64,        // 32 Ge
  74.9216,      // 33 As
  78.96,        // 34 Se
  79.904,       // 35 Br
  83.798,       // 36 Kr
  85.4678,      // 37 Rb
  87.62,        // 38 Sr
  88.90585,     // 39 Y
  91.224,       // 40 Zr
  92.90638,     // 41 Nb
  95.96,        // 42 Mo
  98,           // 43 Tc
  101.07,       // 44 Ru
  102.9055,     // 45 Rh
  106.42,       // 46 Pd
  107.8682,     // 47 Ag
  112.411,      // 48 Cd
  114.818,      // 49 In
  118.71,       // 50 Sn
  121.76,       // 51 Sb
  127.6,        // 52 Te
  126.90447,    // 53 I
  131.293,      // 54 Xe
  132.9054519,  // 55 Cs
  137.327,      // 56 Ba
  138.90547,    // 57 La
  140.116,      // 58 Ce
  140.90765,    // 59 Pr
  144.242,      // 60 Nd
  145,          // 61 Pm
  150.36,       // 62 Sm
  151.964,      // 63 Eu
  157.25,       // 64 Gd
  158.92535,    // 65 Tb
  162.5,        // 66 Dy
  164.93032,    // 67 Ho
  167.259,      // 68 Er
  168.93421,    // 69 Tm
  173.054,      // 70 Yb
  174.9668,     // 71 Lu
  178.49,       // 72 Hf
  180.94788,    // 73 Ta
  183.84,       // 74 W
  186.207,      // 75 Re
  190.23,       // 76 Os
  192.217,      // 77 Ir
  195.084,      // 78 Pt
  196.966569,   // 79 Au
  200.59,       // 80 Hg
  204.3833,     // 81 Tl
  207.2,        // 82 Pb
  208.9804,     // 83 Bi
  209,          // 84 Po
  210,          // 85 At
  222,          // 86 Rn
  223,          // 87 Fr
  226,          // 88 Ra
  227,          // 89 Ac
  232.03806,    // 90 Th
  231.03588,    // 91 Pa
  238.02891,    // 92 U
  237,          // 93 Np
  244,          // 94 Pu
  243,          // 95 Am
  247,          // 96 Cm
  247,          // 97 Bk
  251,          // 98 Cf
  252,          // 99 Es
  257,          // 100 Fm
  258,          // 101 Md
  259,          // 102 No
  262,          // 103 Lr
  267,          // 104 Rf
  268,          // 105 Db
  269,          // 106 Sg
  270,          // 107 Bh
  269,          // 108 Hs
  278,          // 109 Mt
  281,          // 110 Ds
  282,          // 111 Rg
  285,          // 112 Cn
  286,          // 113 Nh
  289,          // 114 Fl
  290,          // 115 Mc
  293,          // 116 Lv
  294,          // 117 Ts
  294,          // 118 Og
];

/** Element symbol -> average atomic mass in u (== g/mol numerically). */
export const ATOMIC_MASSES: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  ELEMENT_SYMBOLS.forEach((symbol, i) => {
    map[symbol] = MASSES[i] ?? 0;
  });
  return map;
})();

/** Atomic number -> average atomic mass, 1-based. */
export const ATOMIC_MASSES_BY_Z: number[] = MASSES;

export function atomicMassOf(symbol: string): number | undefined {
  return Object.prototype.hasOwnProperty.call(ATOMIC_MASSES, symbol) ? ATOMIC_MASSES[symbol] : undefined;
}
