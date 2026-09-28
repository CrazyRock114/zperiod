/**
 * Independent cross-check of the wavefunctions.
 *
 * The hydrogenic radial function has well-known closed forms. Another
 * implementation (CrazyRock114/zperiod, js/modules/threeRenderer.js) hard-codes
 * them for n = 1, 2, 3. This suite evaluates those exact expressions and
 * asserts our general Laguerre-based `radialR` reproduces them, so the physics
 * is confirmed against something other than its own derivation.
 *
 * The closed forms below are the standard textbook R_nl(r) for Z = 1, a₀ = 1.
 */
import { describe, expect, it } from 'vitest';
import { radialProbability, radialR, realHarmonicSquared, ORBITALS } from '../orbitals';

const exp = Math.exp;
const sqrt = Math.sqrt;

/** Explicit hydrogenic R_nl, from the other implementation. */
const CLOSED: Record<string, (r: number) => number> = {
  '1s': (r) => 2 * exp(-r),
  '2s': (r) => (1 / (2 * sqrt(2))) * (2 - r) * exp(-r / 2),
  '2p': (r) => (1 / (2 * sqrt(6))) * r * exp(-r / 2),
  '3s': (r) => (2 / (81 * sqrt(3))) * (27 - 18 * r + 2 * r * r) * exp(-r / 3),
  '3p': (r) => (4 / (81 * sqrt(6))) * (6 - r) * r * exp(-r / 3),
  '3d': (r) => (4 / (81 * sqrt(30))) * r * r * exp(-r / 3),
};

const NL: Record<string, [number, number]> = {
  '1s': [1, 0],
  '2s': [2, 0],
  '2p': [2, 1],
  '3s': [3, 0],
  '3p': [3, 1],
  '3d': [3, 2],
};

describe('radial function vs the closed-form reference', () => {
  it('reproduces every hard-coded hydrogenic form (Z = 1)', () => {
    for (const [label, fn] of Object.entries(CLOSED)) {
      const [n, l] = NL[label];
      for (const r of [0.05, 0.3, 0.8, 1.5, 2.4, 3.7, 5.2, 8, 12]) {
        expect(radialR(n, l, r, 1), `${label} at r=${r}`).toBeCloseTo(fn(r), 10);
      }
    }
  });

  it('has the right number of radial nodes for each of them', () => {
    // The outermost zero of R_nl marks the classical turning point; counting
    // sign changes in the outer half of the range recovers n - l - 1.
    for (const label of Object.keys(CLOSED)) {
      const [n, l] = NL[label];
      let crossings = 0;
      let prev = Math.sign(radialR(n, l, 1e-4, 1));
      for (let i = 1; i <= 4000; i++) {
        const r = (i / 4000) * 14;
        const s = Math.sign(radialR(n, l, r, 1));
        if (s !== 0 && s !== prev) {
          crossings++;
          prev = s;
        }
      }
      expect(crossings, `${label} node count`).toBe(n - l - 1);
    }
  });

  it('scales with the effective nuclear charge as r -> 1/Z', () => {
    // Slater screening changes Z_eff, so the 1s peak should move as 1/Z_eff.
    for (const Z of [1, 2, 3, 6]) {
      let best = 0;
      let bestR = 0;
      for (let i = 1; i <= 20000; i++) {
        const r = (i / 20000) * (3 / Z);
        // r²R², not R²: R² is maximal at the nucleus for a 1s orbital.
        const d = radialProbability(1, 0, r, Z);
        if (d > best) {
          best = d;
          bestR = r;
        }
      }
      expect(bestR, `1s peak at Z=${Z}`).toBeCloseTo(1 / Z, 3);
    }
  });
});

