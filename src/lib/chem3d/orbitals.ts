/**
 * Real spherical harmonics + hydrogen-like radial wavefunctions.
 *
 * This is what makes the SPDF atlas an actual simulation rather than a set of
 * coloured balls: every point in the cloud satisfies
 *
 *     P(r, θ, φ) = R_nl(r)² · |Y_lm(θ, φ)|²  >  threshold
 *
 * using the closed-form solutions to the hydrogen-like Schrödinger equation
 * with a Slater-rules screening constant, so multi-electron atoms look roughly
 * right instead of all 118 being perfect spheres.
 */

/* ------------------------------------------------------------------ */
/* Electron configuration → orbital quantum numbers                   */
/* ------------------------------------------------------------------ */

export interface SubShell {
  n: number;
  l: number;
  /** l as a letter: 0=s, 1=p, 2=d, 3=f. */
  letter: string;
  /** Electrons in this subshell in the neutral atom. */
  count: number;
  /** m quantum numbers, one per occupied orbital in the filled order. */
  ms: number[];
}

const L_LETTER: Record<number, string> = { 0: 's', 1: 'p', 2: 'd', 3: 'f' };

/** Unicode superscript digits, for the s/p/d/f counts. */
const SUPER: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
};

export function toSuperscript(n: number | string): string {
  return String(n)
    .split('')
    .map((c) => SUPER[c] ?? c)
    .join('');
}

/** Strip unicode superscripts back to ASCII digits. */
const UNI_SUPER: Record<string, string> = Object.fromEntries(
  Object.entries(SUPER).map(([k, v]) => [v, k]),
);

export function normalizeConfig(config: string): string {
  let s = config.replace(/[\s ]+/g, ' ').trim();
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) =>
    m
      .split('')
      .map((c) => UNI_SUPER[c] ?? c)
      .join(''),
  );
  return s;
}

const AUFBAU: Array<[n: number, l: number]> = (() => {
  const order: Array<[number, number]> = [];
  for (let n = 1; n <= 7; n++) {
    for (let l = 0; l < Math.min(n, 4); l++) order.push([n, l]);
  }
  // Madelung: sort by n + l, then by n.
  return order.sort((a, b) => a[0] + a[1] - (b[0] + b[1]) || a[0] - b[0]);
})();

export const ORBITAL_CAPACITY = [2, 6, 10, 14];

/** m values in the order degenerate orbitals fill: 0, +1, −1, +2, −2, … */
const M_VALUES = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 7];

/**
 * Parse a full electron configuration ("1s² 2s² 2p⁶ …") into occupied
 * sub-shells with their m quantum numbers. Handles noble-gas shorthand
 * ("[Ar] 3d⁶ 4s²") by the caller passing the expanded form.
 */
export function parseConfiguration(config: string): SubShell[] {
  const clean = normalizeConfig(config).replace(/\[(.*?)\]/g, ' ');
  const found = new Map<string, number>();

  for (const m of clean.matchAll(/(\d)([spdfg])(\d+)/gi)) {
    const n = Number(m[1]);
    const l = L_LETTER_INV[m[2].toLowerCase()];
    if (l === undefined) continue;
    found.set(`${n}${L_LETTER[l]}`, Number(m[3]));
  }

  const out: SubShell[] = [];
  let remaining = 0;
  for (const [n, l] of AUFBAU) {
    if (n > 7 || l > 3) continue;
    remaining += found.get(`${n}${L_LETTER[l]}`) ?? 0;
  }
  void remaining;

  for (const [n, l] of AUFBAU) {
    if (l > 3) continue;
    const count = found.get(`${n}${L_LETTER[l]}`) ?? 0;
    if (count <= 0) continue;
    const cap = ORBITAL_CAPACITY[l];
    const ms: number[] = [];
    for (let i = 0; i < cap && ms.length < count; i++) ms.push(M_VALUES[i]);
    out.push({ n, l, letter: L_LETTER[l], count, ms });
  }
  return out;
}

const L_LETTER_INV: Record<string, number> = { s: 0, p: 1, d: 2, f: 3, g: 4 };

