import React, { useCallback, useEffect, useState } from 'react';
import { useI18n } from '../i18n';

export interface TourStep {
  /** i18n key or literal text. */
  text: string;
  /** Optional emphasised fragment rendered in the accent colour. */
  accent?: string;
}

export interface TourDef {
  id: string;
  steps: TourStep[];
}

const TOURS: Record<string, TourDef> = {
  element: {
    id: 'element',
    steps: [
      { text: 'The badge shows atomic number, symbol and atomic weight. The stripe down its left edge is the element\'s category colour — the same one used on the table.' },
      { text: 'Subatomic counts: protons fix the identity, neutrons set the isotope, electrons are what ions change.' },
      { text: 'Properties & Structure carries the reference data, formatted in whatever unit system you picked in Settings.' },
      { text: 'Switch to the 3D tab for a real Bohr model with switchable shells, orbitals and a nucleus you can scale.' },
      { text: 'The ★ on each element builds your spaced-repetition queue — grade yourself here and Zperiod decides when to bring it back.' },
    ],
  },
  balancer: {
    id: 'balancer',
    steps: [
      { text: 'Type or paste an unbalanced equation, using → or -> for the arrow.' },
      { text: 'The smallest whole-number coefficients are solved with exact rational elimination — never floating point.' },
      { text: 'An equation already in lowest terms is flagged as needing balancing, not silently accepted.' },
      { text: 'Mass is checked on both sides so you can see conservation of mass directly.' },
      { text: 'Tap any sample chip to load a classic reaction and study the pattern.' },
    ],
  },
  molar: {
    id: 'molar',
    steps: [
      { text: 'Enter a formula with parentheses or brackets: Ca(OH)2, K4[Fe(CN)6], (NH4)2SO4.' },
      { text: 'Every element is broken out with its count, atomic mass and percentage contribution.' },
      { text: 'Use the slider to find the mass of any number of molecules — good for scale intuition.' },
    ],
  },
  solubility: {
    id: 'solubility',
    steps: [
      { text: 'Enter an ionic formula. The tool splits it into its cation and anion.' },
      { text: 'Each ion is checked against the aqueous solubility rules, exceptions included.' },
      { text: 'The overall verdict is the least-soluble ion, since one insoluble ion ruins the whole salt.' },
    ],
  },
  lab: {
    id: 'lab',
    steps: [
      { text: 'Drag the tilt slider — gravity is applied in the beaker’s rotated frame, so the liquid pools downhill.' },
      { text: 'Temperature sets the molecules’ mean speed, exactly as temperature sets real mean kinetic energy.' },
      { text: 'Add solute to see ions mix in and, above the solubility limit, start to settle out.' },
      { text: 'Water molecules are drawn as the real bent H–O–H shape at 104.5°.' },
    ],
  },
  spdf: {
    id: 'spdf',
    steps: [
      { text: 'All 30 orbitals through the 4f shell are here, grouped by sub-shell: s, p, d, then f.' },
      { text: 'Each cloud is a real probability-density isosurface: every point satisfies P(r,θ,φ) = R²(r)·|Y(θ,φ)|² above the threshold you set.' },
      { text: 'Lower the threshold to reveal the outer lobes of s orbitals and the nodal structure of p, d and f.' },
      { text: 'The Z_eff slider applies Slater screening, so you can watch a valence orbital shrink as nuclear charge rises across a period.' },
    ],
  },
  worksheet: {
    id: 'worksheet',
    steps: [
      { text: 'Pick the exercise type: Balance, Identify Type, or a mix of both.' },
      { text: 'Choose how many questions, which reaction types, and the difficulty band.' },
      { text: 'Every question is drawn from a bank of real, commonly taught reactions — all verified balanced.' },
      { text: 'Print or export a PDF practice sheet and a separate answer key, ready for class.' },
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

/** Shows a tour the first time the user opens a tool, and never again. */
export function useTour(id: string, seen: string[], markSeen: (id: string) => void) {
  const [open, setOpen] = useState(false);
  const hasSeen = seen.includes(id);

  const start = useCallback(() => {
    setOpen(true);
    markSeen(id);
  }, [id, markSeen]);

  const close = useCallback(() => setOpen(false), []);

  return { show: !hasSeen, open, start, close, def: TOURS[id] };
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function Tour({
  open,
  onClose,
  id,
}: {
  open: boolean;
  onClose: () => void;
  id: string;
}) {
  const { t } = useI18n();
  const def = TOURS[id];
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open, id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setStep((s) => Math.min(s + 1, (def?.steps.length ?? 1) - 1));
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(0, s - 1));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, def, onClose]);

  if (!open || !def) return null;
  const last = step >= def.steps.length - 1;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center"
      style={{ background: 'rgba(6,9,18,0.55)', backdropFilter: 'blur(3px)' }}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="pop-in w-full max-w-md rounded-2xl p-5 shadow-2xl"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-1.5">
          {def.steps.map((_, i) => (
            <span
              key={i}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{ background: i <= step ? 'var(--accent)' : 'var(--surface-3)' }}
            />
          ))}
        </div>

        <p className="text-[12px] font-bold uppercase tracking-wide faint">
          {t('tools.balancer.tutorial').split(' ').slice(0, 1)} {step + 1}/{def.steps.length}
        </p>
        <p className="mt-2 text-sm leading-relaxed">{def.steps[step].text}</p>

        <div className="mt-5 flex items-center justify-between gap-2">
          <button className="btn btn-ghost h-9 text-xs" onClick={onClose}>
            {t('app.close')}
          </button>
          <div className="flex gap-1.5">
            {step > 0 && (
              <button className="btn btn-ghost h-9 text-xs" onClick={() => setStep((s) => s - 1)}>
                {t('app.back')}
              </button>
            )}
            {!last && (
              <button className="btn btn-primary h-9 text-xs" onClick={() => setStep((s) => s + 1)}>
                {t('app.next')}
              </button>
            )}
            {last && (
              <button className="btn btn-primary h-9 text-xs" onClick={onClose}>
                {t('misc.done' as string)}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { TOURS };
