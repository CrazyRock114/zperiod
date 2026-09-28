import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { sampleSpdf, shellOccupancy, slaterZ, ORBITALS, type OrbitalDef } from '../lib/chem3d/orbitals';

/* ------------------------------------------------------------------ */
/* Imperative handle                                                   */
/* ------------------------------------------------------------------ */

export interface AtomHandle {
  /** Add a quantum number of angular momentum to every shell. */
  spinUp: () => void;
  spinDown: () => void;
  resetSpin: () => void;
  resetView: () => void;
  setAutoRotate: (v: boolean) => void;
  setStyle: (s: AtomStyle) => void;
  setLabels: (v: boolean) => void;
  setNucleusScale: (v: number) => void;
  screenshot: (type?: 'image/png' | 'image/jpeg', quality?: number) => string | null;
}

export type AtomStyle = 'bohr' | 'cloud' | 'ball';

const WEBGL_FALLBACK = '3D needs WebGL, which this browser has turned off.';

export interface AtomProps {
  atomicNumber: number;
  symbol: string;
  /** Neutrons — derived from the most common isotope when null. */
  neutrons?: number | null;
  /** Electrons — override for ions; defaults to the neutral count. */
  electrons?: number | null;
  /** Full electron configuration string, used for cloud mode. */
  configuration?: string;
  style?: AtomStyle;
  autoRotate?: boolean;
  showLabels?: boolean;
  nucleusScale?: number;
  /** Accent colour for electrons, from the element's category. */
  accent?: string;
  className?: string;
  /** Disable the render loop entirely (e.g. offscreen). */
  paused?: boolean;
  onSpinChange?: (l: number) => void;
  ref?: React.Ref<AtomHandle>;
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

/** Thrown when the browser cannot give us a WebGL context. */
export class WebGLUnavailableError extends Error {
  constructor() {
    super('WebGL is not available in this browser');
    this.name = 'WebGLUnavailableError';
  }
}

const PROTON_COLOR = new THREE.Color('#ff5a5a');
const NEUTRON_COLOR = new THREE.Color('#4d7dff');
const ORBITAL_COLORS: Record<number, number> = {
  0: 0xfeca57, // s
  1: 0x48dbfb, // p
  2: 0x1dd1a1, // d
  3: 0xff6b9d, // f
};

class AtomScene {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private root = new THREE.Group();
  private nucleus = new THREE.Group();
  private shellGroup = new THREE.Group();
  private cloudGroup = new THREE.Group();
  private ringGroup = new THREE.Group();
  private lights: THREE.Light[] = [];
  private stars: THREE.Points | null = null;

  private shellMeshes: Array<{ ring: THREE.Mesh; electrons: THREE.Mesh[]; radius: number }> = [];
  private electronsMesh: THREE.Points | null = null;
  private cloudPoints: THREE.Points | null = null;
  private orbitalCloud: THREE.Points | null = null;

  private raf = 0;
  private ro: ResizeObserver | null = null;
  private disposed = false;
  private paused = false;

  private spinL = 0;
  private targetSpinL = 0;
  private autoRotate = true;
  private drag = false;
  private lastX = 0;
  private lastY = 0;
  private velX = 0;
  private velY = 0;
  private spinSpeed = 1;
  private nucleusScale = 1;
  private style: AtomStyle = 'bohr';
  private labels = false;
  private accent = new THREE.Color('#8b85ff');
  private labelSprites: THREE.Sprite[] = [];

  private clock = new THREE.Clock();
  private disposedCount = 0;

  constructor(private canvas: HTMLCanvasElement) {
    // three.js throws "Error creating WebGL context" when WebGL is
    // unavailable (hardware acceleration disabled, headless, old driver,
    // some privacy browsers). That propagated out of the lazy import and took
    // the whole page with it. Detect first and let the caller show a fallback.
    const probe = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!probe) throw new WebGLUnavailableError();
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    this.camera.position.set(0, 6, 46);

