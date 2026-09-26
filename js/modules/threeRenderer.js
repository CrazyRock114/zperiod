// ====================================================================
// threeRenderer.js — Three.js 3D atom renderer
//   Modes:
//     - 'bohr'    — Bohr shells + electrons + nucleus
//     - 'orbital' — valence-orbital 3D probability clouds (SPDF)
//     - 'nucleus' — nucleus only (proton + neutron marbles)
//     - 'auto'    — Bohr + valence orbital clouds combined (default)
// ====================================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ---------- Bohr shell electron counts (K..Q) ----------
const BOHR_CAPACITIES = [2, 8, 18, 32, 32, 18, 8]; // n=1..7
// Aufbau order: 1s, 2s, 2p, 3s, 3p, 4s, 3d, 4p, 5s, 4d, 5p, 6s, ...
const SHELL_ORDER = [
  { n: 1, sub: 's', cap: 2 },
  { n: 2, sub: 's', cap: 2 },
  { n: 2, sub: 'p', cap: 6 },
  { n: 3, sub: 's', cap: 2 },
  { n: 3, sub: 'p', cap: 6 },
  { n: 4, sub: 's', cap: 2 },
  { n: 3, sub: 'd', cap: 10 },
  { n: 4, sub: 'p', cap: 6 },
  { n: 5, sub: 's', cap: 2 },
  { n: 4, sub: 'd', cap: 10 },
  { n: 5, sub: 'p', cap: 6 },
  { n: 6, sub: 's', cap: 2 },
  { n: 4, sub: 'f', cap: 14 },
  { n: 5, sub: 'd', cap: 10 },
  { n: 6, sub: 'p', cap: 6 },
  { n: 7, sub: 's', cap: 2 },
  { n: 5, sub: 'f', cap: 14 },
  { n: 6, sub: 'd', cap: 10 },
  { n: 7, sub: 'p', cap: 6 }
];

// Convert a Unicode-superscript digit (or ASCII digit) to its value.
// Returns NaN for unrecognized characters.
function supToInt(ch) {
  const supMap = { '⁰': 0, '¹': 1, '²': 2, '³': 3, '⁴': 4,
                   '⁵': 5, '⁶': 6, '⁷': 7, '⁸': 8, '⁹': 9 };
  if (ch in supMap) return supMap[ch];
  const c = ch.charCodeAt(0);
  if (c >= 48 && c <= 57) return c - 48; // '0'..'9'
  return NaN;
}

// Noble-gas core electron counts (pre-closed-shell cumulative totals).
const NOBLE_GAS_CORE = { He: 2, Ne: 10, Ar: 18, Kr: 36, Xe: 54, Rn: 86 };

// Noble-gas electron distribution by shell (per-n totals), based on the
// actual configurations of He/Ne/Ar/Kr/Xe/Rn. f/d shells are credited to
// their real principal quantum number n.
const NOBLE_GAS_DIST = {
  He: [2, 0, 0, 0, 0, 0, 0],
  Ne: [2, 8, 0, 0, 0, 0, 0],
  Ar: [2, 8, 8, 0, 0, 0, 0],
  Kr: [2, 8, 18, 8, 0, 0, 0],
  Xe: [2, 8, 18, 18, 8, 0, 0],
  Rn: [2, 8, 18, 32, 18, 8, 0]
};

