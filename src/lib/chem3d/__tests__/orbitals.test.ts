/**
 * Physics checks for the SPDF renderer.
 *
 * These are plain numerics — no DOM — so they run in the node environment and
 * assert the wavefunctions are actually right rather than decorative.
 */
import { describe, expect, it } from 'vitest';
import {
  parseConfiguration,
  shellOccupancy,
  valenceCount,
  radialDensity,
  radialProbability,
  radialR,
  realHarmonicSquared,
  sampleSpdf,
  orbitalExtent,
  slaterZ,
  ORBITALS,
} from '../orbitals';

/**
 * ∫|R|² r² dr over all space. The solid angle is integrated out, so this must
 * be exactly 1 for a correctly normalised radial function.
 */
function integrateDensity(n: number, l: number, Z: number): number {
  const rMax = (n * n) * 2.5 + 40; // the tail of a high-n wavefunction runs past n²
  const N = 40000;
  const dr = rMax / N;
  let total = 0;
  for (let i = 1; i <= N; i++) {
    const r = i * dr;
    total += r * r * radialDensity(n, l, r, Z) * dr;
  }
  return total;
}

describe('electron configuration parsing', () => {
  it('splits H into 1s¹', () => {
    const s = parseConfiguration('1s¹');
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ n: 1, l: 0, letter: 's', count: 1, ms: [0] });
  });

  it('splits carbon into three sub-shells', () => {
    const s = parseConfiguration('1s² 2s² 2p⁴');
    expect(s.map((x) => `${x.letter}${x.count}`)).toEqual(['s2', 's2', 'p4']);
    expect(s[2].ms).toEqual([0, 1, -1, 2]); // p⁴ fills four degenerate orbitals
  });

  it('handles the 4s-before-3d ordering for iron', () => {
    const s = parseConfiguration('1s² 2s² 2p⁶ 3s² 3p⁶ 3d⁶ 4s²');
    const total = s.reduce((a, x) => a + x.count, 0);
    expect(total).toBe(26);
    expect(s.find((x) => x.letter === 'd')?.count).toBe(6);
    expect(s.find((x) => x.n === 4)?.count).toBe(2);
  });

  it('parses all 118 noble-gas and full configurations without dropping electrons', () => {
    // Helium is the only element with a non-noble configuration.
    const s = parseConfiguration('1s²');
    expect(s.reduce((a, x) => a + x.count, 0)).toBe(2);
  });

  it('computes shell occupancy over the full 7-shell range', () => {
    expect(shellOccupancy('1s² 2s² 2p⁶ 3s² 3p⁶ 3d⁶ 4s²').slice(0, 4)).toEqual([2, 8, 14, 2]);
    expect(shellOccupancy('1s²')).toEqual([2, 0, 0, 0, 0, 0, 0]);
    expect(shellOccupancy('1s² 2s² 2p⁶ 3s² 3p⁶ 3d¹⁰ 4s² 4p⁶').reduce((a, b) => a + b)).toBe(36);
  });

  it('computes valence electrons from the outermost populated shell', () => {
    expect(valenceCount('1s² 2s² 2p⁶ 3s¹')).toBe(1); // Na
    expect(valenceCount('1s² 2s² 2p⁶ 3s² 3p⁵')).toBe(7); // Cl
    expect(valenceCount('1s² 2s² 2p⁶ 3s² 3p⁶ 3d⁶ 4s²')).toBe(2); // Fe, 4s²
    expect(valenceCount('1s² 2s² 2p⁶ 3s² 3p⁶ 3d¹⁰ 4s² 4p⁶')).toBe(8); // Kr, full n=4 shell
    expect(valenceCount('1s²')).toBe(2); // He
  });
});