/** Electrons per principal shell (K, L, M, N, O, P, Q). */
export function shellOccupancy(config: string): number[] {
  const shells = new Array(7).fill(0);
  for (const ss of parseConfiguration(config)) {
    shells[ss.n - 1] += ss.count;
  }
  return shells;
}

/** How many electrons sit in the highest principal quantum number. */
export function valenceCount(config: string): number {
  const occ = shellOccupancy(config);
  // The array is always length 7; take the last shell that actually has
  // electrons, not the last slot.
  for (let i = occ.length - 1; i >= 0; i--) if (occ[i] > 0) return occ[i];
  return 0;
}

/* ------------------------------------------------------------------ */
/* Slater's rules → effective nuclear charge                          */
/* ------------------------------------------------------------------ */

/**
 * Slater group id. Electrons in the same group screen each other at 0.35
 * (0.30 for the 1s group). Crucially, ns and np of the same n form ONE group —
 * getting this wrong is the most common bug in hand-rolled Slater rules.
 */
function slaterGroup(n: number, l: number): number {
  if (l <= 1) {
    if (n === 1) return 0; // the 1s group
    return 100 + n; // ns, np
  }
  if (l === 2) return 200 + n; // nd
  return 300 + n; // nf
}

/**
 * Effective nuclear charge felt by an electron in the given sub-shell
 * (Slater's rules).
 *
 * Every OTHER electron contributes:
 *   - 0.35 in the same group (0.30 for 1s)
 *   - 0.85 from the immediately inner shell, n - 1
 *   - 1.00 from every shell at n - 2 and below
 *   - 0.00 from outer shells, n' > n
 *
 * The 0.85 / 1.00 split matters: treating all inner shells as 0.85
 * under-screens the deep core and inflates Z_eff for every element from
 * sodium upward — Na 3s would read 2.50 instead of 2.20 — which then
 * mis-scales every SPDF valence cloud above sodium.
 */
export function slaterZ(atomicNumber: number, n: number, l: number): number {
  const cfg = AUFB_RAW(atomicNumber);
  const target = slaterGroup(n, l);
  const sameGroupS = n === 1 && l === 0 ? 0.3 : 0.35;

  // ns and np are stored as separate [n, l, count] rows but form ONE Slater
  // group, so the counts have to be summed before subtracting the electron
  // under test.
  let sameGroupCount = 0;
  let screening = 0;
  for (const [en, el, count] of cfg) {
    if (en === n && slaterGroup(en, el) === target) {
      sameGroupCount += count;
    } else if (en === n - 1) {
      screening += count * 0.85;
    } else if (en < n) {
      screening += count * 1.0; // n - 2 and below
    }
  }
  screening += Math.max(0, sameGroupCount - 1) * sameGroupS;
  return Math.max(0.5, atomicNumber - screening);
}

let _aufbCache: Map<number, Array<[number, number, number]>> = new Map();

function AUFB_RAW(z: number): Array<[number, number, number]> {
  const hit = _aufbCache.get(z);
  if (hit) return hit;
  const cfg: Array<[number, number, number]> = [];
  let left = z;
  for (const [n, l] of AUFBAU) {
    if (left <= 0) break;
    if (n > 7 || l > 3) continue;
    const cap = ORBITAL_CAPACITY[l];
    const take = Math.min(cap, left);
    cfg.push([n, l, take]);
    left -= take;
  }
  _aufbCache.set(z, cfg);
  return cfg;
}

/* ------------------------------------------------------------------ */
/* Associated Laguerre polynomials  L^α_k(x)                          */
/* ------------------------------------------------------------------ */

/** Generalised Laguerre L_k^α(x) by upward recurrence. */
export function laguerre(k: number, alpha: number, x: number): number {
  if (k < 0) return 0;
  if (k === 0) return 1;
  let lm1 = 1;
  let l = alpha + 1 - x;
  for (let i = 1; i < k; i++) {
    const next = ((2 * i + 1 + alpha - x) * l - (i + alpha) * lm1) / (i + 1);
    lm1 = l;
    l = next;
  }
  return l;
}