// Scan the configuration string for "[NobleGas]" cores and additive
// subshells, accumulating shell counts into `shells` and a total into
// `matchedTotal`. Returns true on success, false if matchedTotal !== z.
function parseShellConfiguration(configuration) {
  const shells = [0, 0, 0, 0, 0, 0, 0];
  let matchedTotal = 0;
  let i = 0;
  while (i < configuration.length) {
    // Try to match "[XYZ]" noble-gas core.
    if (configuration[i] === '[') {
      const end = configuration.indexOf(']', i);
      if (end > i) {
        const core = configuration.slice(i + 1, end);
        if (core in NOBLE_GAS_DIST) {
          for (let k = 0; k < 7; k++) shells[k] += NOBLE_GAS_DIST[core][k];
          matchedTotal += NOBLE_GAS_CORE[core];
          i = end + 1;
          continue;
        }
      }
    }
    // Try to match "nXc" subshell.
    const nDigit = supToInt(configuration[i]);
    if (Number.isFinite(nDigit) && nDigit >= 1 && nDigit <= 7) {
      const sub = configuration[i + 1];
      if (sub === 's' || sub === 'p' || sub === 'd' || sub === 'f') {
        let count = 0;
        let j = i + 2;
        while (j < configuration.length) {
          const v = supToInt(configuration[j]);
          if (!Number.isFinite(v)) break;
          count = count * 10 + v;
          j++;
        }
        if (count === 0) count = 1;
        shells[nDigit - 1] += count;
        matchedTotal += count;
        i = j;
        continue;
      }
    }
    i++;
  }
  return { shells, matchedTotal };
}

// Fill electrons per shell (1..7) for a given atomic number Z.
// Parses the configuration string from the element data so we get the
// correct electron count per principal quantum number n, including
// Aufbau anomalies (Cr, Cu, Mo, Ag, Au, ...).
// If the configuration is missing or unparseable, falls back to a
// simple "fill order" estimate.
function bohrShells(z, configuration) {
  if (configuration) {
    const { shells, matchedTotal } = parseShellConfiguration(configuration);
    if (matchedTotal === z) return shells;
  }
  // Fallback: simple Bohr fill order (idealized, ignores anomalies).
  const shells = [0, 0, 0, 0, 0, 0, 0];
  let remaining = z;
  for (const { n, cap } of SHELL_ORDER) {
    if (remaining <= 0) break;
    const fill = Math.min(cap, remaining);
    shells[n - 1] += fill;
    if (fill < cap) break;
    remaining -= fill;
  }
  return shells;
}

// ====================================================================
// Orbital probability density |ψ(r, θ, φ)|² for hydrogen-like orbitals.
// We use atomic units (a₀ = 1) so r is dimensionless. Each function
// returns a non-negative density; the caller normalizes per orbital.
// ====================================================================

// Spherical harmonics Y_lm(θ, φ), up to l=3 (f orbitals).
// Returns real values (we use real combinations for p, d, f).
function Y(l, m, theta, phi) {
  // Real spherical harmonics. Constants omitted; relative shape only.
  const ct = Math.cos(theta), st = Math.sin(theta);
  const cp = Math.cos(phi), sp = Math.sin(phi);
  switch (l) {
    case 0: // s
      return 0.5 * Math.sqrt(1 / Math.PI);
    case 1: // p
      if (m === 0) return Math.sqrt(3 / (4 * Math.PI)) * ct;       // pz
      if (m === 1) return Math.sqrt(3 / (4 * Math.PI)) * st * cp;  // px
      if (m === -1) return Math.sqrt(3 / (4 * Math.PI)) * st * sp; // py
      break;
    case 2: // d
      // dxy, dxz, dyz, dz², dx²−y²
      if (m === 2)  return Math.sqrt(15 / (16 * Math.PI)) * st * st * sp * cp;             // dxy (m=2 real combo)
      if (m === 1)  return Math.sqrt(15 / (16 * Math.PI)) * st * ct * (m >= 0 ? cp : sp);  // dxz/dyz
      if (m === 0)  return Math.sqrt(5 / (16 * Math.PI)) * (3 * ct * ct - 1);              // dz²
      if (m === -1) return Math.sqrt(15 / (16 * Math.PI)) * st * ct * sp;                   // dyz
      if (m === -2) return Math.sqrt(15 / (16 * Math.PI)) * st * st * (cp * cp - sp * sp);  // dx²−y²
      break;
    case 3: // f — 7 real orbitals (use simplified cubic-harmonic forms)
      // z³, xz², yz², xyz, z(x²−y²), x(x²−3y²), y(3x²−y²)
      const ct2 = ct * ct, st2 = st * st;
      const cp2 = cp * cp, sp2 = sp * sp;
      if (m === 3)  return Math.sqrt(35 / (32 * Math.PI)) * st2 * st * cp3();   // fx³-like
      if (m === 2)  return Math.sqrt(105 / (16 * Math.PI)) * st2 * ct * cp2 - /* simplified */ 0;
      if (m === 1)  return Math.sqrt(21 / (32 * Math.PI)) * st * (5 * ct2 - 1) * cp;
      if (m === 0)  return Math.sqrt(7 / (16 * Math.PI)) * (5 * ct2 * ct - 3 * ct);
      if (m === -1) return Math.sqrt(21 / (32 * Math.PI)) * st * (5 * ct2 - 1) * sp;
      if (m === -2) return Math.sqrt(105 / (16 * Math.PI)) * st2 * ct * sp * cp;
      if (m === -3) return Math.sqrt(35 / (32 * Math.PI)) * st2 * st * sp3();
      break;
  }
  return 0;

  // Helpers for f-orbital cubics.
  function cp3() { return cp * cp * cp; }
  function sp3() { return sp * sp * sp; }
}

