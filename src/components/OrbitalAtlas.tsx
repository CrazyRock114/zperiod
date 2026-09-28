import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useI18n } from '../i18n';
import { useStore } from '../state/store';
import { Tour, useTour } from './Tour';
import {
  ORBITALS,
  orbitalExtent,
  sampleSpdf,
  slaterZ,
  toSuperscript,
  type OrbitalDef,
} from '../lib/chem3d/orbitals';

const FAMILY_COLOR: Record<number, number> = {
  0: 0xfeca57, // s
  1: 0x48dbfb, // p
  2: 0x1dd1a1, // d
  3: 0xff6b9d, // f
};

const FAMILY_COLOR_CSS: Record<number, string> = {
  0: '#feca57',
  1: '#48dbfb',
  2: '#1dd1a1',
  3: '#ff6b9d',
};

const L_NAMES = ['s', 'p', 'd', 'f'];

/* ------------------------------------------------------------------ */
/* Single-orbital viewer                                               */
/* ------------------------------------------------------------------ */

function OrbitalCanvas({
  orbital,
  Z,
  density,
  autoRotate,
}: {
  orbital: OrbitalDef;
  Z: number;
  density: number;
  autoRotate: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const st = useRef<{
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    group?: THREE.Group;
    raf?: number;
    points?: THREE.Points;
    rot?: boolean;
  }>({});

  // ---- scene setup ----
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    const cv = ref.current;
    const el = wrapRef.current;
    if (!cv || !el) return;

    // Same guard as Atom3D: a missing WebGL context must not take down the
    // page, it just means the 3D atlas is unavailable.
    const probe = cv.getContext('webgl2') ?? cv.getContext('webgl');
    if (!probe) {
      setWebglFailed(true);
      return;
    }
    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
    const group = new THREE.Group();
    scene.add(group);

    // Three faint reference planes so orientation is readable.
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x6a7ba8,
      transparent: true,
      opacity: 0.09,
      side: THREE.DoubleSide,
    });
    const R = 22;
    const p1 = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, R * 2), planeMat);
    p1.rotation.x = Math.PI / 2;
    const p2 = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, R * 2), planeMat);
    const p3 = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, R * 2), planeMat);
    p3.rotation.y = Math.PI / 2;
    group.add(p1, p2, p3);

    // Axes
    const axes = new THREE.Group();
    const axisColors = [0xff5a5a, 0x4d7dff, 0x1dd1a1];
    for (let i = 0; i < 3; i++) {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(i === 0 ? R : 0, i === 1 ? R : 0, i === 2 ? R : 0),
      ]);
      axes.add(
        new THREE.Line(
          g,
          new THREE.LineBasicMaterial({ color: axisColors[i], transparent: true, opacity: 0.32 }),
        ),
      );
    }
    group.add(axes);

    const resize = () => {
      const w = Math.max(1, el.clientWidth);
      const h = Math.max(1, el.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    // ---- input ----
    let drag = false;
    let lx = 0;
    let ly = 0;
    let vx = 0;
    let vy = 0;
    const onDown = (e: PointerEvent) => {
      drag = true;
      lx = e.clientX;
      ly = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      vx += (e.clientY - ly) * 0.006;
      vy += (e.clientX - lx) * 0.006;
      lx = e.clientX;
      ly = e.clientY;
    };
    const onUp = () => (drag = false);
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.multiplyScalar(1 + Math.sign(e.deltaY) * 0.1);
      camera.position.clampLength(24, 160);
    };
    cv.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    cv.addEventListener('wheel', onWheel, { passive: false });

    st.current = { renderer, scene, camera, group };

    // ---- loop ----
    let last = performance.now();
    const loop = (now: number) => {
      st.current.raf = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      group.rotation.y += vx;
      group.rotation.x += vy;
      vx *= 0.93;
      vy *= 0.93;
      if (Math.abs(vx) < 1e-5) vx = 0;
      if (Math.abs(vy) < 1e-5) vy = 0;
      if (st.current.rot && !drag) group.rotation.y += dt * 0.22;
      renderer.render(scene, camera);
    };
    st.current.raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(st.current.raf!);
      ro.disconnect();
      cv.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      cv.removeEventListener('wheel', onWheel);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    st.current.rot = autoRotate;
  }, [autoRotate]);

  if (webglFailed) {
    return (
      <div className="atom-stage grid h-full w-full place-items-center">
        <div className="text-center">
          <p className="text-2xl">🌀</p>
          <p className="mt-1 text-[11.5px] faint">
            3D needs WebGL, which this browser has turned off.
          </p>
        </div>
      </div>
    );
  }

  // ---- point cloud ----
  const points = useMemo(() => {
    const extent = orbitalExtent(orbital.n, orbital.l, Z);
    const scale = 20 / Math.max(4, extent);
    return sampleSpdf(orbital, Z, {
      maxPoints: Math.round(2200 + density * 12000),
      threshold: 0.62 - density * 0.4,
      seed: 4242 + orbital.n * 31 + orbital.l * 7 + orbital.m,
    }).map((p) => ({ ...p, x: p.x * scale, y: p.y * scale, z: p.z * scale }));
  }, [orbital, Z, density]);

  useEffect(() => {
    const g = st.current.group;
    if (!g) return;
    if (st.current.points) {
      g.remove(st.current.points);
      st.current.points.geometry.dispose();
      (st.current.points.material as THREE.Material).dispose();
    }
    if (!points.length) return;

    const pos = new Float32Array(points.length * 3);
    const col = new Float32Array(points.length * 3);
    const c = new THREE.Color(FAMILY_COLOR[orbital.l]);
    for (let i = 0; i < points.length; i++) {
      pos[i * 3] = points[i].x;
      pos[i * 3 + 1] = points[i].y;
      pos[i * 3 + 2] = points[i].z;
      const k = 0.4 + points[i].p * 0.6;
      col[i * 3] = c.r * k;
      col[i * 3 + 1] = c.g * k;
      col[i * 3 + 2] = c.b * k;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.32,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const p = new THREE.Points(geo, mat);
    g.add(p);
    st.current.points = p;
    st.current.camera?.position.set(0, 0, 58);
    st.current.camera?.lookAt(0, 0, 0);
  }, [points, orbital.l]);

  return (
    <div ref={wrapRef} className="atom-stage h-full w-full">
      <canvas ref={ref} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Atlas                                                               */
/* ------------------------------------------------------------------ */

export function OrbitalAtlas({ defaultOrbital = '2p' }: { defaultOrbital?: string }) {
  const { t } = useI18n();
  const { markTourSeen, toolToursSeen } = useStore();
  const tour = useTour('spdf', toolToursSeen, markTourSeen);
  const [sel, setSel] = useState<string>(() => {
    const found = ORBITALS.find((o) => o.label.startsWith(defaultOrbital));
    return found?.label ?? '2p';
  });
  const [density, setDensity] = useState(0.5);
  const [autoRotate, setAutoRotate] = useState(true);
  // Element used for the Slater screening constant — changes the cloud's size.
  const [Z, setZ] = useState(6);

  const orbital = useMemo(() => ORBITALS.find((o) => o.label === sel) ?? ORBITALS[4], [sel]);
  const zeff = useMemo(() => slaterZ(Z, orbital.n, orbital.l), [Z, orbital.n, orbital.l]);

  const byFamily = useMemo(() => {
    const groups = new Map<number, OrbitalDef[]>();
    for (const o of ORBITALS) {
      const arr = groups.get(o.family) ?? [];
      arr.push(o);
      groups.set(o.family, arr);
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="atom-stage h-[380px] w-full">
          <OrbitalCanvas orbital={orbital} Z={zeff} density={density} autoRotate={autoRotate} />
        </div>

        <div className="flex flex-col gap-3">
          <div className="surface p-3">
            <p className="text-2xl font-extrabold tracking-tight" style={{ color: FAMILY_COLOR_CSS[orbital.l] }}>
              {orbital.label}
            </p>
            <p className="mt-0.5 text-[12px] faint">{t('atom.spdf.density')}</p>
            <dl className="mt-2 space-y-1 text-[11.5px]">
              <MetaRow k="n" v={orbital.n} />
              <MetaRow k="ℓ" v={`${orbital.l} (${L_NAMES[orbital.l]})`} />
              <MetaRow k="m" v={`${orbital.m > 0 ? '+' : ''}${orbital.m}`} />
              <MetaRow k="Z_eff" v={zeff.toFixed(2)} />
              <MetaRow k="t" v="16" />
            </dl>
          </div>

          <div>
            <label className="mb-1 block text-[11.5px] font-bold uppercase tracking-wide faint">
              {t('atom.spdf.density')} · {Math.round(density * 100)}%
            </label>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={density}
              onChange={(e) => setDensity(Number(e.target.value))}
              className="w-full"
            />
            <p className="mt-1 text-[11.5px] faint">{t('atom.spdf.hint')}</p>
          </div>

          <div>
            <label className="mb-1 block text-[11.5px] font-bold uppercase tracking-wide faint">
              Z<sub>eff</sub> ({t('element.atomicNumber')} {Z})
            </label>
            <input
              type="range"
              min={1}
              max={40}
              step={1}
              value={Z}
              onChange={(e) => setZ(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="flex gap-1.5">
            <button className="btn btn-subtle h-8 flex-1 text-xs" onClick={() => setAutoRotate((v) => !v)}>
              {autoRotate ? t('atom.stopRotate') : t('atom.autoRotate')}
            </button>
            {tour.show && (
              <button className="btn btn-ghost h-8 text-xs" onClick={tour.start}>
                ?
              </button>
            )}
          </div>
        </div>
      </div>

      {/* picker */}
      <div className="flex flex-col gap-2">
        {byFamily.map(([fam, list]) => (
          <div key={fam} className="flex flex-wrap items-center gap-1.5">
            <span
              className="w-8 text-[11.5px] font-extrabold uppercase"
              style={{ color: FAMILY_COLOR_CSS[fam] }}
            >
              {L_NAMES[fam]}
            </span>
            {list.map((o) => (
              <button
                key={o.label}
                onClick={() => setSel(o.label)}
                className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-bold transition-colors"
                style={{
                  background: o.label === sel ? FAMILY_COLOR_CSS[o.l] : 'var(--surface-2)',
                  color: o.label === sel ? '#0b1020' : 'var(--text-2)',
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      <Tour open={tour.open} onClose={tour.close} id="spdf" />

      <p className="rounded-xl p-3 text-[12px] leading-relaxed faint" style={{ background: 'var(--surface-2)' }}>
        {t('atom.orbitalsNote')}
      </p>
    </div>
  );
}

function MetaRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="faint">{k}</dt>
      <dd className="tnum font-bold">{v}</dd>
    </div>
  );
}

export { ORBITALS, toSuperscript };