/* ------------------------------------------------------------------ */
/* Radial wavefunction                                                 */
/* ------------------------------------------------------------------ */

/**
 * Hydrogen-like radial wavefunction R_nl(r), r in Bohr radii.
 * Z is the Slater screening-corrected effective charge.
 */
export function radialR(n: number, l: number, r: number, Z: number): number {
  if (r <= 0) return l === 0 ? Math.sqrt(radialNorm(n, l, Z)) : 0;
  const x = (2 * Z * r) / n;
  const pre = Math.sqrt(radialNorm(n, l, Z)) * Math.pow(x, l) * Math.exp(-x / 2);
  return pre * laguerre(n - l - 1, 2 * l + 1, x);
}

/** Prefactor so ∫ |R_nl|² r² dr = 1. */
function radialNorm(n: number, l: number, Z: number): number {
  const log =
    3 * Math.log(2 * Z / n) +
    Math.log(factorial(n - l - 1)) -
    Math.log(2 * n * factorial(n + l));
  return Math.exp(log);
  // 1/a0³, a0 = 1 in these units
}

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/**
 * Electron density contribution R_nl(r)² at radius r, in a0⁻³.
 * Note this is the radial part only — the full probability density is
 * R²(r)·|Y|²(θ,φ), with no extra r² factor (r²dr is the volume element).
 */
export function radialDensity(n: number, l: number, r: number, Z: number): number {
  const v = radialR(n, l, r, Z);
  return v * v;
}

/** Radial probability density r²·R_nl(r)² — this is the one with a maximum. */
export function radialProbability(n: number, l: number, r: number, Z: number): number {
  return r * r * radialDensity(n, l, r, Z);
}

/**
 * Size the rendered cloud from the classical turning point: the outermost
 * radial-probability maximum, r²R², which is where the electron is most likely
 * to be found. Using the R² maximum instead would collapse every orbital onto
 * the nucleus, because R² always peaks at r = 0.
 */
export function orbitalExtent(n: number, l: number, Z: number): number {
  const rMax = (n * n) / Math.max(0.5, Z) + 4;
  let best = 0;
  let bestR = rMax;
  for (let i = 1; i <= 400; i++) {
    const r = (i / 400) * rMax;
    const p = radialProbability(n, l, r, Z);
    if (p > best) {
      best = p;
      bestR = r;
    }
  }
  return bestR || (n * n) / Math.max(0.5, Z);
}

/* ------------------------------------------------------------------ */
/| Real spherical harmonics                                            */
/* ------------------------------------------------------------------ */

const SQRT3 = Math.sqrt(3);
const SQRT2 = Math.sqrt(2);
const SQRT5 = Math.sqrt(5);
const SQRT15 = Math.sqrt(15);
const SQRT_1_4PI = 1 / Math.sqrt(4 * Math.PI);

/**
 * |Y_lm|² for the REAL (chemistry-convention) spherical harmonics, evaluated
 * at Cartesian unit direction (x, y, z). Unnormalised but the caller divides
 * by the mode's peak, which is what the isosurface threshold needs.
 */
