import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { useStore } from '../state/store';
import { Tour, useTour } from './Tour';

/* ------------------------------------------------------------------ */
/* Molecule model                                                      */
/* ------------------------------------------------------------------ */

interface Molecule {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Rotation of the H-O-H frame. */
  a: number;
  av: number;
  kind: 'water' | 'ion';
  /** For ions: the charge drawn on the particle. */
  charge?: string;
  color?: string;
  r: number;
}

const WATER_R = 7;

/** Room-temperature mean speed of a water molecule, in px/s, roughly to scale. */
function speedFor(tempC: number): number {
  return 26 + Math.max(0, (tempC - 0)) * 1.35;
}

export interface VirtualLabProps {
  className?: string;
}

/* ------------------------------------------------------------------ */

export function VirtualLab({ className = '' }: VirtualLabProps) {
  const { t } = useI18n();
  const { reduceMotion, markTourSeen, toolToursSeen } = useStore();
  const tour = useTour('lab', toolToursSeen, markTourSeen);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [tempC, setTempC] = useState(22);
  const [volume, setVolume] = useState(60); // % fill
  const [tilt, setTilt] = useState(0); // degrees
  const [solute, setSolute] = useState('NaCl');
  const [showHint, setShowHint] = useState(true);

  const sim = useRef({
    mols: [] as Molecule[],
    stirring: 0,
    running: true,
    w: 0,
    h: 0,
    dpr: 1,
  });

  /* ---- seeding & resizing ---- */
  const seed = useCallback((n: number) => {
    const s = sim.current;
    const arr: Molecule[] = [];
    for (let i = 0; i < n; i++) {
      arr.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.02,
        vy: (Math.random() - 0.5) * 0.02,
        a: Math.random() * Math.PI * 2,
        av: (Math.random() - 0.5) * 0.03,
        kind: 'water',
        r: WATER_R,
      });
    }
    s.mols = arr;
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    const cv = canvasRef.current;
    if (!el || !cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = el.clientWidth;
    const h = el.clientHeight;
    cv.width = Math.floor(w * dpr);
    cv.height = Math.floor(h * dpr);
    const s = sim.current;
    s.w = w;
    s.h = h;
    s.dpr = dpr;
    if (!s.mols.length) seed(90);
  }, [seed]);

  /* ---- main loop ---- */
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const s = sim.current;
      if (!s.running || reduceMotion) return;
      step(s, dt, tempC, tilt, volume, solute);
      draw(cv, s, tempC, tilt, volume);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [tempC, tilt, volume, solute, reduceMotion]);

  /* ---- controls ---- */
  const addWater = useCallback(() => {
    const s = sim.current;
    const target = Math.min(420, Math.round(s.mols.length + 40));
    const extra = target - s.mols.length;
    for (let i = 0; i < extra; i++) {
      s.mols.push({
        x: Math.random(),
        y: 0.4 + Math.random() * 0.5,
        vx: (Math.random() - 0.5) * 0.02,
        vy: (Math.random() - 0.5) * 0.02,
        a: Math.random() * Math.PI * 2,
        av: (Math.random() - 0.5) * 0.03,
        kind: 'water',
        r: WATER_R,
      });
    }
  }, []);

  const addSolute = useCallback(() => {
    const s = sim.current;
    const c = SOLUTES[solute] ?? SOLUTES.NaCl;
    for (let i = 0; i < 26; i++) {
      s.mols.push({
        x: Math.random(),
        y: 0.35 + Math.random() * 0.55,
        vx: (Math.random() - 0.5) * 0.03,
        vy: (Math.random() - 0.5) * 0.03,
        a: Math.random() * Math.PI * 2,
        av: (Math.random() - 0.5) * 0.05,
        kind: 'ion',
        charge: c.charge,
        color: c.color,
        r: 5.5,
      });
    }
  }, [solute]);

  const stir = useCallback(() => {
    sim.current.stirring = 1;
  }, []);

  const evaporate = useCallback(() => {
    const s = sim.current;
    s.mols = s.mols.filter((m) => m.kind === 'ion' || Math.random() > 0.08).slice(0, Math.max(12, s.mols.length - 18));
  }, []);

  const reset = useCallback(() => {
    seed(90);
    setTempC(22);
    setVolume(60);
    setTilt(0);
  }, [seed]);

  const ionCount = sim.current.mols.filter((m) => m.kind === 'ion').length;
  const waterCount = sim.current.mols.length - ionCount;
  const motion = reduceMotion ? 0 : 0.5 + tempC / 44;
  const density = (waterCount * 18.015 + ionCount * (SOLUTES[solute]?.molar ?? 58.44)) / Math.max(1, volume);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div ref={wrapRef} className="relative h-[340px] w-full overflow-hidden rounded-2xl border" style={{ background: 'var(--surface-2)' }}>
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />
        <div className="pointer-events-none absolute start-3 top-3 rounded-lg bg-black/40 px-2.5 py-1.5 text-[11.5px] font-semibold text-white/85 backdrop-blur">
          {t('tools.lab.temperature')}: <span className="tnum">{tempC}°C</span> · {t('tools.lab.volume')}:{' '}
          <span className="tnum">{volume}%</span>
        </div>
        {showHint && (
          <p className="pointer-events-none absolute bottom-3 start-3 end-3 text-center text-[11.5px] text-white/70">
            {t('tools.lab.hint')}
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <LabSlider label={t('tools.lab.temperature')} value={tempC} min={0} max={100} step={1} suffix="°C" onChange={setTempC} />
        <LabSlider label={t('tools.lab.volume')} value={volume} min={15} max={95} step={1} suffix="%" onChange={setVolume} />
        <LabSlider label={t('tools.lab.tilt')} value={tilt} min={-60} max={60} step={1} suffix="°" onChange={setTilt} />
        <div>
          <label className="mb-1 block text-[11.5px] font-bold uppercase tracking-wide faint">
            {t('tools.lab.solute')}
          </label>
          <select className="input" value={solute} onChange={(e) => setSolute(e.target.value)}>
            {Object.entries(SOLUTES).map(([k, v]) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button className="btn btn-subtle h-8 text-xs" onClick={addWater}>
          + {t('tools.lab.addWater')}
        </button>
        <button className="btn btn-subtle h-8 text-xs" onClick={addSolute}>
          + {t('tools.lab.addSolute')}
        </button>
        <button className="btn btn-subtle h-8 text-xs" onClick={stir}>
          ↻ {t('tools.lab.stir')}
        </button>
        <button className="btn btn-subtle h-8 text-xs" onClick={evaporate}>
          ↑ {t('tools.lab.evaporate')}
        </button>
        <button className="btn btn-subtle h-8 text-xs" onClick={() => setTempC((v) => Math.max(0, v - 10))}>
          − {t('tools.lab.cool')}
        </button>
        <button className="btn btn-subtle h-8 text-xs" onClick={() => setTempC((v) => Math.min(100, v + 10))}>
          + {t('tools.lab.heat')}
        </button>
        <button className="btn btn-ghost h-8 text-xs" onClick={reset}>
          ↺ {t('tools.lab.reset')}
        </button>
        {tour.show && (
          <button className="btn btn-subtle h-8 text-xs" onClick={tour.start}>
            ? {t('tools.lab.tutorial')}
          </button>
        )}
      </div>

      <Tour open={tour.open} onClose={tour.close} id="lab" />

      <div className="grid grid-cols-3 gap-2 text-center">
        <Readout label={t('tools.lab.molecules')} value={waterCount} />
        <Readout label="ions" value={ionCount} />
        <Readout label={t('tools.lab.density')} value={`${density.toFixed(2)} g/L`} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Simulation                                                          */
/* ------------------------------------------------------------------ */

const SOLUTES: Record<string, { color: string; charge: string; molar: number }> = {
  NaCl: { color: '#8b85ff', charge: '±', molar: 58.44 },
  KCl: { color: '#f0789a', charge: '±', molar: 74.55 },
  'CuSO₄': { color: '#3fb9f5', charge: '²⁺', molar: 159.61 },
  NaOH: { color: '#2ad0c2', charge: '±', molar: 40.0 },
  'CaCl₂': { color: '#ffab5c', charge: '±', molar: 110.98 },
};

function step(
  s: { mols: Molecule[]; stirring: number; w: number; h: number },
  dt: number,
  tempC: number,
  tiltDeg: number,
  volume: number,
  _solute: string,
) {
  const v = speedFor(tempC) * 0.02;
  const tilt = (tiltDeg * Math.PI) / 180;
  // Gravity projected into the beaker's rotated frame.
  const gx = Math.sin(tilt) * 0.9;
  const gy = Math.cos(tilt) * 0.9;

  const surfaceY = 1 - volume / 100;

  for (const m of s.mols) {
    // Brownian kick, scaled by temperature.
    m.vx += (Math.random() - 0.5) * v * 0.55;
    m.vy += (Math.random() - 0.5) * v * 0.55;
    // Gravity.
    m.vx += gx * 0.0009 * dt * 60;
    m.vy += gy * 0.0009 * dt * 60;
    // Stirring impulse decays away.
    if (s.stirring > 0) {
      m.vx += (Math.random() - 0.5) * 0.05;
      m.vy += (Math.random() - 0.5) * 0.05;
    }

    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.a += m.av * dt;

    const r = m.r / Math.max(1, s.h) + 0.012;
    // Walls.
    if (m.x < 0.16 + r * 0.4) {
      m.x = 0.16 + r * 0.4;
      m.vx = Math.abs(m.vx) * 0.7;
    }
    if (m.x > 0.84 - r * 0.4) {
      m.x = 0.84 - r * 0.4;
      m.vx = -Math.abs(m.vx) * 0.7;
    }
    if (m.y < 0.88 - r) {
      m.y = 0.88 - r;
      m.vy = -Math.abs(m.vy) * 0.7;
    }
    // Surface: bounce at the water line, unless it is above the line already.
    if (m.y > surfaceY - r) {
      m.y = surfaceY - r;
      m.vy = -Math.abs(m.vy) * 0.55;
    }

    // Thermal cap.
    const sp = Math.hypot(m.vx, m.vy);
    const max = v * 2.4;
    if (sp > max) {
      m.vx = (m.vx / sp) * max;
      m.vy = (m.vy / sp) * max;
    }
    // Slow rotation back to rest.
    m.av *= 0.985;
    if (Math.abs(m.av) < 1e-4) m.av = 0;
  }

  if (s.stirring > 0) s.stirring = Math.max(0, s.stirring - dt * 1.6);
}

function draw(
  cv: HTMLCanvasElement,
  s: { mols: Molecule[]; w: number; h: number; dpr: number },
  tempC: number,
  tiltDeg: number,
  volume: number,
) {
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const { w, h, dpr } = s;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const tilt = (tiltDeg * Math.PI) / 180;
  const surfaceY = 1 - volume / 100;

  // Beaker body — a simple open cylinder drawn in the rotated frame.
  const cx = w / 2;
  const cy = h / 2;
  const bw = Math.min(w * 0.62, 460);
  const bh = Math.min(h * 0.74, 300);
  const x0 = cx - bw / 2;
  const y0 = cy - bh / 2 + 12;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt * 0.32);
  ctx.translate(-cx, -cy);

  // Liquid
  const liqTop = y0 + bh * (1 - volume / 100);
  const grad = ctx.createLinearGradient(0, liqTop, 0, y0 + bh);
  grad.addColorStop(0, 'rgba(56,152,235,0.42)');
  grad.addColorStop(1, 'rgba(20,80,150,0.55)');
  ctx.fillStyle = grad;
  roundRect(ctx, x0, liqTop, bw, y0 + bh - liqTop, 8);
  ctx.fill();

  // Molecules
  for (const m of s.mols) {
    const px = x0 + m.x * bw;
    const py = y0 + m.y * bh;
    if (m.kind === 'water') {
      // H–O–H: two hydrogens on a bent 104.5° frame.
      const R = m.r * (h / 340) * 1.15;
      const bend = ((180 - 104.5) * Math.PI) / 180;
      const hx = Math.cos(m.a) * R;
      const hy = Math.sin(m.a) * R;
      ctx.fillStyle = '#ff5a5a';
      for (const sgn of [1, -1]) {
        const ax = px + hx * sgn * Math.cos(bend / 2) * 0.9;
        const ay = py + hy * sgn * Math.cos(bend / 2) * 0.9 + Math.sin(bend / 2) * R * 0.7;
        ctx.beginPath();
        ctx.arc(ax, ay, R * 0.34, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#eef1fa';
      ctx.beginPath();
      ctx.arc(px, py, R * 0.42, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const R = m.r * (h / 340);
      ctx.fillStyle = m.color ?? '#8b85ff';
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.arc(px, py, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#0b1020';
      ctx.font = `700 ${R * 1.1}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.charge ?? '±', px, py);
    }
  }

  // Beaker outline
  ctx.strokeStyle = 'rgba(220,230,255,0.55)';
  ctx.lineWidth = 2.5;
  roundRect(ctx, x0, y0, bw, bh, 10);
  ctx.stroke();

  // Graduation ticks
  ctx.strokeStyle = 'rgba(220,230,255,0.28)';
  ctx.lineWidth = 1.5;
  for (let i = 1; i < 5; i++) {
    const gy2 = y0 + (bh * i) / 5;
    ctx.beginPath();
    ctx.moveTo(x0 + 6, gy2);
    ctx.lineTo(x0 + 20, gy2);
    ctx.stroke();
  }

  // Meniscus shimmer
  ctx.strokeStyle = `rgba(150,210,255,${0.25 + Math.min(0.5, tempC / 260)})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, liqTop);
  ctx.lineTo(x0 + bw, liqTop);
  ctx.stroke();

  ctx.restore();

  // Steam above hot water
  if (tempC > 60) {
    ctx.globalAlpha = Math.min(0.4, (tempC - 60) / 120);
    ctx.fillStyle = '#cfe6ff';
    for (let i = 0; i < 5; i++) {
      const ph = performance.now() / 900 + i * 1.7;
      const sx = x0 + bw * (0.2 + 0.15 * i) + Math.sin(ph) * 8;
      const sy = liqTop - 14 - ((ph * 22) % 46);
      ctx.beginPath();
      ctx.arc(sx, sy, 4 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

function LabSlider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11.5px] font-bold uppercase tracking-wide faint">
        {label}{' '}
        <span className="tnum ms-1 text-[12px]" style={{ color: 'var(--accent)' }}>
          {value}
          {suffix}
        </span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

function Readout({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg p-2" style={{ background: 'var(--surface-2)' }}>
      <div className="tnum text-base font-extrabold leading-none">{value}</div>
      <div className="mt-1 text-[12px] faint">{label}</div>
    </div>
  );
}
