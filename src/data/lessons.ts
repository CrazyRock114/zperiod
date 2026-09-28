import type { Lesson } from '../types/chem';

/**
 * The Learning Playground.
 *
 * Lessons are ordered and gated: lesson N unlocks when N-1 is done, so a
 * student works the concepts in sequence rather than skipping to the mole
 * concept before atomic structure. `unlocks` re-opens specific elements in the
 * periodic table for hands-on practice.
 */
export const LESSONS: Lesson[] = [
  {
    id: 'read-the-table',
    titleKey: 'lesson.readTheTable.title',
    titleText: 'Reading the Periodic Table',
    summaryKey: 'lesson.readTheTable.summary',
    summaryText: 'Periods run across, groups run down. Learn what each axis controls before you memorise a single number.',
    atomicNumbers: [1, 2, 3, 11, 12, 17, 18, 26, 79],
    unlocks: [1, 2, 3, 11, 12, 17, 18, 26, 79],
    questions: [
      {
        key: 'lesson.readTheTable.q1',
        text: 'What increases as you move left to right across a period?',
        options: ['Atomic radius', 'Atomic number', 'Melting point', 'Number of shells'],
        answerIndex: 1,
        explainKey: 'lesson.readTheTable.e1',
        explainText:
          'Atomic number increases by one each step because you are adding one proton. Everything else (radius shrinks, electronegativity rises) follows from that.',
      },
      {
        key: 'lesson.readTheTable.q2',
        text: 'Elements in the same group share what property?',
        options: ['The same number of shells', 'The same valence electrons', 'The same atomic mass', 'The same phase'],
        answerIndex: 1,
        explainKey: 'lesson.readTheTable.e2',
        explainText:
          'A group is defined by valence electron count, which is why the alkali metals (1) and the halogens (7) each behave alike.',
      },
      {
        key: 'lesson.readTheTable.q3',
        text: 'Where are the lanthanides and actinides normally drawn?',
        options: ['Groups 3 only', 'Periods 6 and 7 only', 'Detached below the main table', 'Group 18'],
        answerIndex: 2,
        explainKey: 'lesson.readTheTable.e3',
        explainText:
          'They are the f-block, pulled out below the table to keep columns 3–12 readable. They still belong to periods 6 and 7.',
      },
    ],
  },
  {
    id: 'atomic-structure',
    titleKey: 'lesson.atomicStructure.title',
    titleText: 'Atomic Structure',
    summaryKey: 'lesson.atomicStructure.summary',
    summaryText: 'Protons decide the element, neutrons make the isotope, electrons make the ion. Three particles, three jobs.',
    atomicNumbers: [1, 6, 8, 26, 92],
    unlocks: [1, 6, 8, 26, 92],
    questions: [
      {
        key: 'lesson.atomicStructure.q1',
        text: 'Which particle determines the identity of an element?',
        options: ['Neutron', 'Electron', 'Proton', 'Valence electron'],
        answerIndex: 2,
        explainKey: 'lesson.atomicStructure.e1',
        explainText:
          'Change the protons and you change the element entirely. Iron with 25 protons is manganese; with 27 it is cobalt.',
      },
      {
        key: 'lesson.atomicStructure.q2',
        text: 'Two atoms of the same element with different neutron counts are called…',
        options: ['Ions', 'Isotopes', 'Isomers', 'Allotropes'],
        answerIndex: 1,
        explainKey: 'lesson.atomicStructure.e2',
        explainText:
          'Isotopes share a proton count and differ in mass number. Carbon-12 and carbon-14 are both carbon; carbon-14 is radioactive.',
      },
      {
        key: 'lesson.atomicStructure.q3',
        text: 'A sodium atom that loses one electron becomes…',
        options: ['A neutral atom', 'A cation with a +1 charge', 'An anion with a −1 charge', 'A different element'],
        answerIndex: 1,
        explainKey: 'lesson.atomicStructure.e3',
        explainText:
          'Losing an electron leaves one more proton than electron, so the charge is +1. The element is still sodium.',
      },
    ],
  },
  {
    id: 'electron-configuration',
    titleKey: 'lesson.electronConfig.title',
    titleText: 'Electron Configuration',
    summaryKey: 'lesson.electronConfig.summary',
    summaryText: 'Fill sub-shells in energy order, then read the configuration back. Aufbau, Hund and the noble-gas shorthand.',
    atomicNumbers: [2, 10, 18, 20, 26, 36, 54],
    unlocks: [2, 10, 18, 20, 26, 36, 54],
    questions: [
      {
        key: 'lesson.electronConfig.q1',
        text: 'In which order does the Aufbau principle fill sub-shells?',
        options: [
          '1s, 2s, 2p, 3s, 3p, 4s, 3d',
          '1s, 2s, 2p, 3s, 3p, 3d, 4s',
          '1s, 2s, 3s, 2p, 3p, 4s, 3d',
          '1s, 2p, 2s, 3s, 3p, 3d, 4s',
        ],
        answerIndex: 0,
        explainKey: 'lesson.electronConfig.e1',
        explainText:
          'Sub-shells fill by increasing n + l, so 4s (n+l = 4) comes before 3d (n+l = 5). That is why potassium is [Ar] 4s¹, not [Ar] 3d¹.',
      },
      {
        key: 'lesson.electronConfig.q2',
        text: 'How many electrons fit in a single p sub-shell?',
        options: ['2', '4', '6', '10'],
        answerIndex: 2,
        explainKey: 'lesson.electronConfig.e2',
        explainText:
          'Each sub-shell holds 2(2ℓ+1) electrons: s holds 2, p holds 6, d holds 10, f holds 14.',
      },
      {
        key: 'lesson.electronConfig.q3',
        text: 'What does the shorthand [Ar] mean?',
        options: [
          'Argon is radioactive',
          'The first 18 electrons, i.e. the argon core',
          'An argon atom has been ionised',
          'Ar stands for atomic radius',
        ],
        answerIndex: 1,
        explainKey: 'lesson.electronConfig.e3',
        explainText:
          'Noble-gas shorthand substitutes the full configuration of a noble gas. [Ar] 3d⁶ 4s² is iron: 18 + 6 + 2 = 26 electrons.',
      },
    ],
  },
  {
    id: 'periodic-trends',
    titleKey: 'lesson.trends.title',
    titleText: 'Periodic Trends',
    summaryKey: 'lesson.trends.summary',
    summaryText: 'Radius, electronegativity and ionisation energy all follow from one thing: how tightly the nucleus holds its electrons.',
    atomicNumbers: [3, 11, 17, 19, 20, 35, 53],
    unlocks: [3, 11, 17, 19, 20, 35, 53],
    questions: [
      {
        key: 'lesson.trends.q1',
        text: 'Atomic radius generally…',
        options: [
          'Increases down a group and to the left across a period',
          'Decreases down a group and to the left',
          'Stays constant within a period',
          'Only changes in the d-block',
        ],
        answerIndex: 0,
        explainKey: 'lesson.trends.e1',
        explainText:
          'Down a group you add shells, so the atom is physically bigger. Across a period increasing nuclear charge pulls the same shell inward.',
      },
      {
        key: 'lesson.trends.q2',
        text: 'Which element has the highest electronegativity?',
        options: ['Fluorine', 'Oxygen', 'Chlorine', 'Hydrogen'],
        answerIndex: 0,
        explainKey: 'lesson.trends.e2',
        explainText:
          'Fluorine is 3.98 on the Pauling scale — the highest of any element, and it pulls hardest on bonding electrons.',
      },
      {
        key: 'lesson.trends.q3',
        text: 'Why is the first ionization energy of sodium much lower than that of neon?',
        options: [
          'Sodium is a metal',
          'Neon is a noble gas and sodium’s outer electron is a full shell away',
          'Sodium is radioactive',
          'Neon has more neutrons',
        ],
        answerIndex: 1,
        explainKey: 'lesson.trends.e3',
        explainText:
          'Sodium’s 3s¹ electron is shielded and far from the nucleus. Neon’s 2p⁶ are close in and tightly held, so removing one costs far more energy.',
      },
    ],
  },
  {
    id: 'ions',
    titleKey: 'lesson.ions.title',
    titleText: 'Ions and Polyatomic Ions',
    summaryKey: 'lesson.ions.summary',
    summaryText: 'Cations, anions and polyatomic ions — how charges arise and what each one does in solution.',
    atomicNumbers: [3, 9, 11, 12, 17, 19, 20, 26],
    unlocks: [3, 9, 11, 12, 17, 19, 20, 26],
    questions: [
      {
        key: 'lesson.ions.q1',
        text: 'A monatomic ion with a 2− charge has how many more electrons than protons?',
        options: ['Two fewer', 'Two more', 'The same', 'It depends on the element'],
        answerIndex: 1,
        explainKey: 'lesson.ions.e1',
        explainText: 'A negative charge means the ion has gained electrons — 2− means two extra electrons.',
      },
      {
        key: 'lesson.ions.q2',
        text: 'Which of these is a polyatomic ion?',
        options: ['Na⁺', 'Cl⁻', 'SO₄²⁻', 'Mg²⁺'],
        answerIndex: 2,
        explainKey: 'lesson.ions.e2',
        explainText:
          'Sulfate contains four atoms bonded together. Monatomic ions like Na⁺ and Cl⁻ are a single atom each.',
      },
      {
        key: 'lesson.ions.q3',
        text: 'What charge does an oxide ion carry?',
        options: ['+2', '−1', '−2', '0'],
        answerIndex: 2,
        explainKey: 'lesson.ions.e3',
        explainText:
          'Oxygen is in group 16 with six valence electrons and gains two to reach an octet, giving O²⁻.',
      },
    ],
  },
  {
    id: 'bonding',
    titleKey: 'lesson.bonding.title',
    titleText: 'Chemical Bonding',
    summaryKey: 'lesson.bonding.summary',
    summaryText: 'Ionic, covalent and metallic bonding, and the evidence that tells them apart.',
    atomicNumbers: [1, 6, 7, 8, 11, 17, 26],
    unlocks: [1, 6, 7, 8, 11, 17, 26],
    questions: [
      {
        key: 'lesson.bonding.q1',
        text: 'NaCl is best described as…',
        options: ['Covalent', 'Ionic', 'Metallic', 'Hydrogen bonding'],
        answerIndex: 1,
        explainKey: 'lesson.bonding.e1',
        explainText:
          'Sodium transfers its outer electron to chlorine, producing Na⁺ and Cl⁻ held together by electrostatic attraction.',
      },
      {
        key: 'lesson.bonding.q2',
        text: 'A metal like iron is held together by…',
        options: ['Delocalised electrons shared across the lattice', 'Covalent bonds between pairs', 'Hydrogen bonds', 'Ionic bonds'],
        answerIndex: 0,
        explainKey: 'lesson.bonding.e2',
        explainText:
          'Metallic bonding uses a sea of delocalised valence electrons shared by positive metal ions, which is why metals conduct.',
      },
      {
        key: 'lesson.bonding.q3',
        text: 'How many bonds can a single carbon atom form?',
        options: ['2', '3', '4', '6'],
        answerIndex: 2,
        explainKey: 'lesson.bonding.e3',
        explainText:
          'Carbon has four valence electrons and four vacancies in its second shell, so it forms four covalent bonds — the whole of organic chemistry depends on it.',
      },
    ],
  },
  {
    id: 'balancing',
    titleKey: 'lesson.balancing.title',
    titleText: 'Balancing Equations',
    summaryKey: 'lesson.balancing.summary',
    summaryText: 'Conservation of mass in coefficient form. Balance confidently using algebra rather than trial and error.',
    atomicNumbers: [1, 6, 8, 26, 55],
    unlocks: [1, 6, 8, 26, 55],
    questions: [
      {
        key: 'lesson.balancing.q1',
        text: 'Balance: H₂ + O₂ → H₂O',
        options: ['H₂ + O₂ → H₂O', '2H₂ + O₂ → 2H₂O', 'H₂ + 2O₂ → H₂O', '2H₂ + 2O₂ → 2H₂O'],
        answerIndex: 1,
        explainKey: 'lesson.balancing.e1',
        explainText:
          'Four H on the left needs 2H₂, and two O needs one O₂, so the right becomes 2H₂O. Smallest whole numbers: 2 : 1 : 2.',
      },
      {
        key: 'lesson.balancing.q2',
        text: 'Balance: Fe + O₂ → Fe₂O₃',
        options: ['Fe + O₂ → Fe₂O₃', '2Fe + O₂ → Fe₂O₃', '4Fe + 3O₂ → 2Fe₂O₃', '3Fe + 2O₂ → Fe₂O₃'],
        answerIndex: 2,
        explainKey: 'lesson.balancing.e2',
        explainText:
          'Six O atoms need 3O₂; that makes 6 O on the right, so 2Fe₂O₃, which then needs 4 Fe. Result 4 : 3 : 2.',
      },
      {
        key: 'lesson.balancing.q3',
        text: 'Why must equations be balanced at all?',
        options: [
          'To look tidy',
          'Because atoms are neither created nor destroyed in a chemical reaction',
          'To make the numbers smaller',
          'Because of the law of octet',
        ],
        answerIndex: 1,
        explainKey: 'lesson.balancing.e3',
        explainText:
          'Conservation of mass. Every atom in the products must come from the reactants, so the coefficients are the only free variable.',
      },
    ],
  },
  {
    id: 'reaction-types',
    titleKey: 'lesson.reactionTypes.title',
    titleText: 'The Five Reaction Types',
    summaryKey: 'lesson.reactionTypes.summary',
    summaryText: 'Synthesis, decomposition, single replacement, double replacement and combustion — and how to tell them apart on sight.',
    atomicNumbers: [6, 8, 20, 24, 26, 29],
    unlocks: [6, 8, 20, 24, 26, 29],
    questions: [
      {
        key: 'lesson.reactionTypes.q1',
        text: '2Na + Cl₂ → 2NaCl is a…',
        options: ['Synthesis', 'Decomposition', 'Single replacement', 'Combustion'],
        answerIndex: 0,
        explainKey: 'lesson.reactionTypes.e1',
        explainText: 'Two simpler substances combine into one compound — that is the definition of a synthesis reaction.',
      },
      {
        key: 'lesson.reactionTypes.q2',
        text: 'CaCO₃ → CaO + CO₂ is a…',
        options: ['Decomposition', 'Double replacement', 'Single replacement', 'Synthesis'],
        answerIndex: 0,
        explainKey: 'lesson.reactionTypes.e2',
        explainText:
          'One compound breaks into two simpler compounds. Quicklime production and baking soda in a oven both work this way.',
      },
      {
        key: 'lesson.reactionTypes.q3',
        text: 'Which pattern always indicates a combustion?',
        options: [
          'A metal plus an acid',
          'A hydrocarbon plus O₂ producing CO₂ and H₂O',
          'Two salts exchanging ions',
          'An element plus oxygen only',
        ],
        answerIndex: 1,
        explainKey: 'lesson.reactionTypes.e3',
        explainText:
          'Hydrocarbons burn completely to carbon dioxide and water. If O₂ is limited you get CO or soot instead.',
      },
    ],
  },
  {
    id: 'mole',
    titleKey: 'lesson.mole.title',
    titleText: 'Molar Mass and the Mole',
    summaryKey: 'lesson.mole.summary',
    summaryText: 'The mole is a counting unit, not a mass. Connect particle number, grams and molar mass.',
    atomicNumbers: [1, 6, 7, 8, 16, 23],
    unlocks: [1, 6, 7, 8, 16, 23],
    questions: [
      {
        key: 'lesson.mole.q1',
        text: 'What is the molar mass of H₂O, in g/mol?',
        options: ['18.015', '2.016', '32.00', '9.01'],
        answerIndex: 0,
        explainKey: 'lesson.mole.e1',
        explainText: '2(1.008) + 16.00 = 18.015 g/mol.',
      },
      {
        key: 'lesson.mole.q2',
        text: 'How many atoms are in one mole of any element?',
        options: ['6.022 × 10²³', '6.022 × 10²²', '1.008 × 10²³', '9.109 × 10⁻³¹'],
        answerIndex: 0,
        explainKey: 'lesson.mole.e2',
        explainText:
          'That is Avogadro’s number, 6.02214076 × 10²³ particles per mole — atoms for an element, molecules for a compound, ions for a salt.',
      },
      {
        key: 'lesson.mole.q3',
        text: 'How many moles are in 44.0 g of CO₂?',
        options: ['1.00', '0.50', '2.00', '0.25'],
        answerIndex: 0,
        explainKey: 'lesson.mole.e3',
        explainText: 'CO₂ is 44.009 g/mol, so 44.0 / 44.009 ≈ 1.00 mol.',
      },
    ],
  },
  {
    id: 'solubility',
    titleKey: 'lesson.solubility.title',
    titleText: 'Solubility Rules',
    summaryKey: 'lesson.solubility.summary',
    summaryText: 'The rules that decide whether a salt dissolves. Learn the exceptions, not just the pattern.',
    atomicNumbers: [11, 17, 20, 26, 47, 56, 82],
    unlocks: [11, 17, 20, 26, 47, 56, 82],
    questions: [
      {
        key: 'lesson.solubility.q1',
        text: 'Which of these salts is always soluble?',
        options: ['BaSO₄', 'NaNO₃', 'CaCO₃', 'AgCl'],
        answerIndex: 1,
        explainKey: 'lesson.solubility.e1',
        explainText:
          'All nitrates dissolve, and so do all group-1 salts. BaSO₄, CaCO₃ and AgCl are the classic insoluble cases.',
      },
      {
        key: 'lesson.solubility.q2',
        text: 'Chlorides are insoluble with…',
        options: ['Na⁺ and K⁺', 'Ag⁺, Pb²⁺ and Hg₂²⁺', 'NH₄⁺', 'NO₃⁻'],
        answerIndex: 1,
        explainKey: 'lesson.solubility.e2',
        explainText:
          'Those three cations form chloride precipitates, which is exactly how the halide test for Cl⁻ works in the lab.',
      },
      {
        key: 'lesson.solubility.q3',
        text: 'A double-displacement reaction between two solutions is usually observable because…',
        options: [
          'The colours mix',
          'A precipitate or gas forms',
          'The temperature always drops',
          'The pH becomes exactly 7',
        ],
        answerIndex: 1,
        explainKey: 'lesson.solubility.e3',
        explainText:
          'AgNO₃ + NaCl gives an immediate white AgCl cloud. The precipitate is the visible proof the reaction happened.',
      },
    ],
  },
];

export const LESSON_BY_ID = new Map(LESSONS.map((l) => [l.id, l]));

export function lessonIndex(id: string): number {
  return LESSONS.findIndex((l) => l.id === id);
}

/** A lesson is available once the previous one is complete. */
export function isLessonUnlocked(index: number, done: string[]): boolean {
  if (index <= 0) return true;
  return done.includes(LESSONS[index - 1].id);
}
