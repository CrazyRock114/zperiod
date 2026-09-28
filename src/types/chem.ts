/**
 * Zperiod — core domain type contract.
 *
 * This file is the single source of truth shared by:
 *   - the data layer (src/data/**)  — produced by the data worker
 *   - the chemistry engine (src/lib/chem/**) — produced by the engine worker
 *   - the UI layer (src/components/**) — built by Mavis
 *
 * If you change a field here, you must update every producer.
 */

/* ------------------------------------------------------------------ */
/* Element data                                                        */
/* ------------------------------------------------------------------ */

export type ElementCategory =
  | 'alkali-metal'
  | 'alkaline-earth-metal'
  | 'transition-metal'
  | 'post-transition-metal'
  | 'metalloid'
  | 'nonmetal'
  | 'halogen'
  | 'noble-gas'
  | 'lanthanide'
  | 'actinide'
  | 'unknown';

export type Phase = 'solid' | 'liquid' | 'gas' | 'plasma' | 'unknown';

/** Which block of the periodic table the element belongs to. */
export type Block = 's' | 'p' | 'd' | 'f';

/** Shedding / gaining electrons. */
export type IonCharge = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Isotope {
  /** Mass number, e.g. 12 for C-12. */
  massNumber: number;
  /** Relative isotopic abundance in percent, 0–100. */
  abundance: number;
  /** Stable unless explicitly radioactive. */
  stable: boolean;
}

export interface Element {
  /** 1–118, contiguous and unique. */
  atomicNumber: number;
  /** IUPAC symbol, e.g. "Fe". */
  symbol: string;
  /** English name, e.g. "Iron". */
  name: string;
  /** Standard atomic weight. Use null for elements with no stable isotope. */
  atomicMass: number | null;
  /** Mass number of the most stable isotope, when atomicMass is null. */
  massNumberOfMostStable: number | null;
  period: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  /** 1–18. Lanthanides/actinides use the f-block group. */
  group: number;
  block: Block;
  category: ElementCategory;
  /** Phase at STP (0 °C, 1 atm). */
  phase: Phase;
  /** Full electron configuration with unicode superscripts, e.g. "1s² 2s² 2p⁶". */
  electronConfiguration: string;
  /** Condensed noble-gas notation, e.g. "[Ar] 3d⁶ 4s²". May be null for H. */
  nobleGasConfiguration: string | null;
  /** Number of valence electrons. */
  valenceElectrons: number | null;
  electronegativity: number | null;
  /** Pauling scale. */
  atomicRadiusPm: number | null;
  meltingPointK: number | null;
  boilingPointK: number | null;
  /** g/cm³. Use null for elements without a meaningful solid/liquid density. */
  densityGcm3: number | null;
  /** First ionization energy in eV. */
  ionizationEnergyEv: number | null;
  /** Electron affinity in kJ/mol. Negative means energy released. */
  electronAffinityKjMol: number | null;
  /** Number of naturally occurring isotopes. */
  isotopeCount: number | null;
  isotopes: Isotope[];
  discoveryYear: number | null;
  discoverer: string | null;
  /** Short summary of what the element is used for. English. */
  uses: string | null;
  /** Short summary of the primary hazard(s). English. */
  hazards: string | null;
  /** Free-text bio / notable-properties paragraph. English. */
  summary: string | null;
  /** Flame-test colour as a CSS colour, or null. */
  flameTestColor: string | null;
  /** Oxidation states, e.g. [-1, 1, 2]. Empty when unknown. */
  oxidationStates: number[];
  /** Image URL for the element portrait, or null. Must be a real, reachable URL. */
  imageUrl: string | null;
  /** Where the image / portrait data came from, for source attribution. */
  imageCredit: string | null;
}

/* ------------------------------------------------------------------ */
/* Ions                                                                */
/* ------------------------------------------------------------------ */

export type IonType = 'cation' | 'anion' | 'monatomic' | 'polyatomic';

export interface Ion {
  /** Global unique key, e.g. "Fe-2". */
  id: string;
  elementSymbol: string;
  atomicNumber: number;
  /** Charge as a signed integer, e.g. -2. */
  charge: number;
  /** Subscript after the charge, e.g. 2 for SO4^2-. */
  subscript: number;
  /** For polyatomic ions the full formula with unicode, e.g. "SO₄²⁻". */
  formula: string;
  /** For polyatomic ions the English name, e.g. "Sulfate". Null for monatomic. */
  name: string | null;
  type: IonType;
  /** Net charge of the ion itself (charge * subscript). */
  netCharge: number;
  /** Number of protons in the ion. Equal to atomicNumber for monatomic. */
  protons: number;
  /** Number of electrons in the ion. */
  electrons: number;
  /** Average mass of the ion in u, or null when it cannot be computed. */
  averageMass: number | null;
  /** Full electron configuration of the ion. */
  electronConfiguration: string | null;
  /** Configuration as a plain string, digits and letters, no unicode. */
  configPlain: string | null;
  /** Phase at STP. */
  phase: Phase;
  /** Flame-test colour CSS colour, or null. */
  flameTestColor: string | null;
  /** English summary of the ion's role / chemistry. */
  about: string | null;
}

/* ------------------------------------------------------------------ */
/* Solubility                                                          */
/* ------------------------------------------------------------------ */