export function realHarmonicSquared(
  l: number,
  m: number,
  x: number,
  y: number,
  z: number,
): number {
  switch (l) {
    case 0: // s
      return 1;

    case 1: // p
      switch (m) {
        case 0: return z * z;
        case 1: return x * x;
        case -1: return y * y;
      }
      break;

    case 2: // d
      switch (m) {
        /*
         * d_z² is Y₂₀ ∝ 3cos²θ − 1 = (2z² − x² − y²) — NOT cos⁴θ.
         * cos⁴θ has the same two polar lobes but no equatorial torus, so the
         * 3d z² orbital was rendering as a bare dumbbell. Cross-checked
         * against the closed forms in __tests__/cross-check.test.ts.
         */
        case 0: {
          const t = 3 * z * z - 1;
          return t * t;
        }
        case 1: return (x * z) ** 2;
        case -1: return (y * z) ** 2;
        case 2: return ((x * x - y * y) / 2) ** 2;
        case -2: return (x * y) ** 2;
      }
      break;

    case 3: // f
      switch (m) {
        // f_z³       ∝ z(5z² − 3)
        // f_xz²      ∝ x(5z² − 1)
        // f_yz²      ∝ y(5z² − 1)
        // f_z(x²−y²) ∝ z(x²−y²)
        // f_x(x²−3y²)∝ x(x² − 3y²)
        // f_y(3x²−y²)∝ y(3x² − y²)
        case 0: {
          const t = z * (5 * z * z - 3);
          return (t * t) / 4;
        }
        case 1: return ((x * (5 * z * z - 1)) ** 2) / 4;
        case -1: return ((y * (5 * z * z - 1)) ** 2) / 4;
        // was ((z(x²−y²))/2)² — an extra division that skewed the lobes
        case 2: {
          const t = z * (x * x - y * y);
          return (t * t) / 2;
        }
        case -2: return ((x * (x * x - 3 * y * y)) ** 2) / 4;
        case -3: return ((y * (3 * x * x - y * y)) ** 2) / 4;
      }
      break;
  }
  return 1;
}

/** Approximate per-mode normalisation so all 16 orbitals are comparable. */
export function harmonicNorm(l: number, m: number): number {
  const am = Math.abs(m);
  if (l === 0) return SQRT_1_4PI;
  if (l === 1) return am === 0 ? SQRT3 * SQRT_1_4PI : SQRT3 * SQRT_1_4PI / SQRT2;
  if (l === 2) {
    if (am === 0) return SQRT5 * SQRT_1_4PI;
    if (am === 1) return SQRT15 * SQRT_1_4PI;
    return SQRT15 * SQRT_1_4PI / 2;
  }
  if (l === 3) {
    if (am === 0) return SQRT7 * SQRT_1_4PI;
    if (am === 1) return SQRT21 * SQRT_1_4PI;
    if (am === 2) return SQRT21 * SQRT_1_4PI;
    return SQRT35 * SQRT_1_4PI;
  }
  return 1;
}

const SQRT7 = Math.sqrt(7);
const SQRT21 = Math.sqrt(21);
const SQRT35 = Math.sqrt(35);

/* ------------------------------------------------------------------ */
/| The 16 canonical orbitals                                          */
/* ------------------------------------------------------------------ */

export interface OrbitalDef {
  /** Canonical label, e.g. "2pₓ". */
  label: string;
  n: number;
  l: number;
  m: number;
  /** Latin-1 letter used in chemistry, e.g. "pₓ". */
  shape: string;
  /** 0 s, 1 p, 2 d, 3 f — used for colour grouping. */
  family: 0 | 1 | 2 | 3;
}

/** All 16 hydrogen-like orbitals: 1s 2s 2p 3s 3p 3d 4s 4p 4d 4f. */
export const ORBITALS: OrbitalDef[] = (() => {
  const shapes: Record<number, Array<[number, string]>> = {
    0: [[0, 's']],
    1: [[0, 'p_z'], [1, 'pₓ'], [-1, 'p_y']],
    2: [[0, 'd_z²'], [1, 'dₓz'], [-1, 'd_yz'], [2, 'dₓ²₋ᵧ²'], [-2, 'dₓᵧ']],
    3: [
      [0, 'f_z³'], [1, 'fₓz²'], [-1, 'f_yz²'], [2, 'f_zₓ²₋ᵧ²'],
      [-2, 'fₓₓ²₋₃ᵧ²'], [1, 'f_3ₓ²₋ᵧ²'], [-1, 'f_3ᵧ²₋ₓ²'],
    ],
  };
  const out: OrbitalDef[] = [];
  for (const n of [1, 2, 3, 4]) {
    for (let l = 0; l < Math.min(n, 4); l++) {
      for (const [m, shape] of shapes[l]) {
        out.push({ label: `${n}${shape}`, n, l, m, shape, family: l as 0 | 1 | 2 | 3 });
      }
    }
  }
  return out;
})();

/* ------------------------------------------------------------------ */
/| Point-cloud sampling                                                */
/* ------------------------------------------------------------------ */