    this.scene.add(this.root);
    this.root.add(this.nucleus, this.shellGroup, this.cloudGroup, this.ringGroup);

    // Lighting: one key, one warm fill, one cool rim.
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(8, 12, 18);
    const fill = new THREE.DirectionalLight(0x6ba3ff, 0.85);
    fill.position.set(-14, -6, 8);
    const rim = new THREE.PointLight(0xffffff, 60, 120);
    rim.position.set(0, 0, 0);
    const amb = new THREE.AmbientLight(0x404a6a, 0.7);
    this.lights = [key, fill, rim, amb];
    for (const l of this.lights) this.scene.add(l);

    this.addStars();
    this.attachEvents();
    this.loop();
  }

  /* ---------------- static chrome ---------------- */

  private addStars() {
    const N = 900;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 120 + Math.random() * 60;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      pos[i * 3 + 2] = r * Math.cos(ph);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({
      color: 0x9fb0d8,
      size: 0.55,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.75,
    });
    this.stars = new THREE.Points(g, m);
    this.scene.add(this.stars);
  }

  /* ---------------- input ---------------- */

  private attachEvents() {
    const c = this.canvas;
    c.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    c.addEventListener('wheel', this.onWheel, { passive: false });

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(c.parentElement ?? c);
    this.resize();
  }

  private onDown = (e: PointerEvent) => {
    this.drag = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.canvas.setPointerCapture?.(e.pointerId);
  };

  private onMove = (e: PointerEvent) => {
    if (!this.drag) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.velX += dy * 0.005;
    this.velY += dx * 0.005;
  };

  private onUp = (e: PointerEvent) => {
    this.drag = false;
    this.canvas.releasePointerCapture?.(e.pointerId);
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const d = THREE.MathUtils.clamp(e.deltaY * 0.05, -6, 6);
    this.camera.position.multiplyScalar(1 + d * 0.06);
    this.camera.position.clampLength(18, 140);
  };