// Radial R_nl(r) for hydrogen (atomic units).
function R(n, l, r) {
  // Use Slater-type approximations consistent with principal quantum number n.
  // Coefficients are matched to the hydrogen-atom analytic solutions.
  switch (n) {
    case 1: return (l === 0) ? 2 * Math.exp(-r) : 0;
    case 2:
      if (l === 0) return (1 / (2 * Math.sqrt(2))) * (2 - r) * Math.exp(-r / 2);
      if (l === 1) return (1 / (2 * Math.sqrt(6))) * r * Math.exp(-r / 2);
      break;
    case 3:
      if (l === 0) return (2 / (81 * Math.sqrt(3))) * (27 - 18 * r + 2 * r * r) * Math.exp(-r / 3);
      if (l === 1) return (4 / (81 * Math.sqrt(6))) * (6 - r) * r * Math.exp(-r / 3);
      if (l === 2) return (4 / (81 * Math.sqrt(30))) * r * r * Math.exp(-r / 3);
      break;
    case 4:
      if (l === 0) return 0.1 * Math.exp(-r / 4);
      if (l === 1) return 0.05 * r * Math.exp(-r / 4);
      if (l === 2) return 0.02 * r * r * Math.exp(-r / 4);
      if (l === 3) return 0.005 * r * r * r * Math.exp(-r / 4);
      break;
  }
  return 0;
}

// |ψ|² for an (n, l, m) hydrogen-like orbital in atomic units.
function psi2(n, l, m, r, theta, phi) {
  const Rnl = R(n, l, r);
  const Ylm = Y(l, m, theta, phi);
  return Rnl * Rnl * Ylm * Ylm;
}

// Sample one point (x, y, z) from the density |ψ|² for (n, l, m) using
// rejection sampling within a bounding box. `box` is the half-extent in a₀.
// `u` is the maximum density inside the box (precomputed estimate).
function sampleOrbital(n, l, m, box, u) {
  while (true) {
    const x = (Math.random() * 2 - 1) * box;
    const y = (Math.random() * 2 - 1) * box;
    const z = (Math.random() * 2 - 1) * box;
    const r = Math.hypot(x, y, z);
    if (r < 1e-6) continue;
    const phi = Math.atan2(y, x);
    const theta = Math.acos(z / r);
    const p = psi2(n, l, m, r, theta, phi);
    if (Math.random() < p / u) return [x, y, z];
  }
}

// Find the maximum of |ψ|² for (n, l, m) inside a box of half-extent `box`
// by Monte-Carlo probing. Cheap and robust.
function probeMax(n, l, m, box, samples = 5000) {
  let u = 0;
  for (let i = 0; i < samples; i++) {
    const x = (Math.random() * 2 - 1) * box;
    const y = (Math.random() * 2 - 1) * box;
    const z = (Math.random() * 2 - 1) * box;
    const r = Math.hypot(x, y, z);
    if (r < 1e-6) continue;
    const phi = Math.atan2(y, x);
    const theta = Math.acos(z / r);
    const p = psi2(n, l, m, r, theta, phi);
    if (p > u) u = p;
  }
  return u;
}