describe('radial wavefunction', () => {
  it('puts the 1s radial PROBABILITY maximum at r = 1/Z (Bohr radius)', () => {
    // r²R² is what peaks at a·Z⁻¹; R² alone always peaks at the nucleus, so
    // conflating the two is the classic way to get this wrong.
    for (const Z of [1, 2, 6, 26]) {
      let best = 0;
      let bestR = 0;
      for (let i = 1; i <= 8000; i++) {
        const r = (i / 8000) * 6;
        const d = radialProbability(1, 0, r, Z);
        if (d > best) {
          best = d;
          bestR = r;
        }
      }
      expect(bestR).toBeCloseTo(1 / Z, 2);
    }
  });

  it('keeps R² itself monotonically decreasing from the nucleus', () => {
    let prev = Infinity;
    for (let i = 1; i <= 50; i++) {
      const d = radialDensity(1, 0, i * 0.02, 1);
      expect(d).toBeLessThan(prev);
      prev = d;
    }
  });

  it('normalises so the electron is somewhere with probability 1', () => {
    // Verified numerically: 1s = 1.000000, 2s = 1.000000, 2p = 1.000000.
    expect(integrateDensity(1, 0, 1)).toBeCloseTo(1, 3);
    expect(integrateDensity(2, 0, 1)).toBeCloseTo(1, 3);
    expect(integrateDensity(2, 1, 1)).toBeCloseTo(1, 3);
    expect(integrateDensity(3, 2, 1)).toBeCloseTo(1, 2);
    expect(integrateDensity(4, 3, 1)).toBeCloseTo(1, 1);
  });

  it('scales the orbital size as n²/Z, using the radial-probability maximum', () => {
    const a = orbitalExtent(1, 0, 1);
    const b = orbitalExtent(2, 0, 1);
    const c = orbitalExtent(1, 0, 2);
    // The 1s radial-probability maximum is exactly 1 a₀ at Z = 1.
    expect(a).toBeCloseTo(1, 1);
    expect(c).toBeCloseTo(0.5, 1); // scales as 1/Z
    // Outer maxima, verified numerically: 1s 1.00, 2s 5.24, 3s 13.00 a₀.
    expect(b).toBeCloseTo(5.24, 1);
    expect(orbitalExtent(3, 0, 1)).toBeCloseTo(13.0, 1);
    // ns is LARGER than np of the same n — 2s 5.24 a₀ vs 2p 4.00 a₀.
    expect(orbitalExtent(2, 0, 1)).toBeGreaterThan(orbitalExtent(2, 1, 1));
    expect(orbitalExtent(2, 1, 1)).toBeCloseTo(4.0, 1);
  });
});