  private resize() {
    const el = this.canvas.parentElement ?? this.canvas;
    const w = Math.max(1, el.clientWidth);
    const h = Math.max(1, el.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /* ---------------- content ---------------- */

  /** Rebuild everything for a new element / ion. */
  setContent(opts: {
    protons: number;
    neutrons: number;
    electrons: number;
    configuration?: string;
    symbol?: string;
  }) {
    this.clearGroup(this.nucleus);
    this.clearGroup(this.shellGroup);
    this.clearGroup(this.cloudGroup);
    this.clearGroup(this.ringGroup);
    this.shellMeshes = [];
    this.labelSprites = [];
    this.electronsMesh = null;
    this.cloudPoints = null;
    this.orbitalCloud = null;

    this.buildNucleus(opts.protons, opts.neutrons);
    this.buildShells(opts.electrons);

    if (opts.configuration) {
      const Z = slaterZ(opts.protons, 1, 0);
      // Pick the orbital that holds the outermost electron.
      const orbit = this.pickHighlightOrbital(opts.configuration);
      if (orbit) this.buildElectronCloud(orbit, Z);
    }

    if (opts.symbol) this.buildShellLabels(opts.symbol);
  }

  /** The valence orbital: highest n, highest l with electrons. */
  private pickHighlightOrbital(configuration: string): OrbitalDef | null {
    const shells = shellOccupancy(configuration);
    let n = 1;
    for (let i = 0; i < shells.length; i++) if (shells[i] > 0) n = i + 1;
    const best = ORBITALS.filter((o) => o.n === n).sort((a, b) => b.l - a.l)[0];
    return best ?? null;
  }

  private buildNucleus(protons: number, neutrons: number) {
    const total = Math.max(1, protons + neutrons);
    const protoR = total <= 20 ? 1.15 : total <= 60 ? 0.95 : 0.82;
    const geoP = new THREE.SphereGeometry(protoR, 24, 18);
    const geoN = new THREE.SphereGeometry(protoR, 24, 18);
    const matP = new THREE.MeshStandardMaterial({
      color: PROTON_COLOR,
      roughness: 0.42,
      metalness: 0.15,
      emissive: 0x3a0808,
      emissiveIntensity: 0.55,
    });
    const matN = new THREE.MeshStandardMaterial({
      color: NEUTRON_COLOR,
      roughness: 0.55,
      metalness: 0.1,
      emissive: 0x08123a,
      emissiveIntensity: 0.5,
    });

    // Pack nucleons on a Fibonacci sphere so the nucleus reads as a sphere
    // rather than a jittery blob.
    const place = (count: number, mat: THREE.Material, offset: number) => {
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count;
        const phi = Math.acos(1 - 2 * t);
        const theta = Math.PI * (1 + Math.sqrt(5)) * (i + offset);
        const rr = protoR * 1.02 * Math.cbrt(count) * 0.42;
        const m = new THREE.Mesh(geoP, mat);
        m.position.set(
          rr * Math.sin(phi) * Math.cos(theta),
          rr * Math.sin(phi) * Math.sin(theta),
          rr * Math.cos(phi),
        );
        this.nucleus.add(m);
        this.disposedCount++;
      }
    };
    place(protons, matP, 0);
    if (neutrons > 0) place(neutrons, matN, 0.5);

    this.nucleus.scale.setScalar(this.nucleusScale);
  }

  private buildShells(electrons: number) {
    const perShell = [2, 8, 18, 32, 32, 18, 8];
    let left = electrons;
    let shellIdx = 0;

    while (left > 0 && shellIdx < 7) {
      const take = Math.min(perShell[shellIdx], left);
      left -= take;
      shellIdx++;

      const n = shellIdx;
      const radius = 7 + (n - 1) * 4.4;

      // Orient each shell randomly so the atom never looks like a target.
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.055, 8, 128),
        new THREE.MeshBasicMaterial({
          color: 0x5a6a94,
          transparent: true,
          opacity: n === shellIdx ? 0.55 : 0.4,
        }),
      );
      ring.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.shellGroup.add(ring);

      // Ring glow for the outermost shell only — draws the eye to valence.
      if (shellIdx >= 0 && n === shellIdx && left === 0) {
        const glow = new THREE.Mesh(
          new THREE.TorusGeometry(radius, 0.12, 8, 128),
          new THREE.MeshBasicMaterial({ color: this.accent.getHex(), transparent: true, opacity: 0.16 }),
        );
        glow.rotation.copy(ring.rotation);
        this.shellGroup.add(glow);
      }

      const eGeo = new THREE.SphereGeometry(0.42, 16, 12);
      const eMat = new THREE.MeshStandardMaterial({
        color: this.accent,
        emissive: this.accent,
        emissiveIntensity: 0.85,
        roughness: 0.3,
      });
      const electrons: THREE.Mesh[] = [];
      for (let i = 0; i < take; i++) {
        const e = new THREE.Mesh(eGeo, eMat);
        e.userData.angle = (i / take) * Math.PI * 2;
        e.userData.n = n;
        electrons.push(e);
        this.shellGroup.add(e);
      }
      this.shellMeshes.push({ ring, electrons, radius });
    }
  }

  private buildElectronCloud(orbital: OrbitalDef, Z: number) {
    const pts = sampleSpdf(orbital, Z, { maxPoints: 7000, threshold: 0.42 });
    if (!pts.length) return;
    const positions = new Float32Array(pts.length * 3);
    const colors = new Float32Array(pts.length * 3);
    const c = new THREE.Color(ORBITAL_COLORS[orbital.l] ?? 0xffffff);
    for (let i = 0; i < pts.length; i++) {
      positions[i * 3] = pts[i].x * 6.2;
      positions[i * 3 + 1] = pts[i].y * 6.2;
      positions[i * 3 + 2] = pts[i].z * 6.2;
      // Tint by local density: bright core, cool fringe.
      const k = 0.35 + pts[i].p * 0.65;
      colors[i * 3] = c.r * k;
      colors[i * 3 + 1] = c.g * k;
      colors[i * 3 + 2] = c.b * k;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const m = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.cloudPoints = new THREE.Points(g, m);
    this.orbitalCloud = this.cloudPoints;
    this.cloudGroup.add(this.cloudPoints);
  }

  private buildShellLabels(symbol: string) {
    this.labelSprites = [];
  }

  /* ---------------- render ---------------- */

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    if (this.paused) return;

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;

    // Inertia from dragging.
    this.root.rotation.y += this.velX;
    this.root.rotation.x += this.velY;
    this.velX *= 0.94;
    this.velY *= 0.94;
    if (Math.abs(this.velX) < 1e-5) this.velX = 0;
    if (Math.abs(this.velY) < 1e-5) this.velY = 0;
    if (this.autoRotate && !this.drag) this.root.rotation.y += dt * 0.11;

    // Smooth the Bohr angular-momentum spin toward its target.
    this.spinL += (this.targetSpinL - this.spinL) * 0.08;

    const showRings = this.style === 'bohr' || this.style === 'cloud';

    for (const { ring, electrons, radius } of this.shellMeshes) {
      ring.visible = showRings;
      if (this.style === 'ball' && electrons.length > 0) ring.material = (ring.material as THREE.MeshBasicMaterial);
      const w = 0.35 + this.spinL * 0.42 * (electrons[0]?.userData.n ?? 1);
      for (const e of electrons) {
        e.visible = this.style !== 'cloud';
        if (!e.visible) continue;
        const a = (e.userData.angle as number) + t * w * this.spinSpeed;
        // Project the ring's own frame so the electron rides the tilted orbit.
        const local = new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0);
        local.applyEuler(ring.rotation);
        e.position.copy(local);
      }
    }

    if (this.cloudPoints) {
      this.cloudPoints.visible = this.style === 'cloud';
      this.cloudPoints.rotation.y = t * 0.06;
      this.cloudPoints.rotation.x = Math.sin(t * 0.2) * 0.08;
    }
    this.nucleus.rotation.y = -t * 0.16;

    if (this.stars) this.stars.rotation.y = t * 0.006;

    this.renderer.render(this.scene, this.camera);
  };

  /* ---------------- mutation API ---------------- */

  setStyle(s: AtomStyle) {
    this.style = s;
    this.cloudGroup.visible = s === 'cloud';
    this.nucleus.visible = s !== 'ball';
    if (s === 'ball') this.shellGroup.visible = false;
    else this.shellGroup.visible = true;
  }

  setAutoRotate(v: boolean) {
    this.autoRotate = v;
  }

  setLabels(v: boolean) {
    this.labels = v;
    for (const s of this.labelSprites) s.visible = v;
  }

  setNucleusScale(v: number) {
    this.nucleusScale = THREE.MathUtils.clamp(v, 0.4, 2.2);
    this.nucleus.scale.setScalar(this.nucleusScale);
  }

  setAccent(hex: string) {
    try {
      this.accent.set(hex);
    } catch {
      /* keep previous */
    }
    this.shellMeshes.forEach((s, i) => {
      s.electrons.forEach((e) => {
        const m = e.material as THREE.MeshStandardMaterial;
        m.color.copy(this.accent);
        m.emissive.copy(this.accent);
      });
      if (i === this.shellMeshes.length - 1) {
        s.ring.children.length;
      }
    });
  }

  spinUp() {
    this.targetSpinL = Math.min(this.targetSpinL + 1, 3);
  }
  spinDown() {
    this.targetSpinL = Math.max(this.targetSpinL - 1, 0);
  }
  resetSpin() {
    this.targetSpinL = 0;
    this.spinL = 0;
  }
  getSpinL() {
    return this.targetSpinL;
  }

  resetView() {
    this.camera.position.set(0, 6, 46);
    this.root.rotation.set(0, 0, 0);
  }

  screenshot(type = 'image/png', quality = 0.92): string | null {
    try {
      this.renderer.render(this.scene, this.camera);
      return this.renderer.domElement.toDataURL(type, quality);
    } catch {
      return null;
    }
  }

  setPaused(v: boolean) {
    this.paused = v;
  }

  /* ---------------- teardown ---------------- */

  private clearGroup(g: THREE.Group) {
    for (let i = g.children.length - 1; i >= 0; i--) {
      const child = g.children[i] as THREE.Mesh | THREE.Points;
      g.remove(child);
      // Geometry and material are shared across meshes within a shell, so
      // only dispose the ones we created per-object.
      const mesh = child as THREE.Mesh;
      if (mesh.userData.ownGeometry) mesh.geometry?.dispose();
      const mat = (child as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    }
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.ro?.disconnect();

    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    this.renderer.dispose();
  }
}