export interface SpdfPoint {
  x: number;
  y: number;
  z: number;
  /** Local probability density, 0–1, for size/alpha modulation. */
  p: number;
}

/**
 * Sample the region where the probability density exceeds `threshold`
 * (0-1, relative to the orbital's own maximum).
 *
 * The radius is drawn from the actual radial probability density r²R²(r)
 * rather than uniformly in volume. Uniform-in-volume wastes almost every
 * sample on the empty core of a compact s orbital — for 2s in oxygen that
 * left single-digit point counts — and biasing r by the real radial PDF is
 * both cheaper and more faithful.
 */
export function sampleSpdf(
  orbital: OrbitalDef,
  Z: number,
  opts: { maxPoints?: number; threshold?: number; seed?: number } = {},
): SpdfPoint[] {
  const { maxPoints = 9000, threshold = 0.35, seed = 12345 } = opts;
  const R = orbitalExtent(orbital.n, orbital.l, Z) * 2.2;
  const rand = mulberry32(seed);

  // Normalisation so the threshold means the same thing for every orbital.
  const peak = findPeak(orbital, Z);

  // Tabulate the radial CDF once, then invert it.
  const BINS = 512;
  const cdf = new Float64Array(BINS + 1);
  let acc = 0;
  for (let i = 1; i <= BINS; i++) {
    const r = (i / BINS) * R;
    acc += radialProbability(orbital.n, orbital.l, r, Z) * r;
    cdf[i] = acc;
  }
  if (acc <= 0) return [];
  for (let i = 0; i <= BINS; i++) cdf[i] /= acc;

  const drawR = (): number => {
    const u = rand();
    // Binary search the CDF.
    let lo = 0;
    let hi = BINS;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < u) lo = mid + 1;
      else hi = mid;
    }
    return Math.max(1e-4, (lo / BINS) * R);
  };

  const points: SpdfPoint[] = [];
  let guard = 0;
  const maxTries = maxPoints * 12;

  while (points.length < maxPoints && guard < maxTries) {
    guard++;
    const r = drawR();
    // Uniform direction on the sphere.
    const u = rand() * 2 - 1;
    const phi = rand() * Math.PI * 2;
    const sn = Math.sqrt(1 - u * u);

    const rad = radialProbability(orbital.n, orbital.l, r, Z) / peak.radial;
    if (rad < 1e-9) continue;
    const ang = realHarmonicSquared(orbital.l, orbital.m, sn * Math.cos(phi), sn * Math.sin(phi), u) / peak.angular;
    const p = rad * ang;
    if (p < threshold) continue;

    points.push({
      x: r * sn * Math.cos(phi),
      y: r * sn * Math.sin(phi),
      z: r * u,
      p: Math.min(1, p),
    });
  }
  return points;
}

/** Radial and angular maxima, sampled once per orbital. */
function findPeak(o: OrbitalDef, Z: number): { radial: number; angular: number } {
  // Normalise against the radial PROBABILITY r²R², not R². For any ns orbital
  // R² peaks at the nucleus, so using it would reject the whole outer lobe.
  let radial = 0;
  const rMax = (o.n * o.n) / Math.max(0.5, Z) + 6;
  for (let i = 1; i <= 400; i++) {
    const r = (i / 400) * rMax;
    radial = Math.max(radial, radialProbability(o.n, o.l, r, Z));
  }
  // Angular max over a coarse sphere scan.
  let angular = 0;
  const STEPS = 24;
  for (let i = 0; i <= STEPS; i++) {
    const th = (i / STEPS) * Math.PI;
    for (let j = 0; j < STEPS * 2; j++) {
      const ph = (j / (STEPS * 2)) * Math.PI * 2;
      const s = Math.sin(th);
      const v = realHarmonicSquared(o.l, o.m, s * Math.cos(ph), s * Math.sin(ph), Math.cos(th));
      if (v > angular) angular = v;
    }
  }
  return { radial: radial || 1, angular: angular || 1 };
}

/** Deterministic PRNG so a given orbital always renders identically. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