export interface SolubilityRule {
  ionFormula: string;
  ionPlain: string;
  /** Anion cation. */
  kind: 'cation' | 'anion';
  /** Rule text, English. */
  rule: string;
  /** Additional exceptions, e.g. "exceptions: Ba²⁺, Sr²⁺, Pb²⁺, Ca²⁺". */
  exceptions: string | null;
  /** Solubility outcome. */
  outcome: 'soluble' | 'insoluble' | 'slightly-soluble' | 'reacts';
  /** English note shown in the table, e.g. "decomposes in water". */
  note: string | null;
}

/* ------------------------------------------------------------------ */
/* Reaction templates (for worksheets)                                  */
/* ------------------------------------------------------------------ */

export type ReactionType =
  | 'synthesis'
  | 'decomposition'
  | 'single-replacement'
  | 'double-replacement'
  | 'combustion';

export interface ReactionTemplate {
  id: string;
  type: ReactionType;
  /** Balanced equation with unicode subscripts, e.g. "2H₂ + O₂ → 2H₂O". */
  balanced: string;
  /** Same equation without unicode. */
  balancedPlain: string;
  /** The unbalanced prompt shown to the student. */
  unbalanced: string;
  unbalancedPlain: string;
  difficulty: 'easy' | 'medium' | 'hard';
  /** True when the unbalanced form is identical to the balanced form. */
  alreadyBalanced: boolean;
}

/* ------------------------------------------------------------------ */
/* Worksheet                                                           */
/* ------------------------------------------------------------------ */

export type ExerciseType = 'balance' | 'identify' | 'combined';

export interface WorksheetQuestion {
  index: number;
  type: Exclude<ExerciseType, 'combined'>;
  reactionType: ReactionType;
  prompt: string;
  answer: string;
  /** One-line explanation shown only in the answer key. */
  explanation: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface WorksheetConfig {
  exerciseType: ExerciseType;
  count: 5 | 10 | 20 | 30 | 50;
  reactionTypes: ReactionType[];
  difficulty: 'easy' | 'medium' | 'hard';
  /** Include the answer key page. */
  includeAnswerKey: boolean;
  /** Include the worked solutions (not just final answers). */
  includeSolutions: boolean;
  /** Per-page header text. */
  title: string;
  /** Emit localized field names. */
  locale: string;
}

export interface Worksheet {
  config: WorksheetConfig;
  questions: WorksheetQuestion[];
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Units                                                               */
/* ------------------------------------------------------------------ */

export type TemperatureUnit = 'C' | 'F' | 'K';
export type DensityUnit = 'gcm3' | 'kgm3' | 'lbft3';
export type EnergyUnit = 'kjmol' | 'ev';

export interface UnitPrefs {
  temperature: TemperatureUnit;
  density: DensityUnit;
  energy: EnergyUnit;
}

export const DEFAULT_UNITS: UnitPrefs = {
  temperature: 'K',
  density: 'gcm3',
  energy: 'kjmol',
};

/* ------------------------------------------------------------------ */
/* Layout / settings                                                   */
/* ------------------------------------------------------------------ */

export interface LayoutPrefs {
  /** Card width scale. */
  borderWidth: 75 | 175;
  /** Which properties are rendered on the table cell. */
  cellFields: {
    atomicNumber: boolean;
    symbol: boolean;
    name: boolean;
    mass: boolean;
    phase: boolean;
    group?: boolean;
  };
  /** Extra gaps inserted in the table grid (row, col, count). */
  gapRows: number[];
  gapCols: number[];
}

export const DEFAULT_LAYOUT: LayoutPrefs = {
  borderWidth: 75,
  cellFields: {
    atomicNumber: true,
    symbol: true,
    name: true,
    mass: false,
    phase: false,
  },
  gapRows: [],
  gapCols: [],
};

/* ------------------------------------------------------------------ */
/* Learning path                                                       */
/* ------------------------------------------------------------------ */

export interface Lesson {
  id: string;
  titleKey: string;
  /** English title, used when the active locale has not translated `titleKey`. */
  titleText: string;
  summaryKey: string;
  /** English summary, used when the active locale has not translated it. */
  summaryText: string;
  /** Element atomic numbers covered, or empty for a concept lesson. */
  atomicNumbers: number[];
  /** Quiz questions. `text` / `explainText` are the English fallbacks. */
  questions: Array<{
    key: string;
    text: string;
    options: string[];
    answerIndex: number;
    explainKey: string;
    explainText: string;
  }>;
  /** Elements unlocked by completing this lesson. */
  unlocks: number[];
}

export interface ReviewCard {
  atomicNumber: number;
  /** SM-2 ease factor. */
  ease: number;
  /** Days until next review. */
  interval: number;
  /** ISO date of last review. */
  lastReviewed: string | null;
  reps: number;
  lapses: number;
}

/* ------------------------------------------------------------------ */
/* Feedback                                                            */
/* ------------------------------------------------------------------ */

export type FeedbackTopic = 'more-data' | 'bug' | 'new-tool' | 'ui' | 'other';

export interface FeedbackEntry {
  id: string;
  topic: FeedbackTopic;
  message: string;
  email: string | null;
  createdAt: string;
  /** Where the user was when they submitted. */
  context: string | null;
  status: 'new' | 'triaged' | 'done' | 'wontfix';
}