/* ------------------------------------------------------------------ */
/* React wrapper                                                       */
/* ------------------------------------------------------------------ */

export const Atom3D = React.forwardRef<AtomHandle, AtomProps>(function Atom3D(props, ref) {
  const {
    atomicNumber,
    neutrons,
    electrons,
    configuration,
    symbol,
    style = 'bohr',
    autoRotate = true,
    nucleusScale = 1,
    accent = '#8b85ff',
    className = '',
    paused = false,
    onSpinChange,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<AtomScene | null>(null);
  const spinRef = useRef(0);

  const [webglFailed, setWebglFailed] = useState(false);

  // Build once.
  useEffect(() => {
    if (!canvasRef.current) return;
    let s: AtomScene | null = null;
    try {
      s = new AtomScene(canvasRef.current);
      sceneRef.current = s;
    } catch (err) {
      console.warn('[3D]', err);
      setWebglFailed(true);
    }
    return () => {
      s?.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Content changes.
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    const p = atomicNumber;
    const n = Math.max(0, neutrons ?? Math.round(atomicNumber * 0.6));
    const e = electrons ?? atomicNumber;
    s.setAccent(accent);
    s.setStyle(style);
    s.setNucleusScale(nucleusScale);
    s.setContent({ protons: p, neutrons: n, electrons: e, configuration, symbol });
  }, [atomicNumber, neutrons, electrons, configuration, symbol, accent, style, nucleusScale]);

  useEffect(() => {
    sceneRef.current?.setAutoRotate(autoRotate);
  }, [autoRotate]);

  useEffect(() => {
    sceneRef.current?.setPaused(paused);
  }, [paused]);

  useImperativeHandle(
    ref,
    () => ({
      spinUp: () => {
        const s = sceneRef.current;
        if (!s) return;
        s.spinUp();
        spinRef.current = s.getSpinL();
        onSpinChange?.(spinRef.current);
      },
      spinDown: () => {
        const s = sceneRef.current;
        if (!s) return;
        s.spinDown();
        spinRef.current = s.getSpinL();
        onSpinChange?.(spinRef.current);
      },
      resetSpin: () => {
        sceneRef.current?.resetSpin();
        spinRef.current = 0;
        onSpinChange?.(0);
      },
      resetView: () => sceneRef.current?.resetView(),
      setAutoRotate: (v) => sceneRef.current?.setAutoRotate(v),
      setStyle: (v) => sceneRef.current?.setStyle(v),
      setLabels: (v) => sceneRef.current?.setLabels(v),
      setNucleusScale: (v) => sceneRef.current?.setNucleusScale(v),
      screenshot: (type, q) => sceneRef.current?.screenshot(type, q) ?? null,
    }),
    [onSpinChange],
  );

  if (webglFailed) {
    return (
      <div className={`atom-stage grid place-items-center ${className}`}>
        <div className="max-w-[80%] text-center">
          <p className="text-2xl">🧪</p>
          <p className="mt-1 text-[11.5px] font-semibold">{symbol ?? atomicNumber}</p>
          <p className="mt-0.5 text-[11px] faint">{WEBGL_FALLBACK}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`atom-stage ${className}`}>
      <canvas ref={canvasRef} aria-label={`3D model of ${symbol ?? atomicNumber}`} />
    </div>
  );
});