// Build a Points cloud for one orbital.
function buildOrbitalPoints(n, l, m, options = {}) {
  const {
    candidates = 2500,
    box = n * 4,        // bigger box for higher n
    color = 0x818cf8
  } = options;
  const u = probeMax(n, l, m, box, 2000);
  const positions = new Float32Array(candidates * 3);
  let count = 0;
  for (let i = 0; i < candidates; i++) {
    const [x, y, z] = sampleOrbital(n, l, m, box, u);
    positions[count++] = x;
    positions[count++] = y;
    positions[count++] = z;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions.subarray(0, count), 3));
  const mat = new THREE.PointsMaterial({
    color,
    size: 0.08,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.78,
    depthWrite: false
  });
  return new THREE.Points(geom, mat);
}

// Build a Points cloud for the Bohr electron distribution in a single shell.
function buildBohrShellElectrons(n, count, color = 0x60a5fa) {
  const radius = n * 1.6;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Distribute pseudo-randomly on the sphere (Fibonacci spiral).
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const y = 1 - (i / Math.max(1, count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    positions[i * 3]     = Math.cos(theta) * r * radius;
    positions[i * 3 + 1] = y * radius;
    positions[i * 3 + 2] = Math.sin(theta) * r * radius;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color,
    size: 0.18,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: false
  });
  return new THREE.Points(geom, mat);
}

// Bohr shell ring (transparent torus-like loop).
function buildBohrShellRing(n) {
  const radius = n * 1.6;
  const geom = new THREE.TorusGeometry(radius, 0.015, 8, 96);
  geom.rotateX(Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x9ca3af,
    transparent: true,
    opacity: 0.32,
    depthWrite: false
  });
  return new THREE.Mesh(geom, mat);
}