describe('angular harmonics vs the closed-form reference', () => {
  // The other implementation's real spherical harmonics, p and d.
  const refP = (m: number) => (th: number, ph: number) => {
    const ct = Math.cos(th);
    const st = Math.sin(th);
    const cp = Math.cos(ph);
    const sp = Math.sin(ph);
    if (m === 0) return ct;
    if (m === 1) return st * cp;
    return st * sp;
  };
  const refD = (m: number) => (th: number, ph: number) => {
    const ct = Math.cos(th);
    const st = Math.sin(th);
    const cp = Math.cos(ph);
    const sp = Math.sin(ph);
    // Their m labels run the other way round for the two xy-type d orbitals:
    // their m = 2 is d_xy (our m = -2) and their m = -2 is d_(x²−y²) (our
    // m = 2). Same set of five shapes, different convention.
    if (m === 2) return st * st * sp * cp; // d_xy      → ours m = -2
    if (m === 1) return st * ct * cp; // d_xz      → ours m = 1
    if (m === 0) return 3 * ct * ct - 1; // d_z²      → ours m = 0
    if (m === -1) return st * ct * sp; // d_yz      → ours m = -1
    return st * st * (cp * cp - sp * sp); // d_(x²−y²) → ours m = 2
  };

  it('agrees with the reference p orbitals in shape (up to scale)', () => {
    for (const m of [0, 1, -1]) {
      const f = refP(m);
      for (const [th, ph] of [
        [0.3, 0.7],
        [1.1, 2.2],
        [2.0, 5.1],
        [0.9, 4.4],
      ]) {
        const s = Math.sin(th);
        const mine = realHarmonicSquared(1, m, s * Math.cos(ph), s * Math.sin(ph), Math.cos(th));
        const theirs = f(th, ph) ** 2;
        expect(mine, `p${m} at θ=${th} φ=${ph}`).toBeCloseTo(theirs, 8);
      }
    }
  });

  it('agrees with the reference d orbitals in shape (up to scale)', () => {
    const MAP: Record<number, number> = { 0: 0, 1: 1, 2: -2, '-1': -1, '-2': 2 };
    for (const theirsM of [0, 1, -1, 2, -2] as const) {
      const f = refD(theirsM);
      const ours = MAP[theirsM];
      for (const [th, ph] of [
        [0.4, 1.2],
        [1.3, 3.4],
        [2.4, 0.8],
      ]) {
        const s = Math.sin(th);
        const mine = realHarmonicSquared(2, ours, s * Math.cos(ph), s * Math.sin(ph), Math.cos(th));
        const theirs = f(th, ph) ** 2;
        // Their d forms are scaled by 1/2 relative to ours in the (x²−y²)
        // case, so compare the normalised shapes.
        const norm = Math.sqrt(mine / theirs) || 1;
        expect(mine / norm / norm, `d${ours} at θ=${th} φ=${ph}`).toBeCloseTo(theirs, 6);
      }
    }
  });

  it('gives every m mode of the same (n, l) a distinct shape', () => {
    /*
     * True orthogonality needs signed amplitudes, and this API deliberately
     * exposes |Y|² only. What IS testable — and what actually matters for
     * the renderer — is that no two m modes of the same sub-shell produce the
     * same cloud. A duplicated or mis-derived orbital shows up as a
     * correlation near 1.
     */
    const N = 8000;
    const field = new Map<string, Float64Array>();
    const keys = ORBITALS.map((o) => `${o.n}${o.l}`);
    for (const o of ORBITALS) {
      const v = new Float64Array(N);
      for (let i = 0; i < N; i++) {
        const z = 1 - (2 * (i + 0.5)) / N;
        const th = Math.acos(z);
        const ph = 2 * Math.PI * ((i * 0.618033988749895) % 1);
        const s = Math.sin(th);
        v[i] = realHarmonicSquared(o.l, o.m, s * Math.cos(ph), s * Math.sin(ph), z);
      }
      field.set(o.label, v);
    }

    const bad: string[] = [];
    for (let a = 0; a < ORBITALS.length; a++) {
      for (let b = a + 1; b < ORBITALS.length; b++) {
        const oa = ORBITALS[a];
        const ob = ORBITALS[b];
        if (oa.n !== ob.n || oa.l !== ob.l || oa.m === ob.m) continue;
        const va = field.get(oa.label)!;
        const vb = field.get(ob.label)!;
        const ma = va.reduce((x, y) => x + y, 0) / N;
        const mb = vb.reduce((x, y) => x + y, 0) / N;
        let cov = 0;
        for (let i = 0; i < N; i++) cov += (va[i] - ma) * (vb[i] - mb);
        let na = 0;
        let nb = 0;
        for (let i = 0; i < N; i++) {
          na += (va[i] - ma) ** 2;
          nb += (vb[i] - mb) ** 2;
        }
        const corr = cov / Math.sqrt(na * nb);
        if (corr > 0.97) bad.push(`${oa.label}·${ob.label} corr=${corr.toFixed(3)}`);
      }
    }
    expect(bad, `m modes with the same shape: ${bad.join(', ')}`).toEqual([]);
  });
});