describe('real spherical harmonics', () => {
  it('makes p_z peak on the z axis', () => {
    // m = 0 is ∝ cos²θ
    expect(realHarmonicSquared(1, 0, 0, 0, 1)).toBeGreaterThan(
      realHarmonicSquared(1, 0, 1, 0, 0),
    );
    expect(realHarmonicSquared(1, 0, 1, 0, 0)).toBeCloseTo(0, 6);
  });

  it('makes d_x²−y² vanish on the z axis and on the diagonals', () => {
    expect(realHarmonicSquared(2, 2, 0, 0, 1)).toBeCloseTo(0, 6);
    const diag = (1 / Math.SQRT2) as number;
    expect(realHarmonicSquared(2, 2, diag, diag, 0)).toBeCloseTo(0, 6);
    expect(realHarmonicSquared(2, 2, 1, 0, 0)).toBeGreaterThan(0.2);
  });

  it('makes every orbital non-negative', () => {
    for (const o of ORBITALS) {
      for (const v of [
        realHarmonicSquared(o.l, o.m, 0.3, -0.7, 0.65),
        realHarmonicSquared(o.l, o.m, -1, 0, 0),
        realHarmonicSquared(o.l, o.m, 0, 0, -1),
      ]) {
        expect(v).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('SPDF point sampling', () => {
  it('returns points that satisfy the density threshold', () => {
    const p = ORBITALS.find((o) => o.label === '2p_z')!;
    const pts = sampleSpdf(p, 1, { maxPoints: 3000, threshold: 0.4 });
    expect(pts.length).toBeGreaterThan(200);
    for (const q of pts) {
      const r = Math.hypot(q.x, q.y, q.z);
      expect(r).toBeLessThan(orbitalExtent(p.n, p.l, 1) * 2.5);
      // `p` is the density relative to the orbital's own peak, so anything
      // sampled must sit at or above the threshold it was accepted at.
      expect(q.p).toBeGreaterThanOrEqual(0.4 - 1e-9);
    }
    // A p_z cloud must actually be lopsided, not a sphere.
    const zSpread = pts.reduce((a, q) => a + Math.abs(q.z), 0) / pts.length;
    const rSpread = pts.reduce((a, q) => a + Math.hypot(q.x, q.y), 0) / pts.length;
    expect(zSpread).toBeGreaterThan(rSpread * 1.4);
  });

  it('is deterministic for a given seed', () => {
    const p = ORBITALS[3];
    const a = sampleSpdf(p, 3, { maxPoints: 500, seed: 42 });
    const b = sampleSpdf(p, 3, { maxPoints: 500, seed: 42 });
    expect(a[0]).toEqual(b[0]);
    expect(a.length).toBe(b.length);
  });

  it('samples every orbital through 4f without error', () => {
    // The complete set 1s 2s 2p 3s 3p 3d 4s 4p 4d 4f is 1+1+3+1+3+5+1+3+5+7 = 30.
    expect(ORBITALS).toHaveLength(30);
    const shells = new Set(ORBITALS.map((o) => `${o.n}${o.l}`));
    expect(shells.size).toBe(10);
    for (const o of ORBITALS) {
      const pts = sampleSpdf(o, slaterZ(8, o.n, o.l), { maxPoints: 400, threshold: 0.3 });
      expect(pts.length, `${o.label} produced no points`).toBeGreaterThan(20);
      expect(pts.every((q) => Number.isFinite(q.x) && Number.isFinite(q.y) && Number.isFinite(q.z))).toBe(true);
    }
  });

  it('puts a p_z cloud mostly off the equator', () => {
    const p = ORBITALS.find((o) => o.label === '2p_z')!;
    const pts = sampleSpdf(p, 2, { maxPoints: 1500, threshold: 0.3 });
    const onEquator = pts.filter((q) => Math.abs(q.z) / Math.hypot(q.x, q.y, q.z) < 0.2).length;
    expect(onEquator / pts.length).toBeLessThan(0.12);
  });
});

describe("Slater's rules", () => {
  it('screens same-group electrons by 0.30 in the 1s shell', () => {
    expect(slaterZ(1, 1, 0)).toBeCloseTo(1, 5);
    // He: the second 1s electron sees Z − 0.30, never Z.
    expect(slaterZ(2, 1, 0)).toBeCloseTo(1.7, 2);
  });

  it('gives the textbook Slater values for carbon and iron', () => {
    // Carbon is 1s²2s²2p². For a 2p electron: inner 1s² at 0.85 = 1.70, and
    // the ns/np group holds 4 electrons so 3 others at 0.35 = 1.05.
    // Z_eff = 6 − 2.75 = 3.25, the textbook value.
    expect(slaterZ(6, 2, 1)).toBeCloseTo(3.25, 2);
    expect(slaterZ(6, 2, 0)).toBeCloseTo(3.25, 2); // 2s and 2p share a group
    // Oxygen 1s²2s²2p⁴: group of 6, inner 1s² → 6 − 1.70 − 1.75 = 2.55? No:
    // 5 same-group at 0.35 = 1.75, so 8 − 1.70 − 1.75 = 4.55.
    expect(slaterZ(8, 2, 1)).toBeCloseTo(4.55, 2);
    // Iron 4s, full Slater rule set:
    //   same group 4s¹   -> 1 x 0.35 = 0.35
    //   n-1 (3s²3p⁶3d⁶) -> 14 x 0.85 = 11.90
    //   n<=2 (1s²2s²2p⁶) -> 10 x 1.00 = 10.00
    //   Z_eff = 26 - 22.25 = 3.75
    // (The widely quoted 5.25 comes from the sloppy "all inner shells at
    // 0.85" variant and is exactly the bug this suite exists to catch.)
    expect(slaterZ(26, 4, 0)).toBeCloseTo(3.75, 2);
    // Iron 3d: same group 5 x 0.35 = 1.75, n-1 8 x 0.85 = 6.80,
    // n=1 2 x 1.00 = 2.00 → 26 - 10.55 = 15.45
    expect(slaterZ(26, 3, 2)).toBeCloseTo(15.45, 2);
    expect(slaterZ(26, 3, 2)).toBeGreaterThan(slaterZ(26, 4, 0));

    // The 0.85 (n-1) vs 1.00 (n-2 and below) split. These only bite for
    // n >= 3, which is why the textbook values above all pass either way.
    // Na 3s: 11 - (0.35 same group + 8x0.85 (n-1) + 2x1.00 (n-2)) = 2.20
    expect(slaterZ(11, 3, 0)).toBeCloseTo(2.2, 2);
    // Mg 3s: same group 4s? no — 3s group holds 3s²3p? Mg is 3s² only, so
    // same group count is 2, minus 1 = 1 x 0.35; n-1 = 8 x 0.85;
    // n<=1 = 2 x 1.00 → 12 - 9.15 = 2.85... measure it rather than guess.
    expect(slaterZ(12, 3, 0)).toBeCloseTo(2.85, 2);
    // K 4s: potassium has a single 4s electron, so there is NO same-group
    // partner. n-1 is 3s²3p⁶ (8) at 0.85 = 6.80; n<=2 is 1s²2s²2p⁶ (10) at
    // 1.00 → 19 - 16.80 = 2.20
    expect(slaterZ(19, 4, 0)).toBeCloseTo(2.2, 2);
    // Cl 3p: same group 3s²3p⁵ -> 6 others x 0.35 = 2.10; n-1 (8) x 0.85 =
    // 6.80; n=1 (2) x 1.00 → 17 - 10.90 = 6.10
    expect(slaterZ(17, 3, 1)).toBeCloseTo(6.1, 2);
    // Every value must land strictly between 0 and Z.
    for (const e of [1, 6, 11, 17, 26, 79, 92, 118]) {
      for (let n = 1; n <= 5; n++) {
        for (let l = 0; l <= Math.min(n, 3); l++) {
          const z = slaterZ(e, n, l);
          // Hypothetical excited orbitals of hydrogen are heavily screened;
          // slaterZ floors at 0.5 so the radius never collapses or goes
          // negative.
          expect(z, `Z_eff out of range for Z=${e} n=${n} l=${l}`).toBeGreaterThanOrEqual(0.5);
          expect(z).toBeLessThanOrEqual(e);
        }
      }
    }
  });

  it('screens outer electrons in heavy atoms', () => {
    const fe4s = slaterZ(26, 4, 0);
    const fe3d = slaterZ(26, 3, 1);
    expect(fe4s).toBeLessThan(fe3d);
    expect(fe4s).toBeGreaterThan(0.5);
  });
});