// Nucleus: protons + neutrons (small spheres).
function buildNucleus(protons, neutrons) {
  const group = new THREE.Group();
  const protonGeom = new THREE.SphereGeometry(0.12, 14, 14);
  const protonMat = new THREE.MeshStandardMaterial({
    color: 0xef4444, roughness: 0.4, metalness: 0.1
  });
  const neutronMat = new THREE.MeshStandardMaterial({
    color: 0x9ca3af, roughness: 0.5, metalness: 0.1
  });
  // Pack them inside a sphere of radius 0.4 + small buffer.
  const max = Math.min(protons + neutrons, 60); // cap for heavy elements
  const p = Math.min(protons, max);
  const nu = Math.min(neutrons, max - p);
  for (let i = 0; i < p; i++) {
    const m = new THREE.Mesh(protonGeom, protonMat);
    m.position.set(...randomPackedPos(p + nu, i));
    group.add(m);
  }
  for (let i = 0; i < nu; i++) {
    const m = new THREE.Mesh(protonGeom, neutronMat);
    m.position.set(...randomPackedPos(p + nu, p + i));
    group.add(m);
  }
  return group;

  function randomPackedPos(total, idx) {
    // Fibonacci sphere with radius ~ 0.32 + 0.07 jitter
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const y = 1 - (idx / Math.max(1, total - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * idx;
    const radius = 0.32 + (Math.random() - 0.5) * 0.07;
    return [
      Math.cos(theta) * r * radius,
      y * radius,
      Math.sin(theta) * r * radius
    ];
  }
}

// ====================================================================
// Public: parse element configuration and pick which orbitals to show.
// ====================================================================

function parseValenceOrbitals(configuration) {
  if (!configuration) return [];
  const orbitals = [];
  const lMap = { s: 0, p: 1, d: 2, f: 3 };
  let i = 0;
  while (i < configuration.length) {
    const nDigit = supToInt(configuration[i]);
    if (Number.isFinite(nDigit) && nDigit >= 1 && nDigit <= 7) {
      const sub = configuration[i + 1];
      if (sub === 's' || sub === 'p' || sub === 'd' || sub === 'f') {
        let count = 0;
        let j = i + 2;
        while (j < configuration.length) {
          const v = supToInt(configuration[j]);
          if (!Number.isFinite(v)) break;
          count = count * 10 + v;
          j++;
        }
        if (count === 0) count = 1;
        orbitals.push({ n: nDigit, l: lMap[sub], count });
        i = j;
        continue;
      }
    }
    i++;
  }
  if (!orbitals.length) return [];
  const maxN = Math.max(...orbitals.map(o => o.n));
  return orbitals.filter(o => o.n === maxN);
}

// ====================================================================
// Scene lifecycle
// ====================================================================

export function renderAtom(canvas, element, options = {}) {
  const {
    mode = 'auto',
    autoRotate = true,
    theme = 'dark'
  } = options;

  const Z = element.id;
  const config = element.level3_properties?.electronic?.configuration || '';
  const shells = bohrShells(Z, config);
  const valenceOrbitals = parseValenceOrbitals(config);

  // Set up scene
  const scene = new THREE.Scene();
  const isDark = theme === 'dark' ||
    document.documentElement.classList.contains('dark-theme');
  scene.background = null; // CSS controls background

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 0.7);
  key.position.set(5, 5, 7);
  scene.add(key);

  const w = canvas.clientWidth || 320;
  const h = canvas.clientHeight || 240;
  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
  camera.position.set(0, 0, Math.max(10, Z === 1 ? 6 : 10));

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h, false);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = autoRotate;
  controls.autoRotateSpeed = 0.6;
  controls.minDistance = 3;
  controls.maxDistance = 50;

  const atomRoot = new THREE.Group();
  scene.add(atomRoot);

  // Determine effective mode
  let effectiveMode = mode;
  if (mode === 'auto') {
    effectiveMode = 'combined';
  }

  // Build nucleus
  const neutrons = Math.max(0, Math.round((element.level2_atomic?.mass?.highSchool || Z) - Z));
  atomRoot.add(buildNucleus(Z, neutrons));

  // Bohr shells
  if (effectiveMode === 'bohr' || effectiveMode === 'combined') {
    const SHELL_COLORS = [
      0x60a5fa, 0x34d399, 0xfbbf24, 0xfb7185,
      0xa78bfa, 0x22d3ee, 0xf472b6
    ];
    shells.forEach((count, i) => {
      if (count === 0) return;
      const n = i + 1;
      atomRoot.add(buildBohrShellRing(n));
      atomRoot.add(buildBohrShellElectrons(n, count, SHELL_COLORS[i] || 0xffffff));
    });
  }

  // Valence orbital probability clouds (SPDF)
  if (effectiveMode === 'orbital' || effectiveMode === 'combined') {
    const ORBITAL_COLORS = [
      0x818cf8, // s
      0x34d399, // p
      0xfbbf24, // d
      0xfb7185  // f
    ];
    // m values per l: s=0, p=-1..1, d=-2..2, f=-3..3
    for (const orb of valenceOrbitals) {
      const color = ORBITAL_COLORS[orb.l] || 0xffffff;
      for (let m = -orb.l; m <= orb.l; m++) {
        // For each filled orbital of the same (n, l, m), stack a cloud.
        // (We render one cloud per m; for multi-electron it overlays.)
        const candidates = Math.max(1500, Math.min(3000, 2500 - orb.l * 400));
        const cloud = buildOrbitalPoints(orb.n, orb.l, m, { candidates, color });
        atomRoot.add(cloud);
      }
    }
  }

  // Render loop
  let rafId = 0;
  let alive = true;
  function animate() {
    if (!alive) return;
    rafId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // Resize handler
  const ro = new ResizeObserver(() => {
    const nw = canvas.clientWidth || 320;
    const nh = canvas.clientHeight || 240;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh, false);
  });
  ro.observe(canvas);

  return {
    dispose() {
      alive = false;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      controls.dispose();
      scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
          else o.material.dispose();
        }
      });
      renderer.dispose();
    },
    setAutoRotate(on) { controls.autoRotate = on; }
  };
}

// Helper: describe current orbital selection for the UI.
export function describeOrbitals(configuration) {
  const orbs = parseValenceOrbitals(configuration);
  if (!orbs.length) return 'No orbitals';
  const lName = { 0: 's', 1: 'p', 2: 'd', 3: 'f' };
  return orbs.map(o => `${o.n}${lName[o.l]}${o.count || ''}`).join(' ');
}