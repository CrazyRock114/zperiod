import React from 'react';
import { useI18n } from '../i18n';
import { useStore } from '../state/store';
import type { Element } from '../types/chem';
import { categoryColor, categorySurface, textOn } from '../data';
import { fmt, fmtDensity, fmtEnergy, fmtTemp } from '../lib/units';

/**
 * Bottom tray for side-by-side element comparison.
 * Up to 4 elements; the widest property set is the intersection so a missing
 * value never renders as a misleading blank.
 */
export function CompareTray({
  atomicNumbers,
  elements,
  onRemove,
  onClear,
  onOpen,
}: {
  atomicNumbers: number[];
  elements: Element[];
  onRemove: (z: number) => void;
  onClear: () => void;
  onOpen: (z: number) => void;
}) {
  const { t, elementName, num } = useI18n();
  const { units } = useStore();

  if (!atomicNumbers.length) return null;

  const picked = atomicNumbers
    .map((z) => elements.find((e) => e.atomicNumber === z))
    .filter((e): e is Element => Boolean(e));
  if (!picked.length) return null;

  const dark = document.documentElement.classList.contains('dark');

  const rows: Array<{ key: string; get: (e: Element) => string; cmp?: (a: Element, b: Element) => number }> = [
    { key: 'element.atomicMass', get: (e) => fmt(e.atomicMass, 5) },
    { key: 'element.atomicNumber', get: (e) => num(e.atomicNumber) },
    { key: 'element.period', get: (e) => num(e.period) },
    { key: 'element.group', get: (e) => num(e.group) },
    { key: 'element.block', get: (e) => e.block.toUpperCase() },
    { key: 'element.category', get: (e) => t(`category.${e.category}`) },
    { key: 'element.phase', get: (e) => t(`phase.${e.phase}`) },
    {
      key: 'element.electronConfiguration',
      get: (e) => e.electronConfiguration,
    },
    { key: 'element.electronegativity', get: (e) => (e.electronegativity ?? '—').toString() },
    { key: 'element.atomicRadius', get: (e) => (e.atomicRadiusPm !== null ? `${e.atomicRadiusPm} pm` : '—') },
    { key: 'element.meltingPoint', get: (e) => fmtTemp(e.meltingPointK, units.temperature) },
    { key: 'element.boilingPoint', get: (e) => fmtTemp(e.boilingPointK, units.temperature) },
    { key: 'element.density', get: (e) => fmtDensity(e.densityGcm3, units.density) },
    { key: 'element.ionizationEnergy', get: (e) => fmtEnergy(e.ionizationEnergyEv, units.energy) },
    { key: 'element.electronAffinity', get: (e) => (e.electronAffinityKjMol !== null ? `${fmt(e.electronAffinityKjMol, 4)} kJ/mol` : '—') },
    { key: 'element.valenceElectrons', get: (e) => (e.valenceElectrons ?? '—').toString() },
    { key: 'element.oxidationStates', get: (e) => (e.oxidationStates.length ? e.oxidationStates.map((o) => (o > 0 ? `+${o}` : o)).join(', ') : '—') },
    { key: 'element.discovery', get: (e) => (e.discoveryYear ? num(e.discoveryYear) : t('element.ancient')) },
    { key: 'element.discoveredBy', get: (e) => e.discoverer ?? '—' },
  ];

  return (
    <div
      className="sticky bottom-0 z-20 mt-4 rounded-2xl border p-3 shadow-2xl"
      style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-extrabold uppercase tracking-wide faint">
          {t('element.compare')} · {picked.length}/4
        </p>
        <button className="btn btn-ghost h-7 text-[12px]" onClick={onClear}>
          {t('misc.none')}
        </button>
      </div>

      <div className="thin-scroll -mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[420px] text-[11.5px]">
          <thead>
            <tr>
              <th className="w-28 pb-1.5 text-start font-bold faint">{t('element.properties')}</th>
              {picked.map((e) => (
                <th key={e.atomicNumber} className="pb-1.5 text-start">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[12px] font-extrabold"
                      style={{ background: categorySurface(e.category, dark), color: textOn(e.category, dark) }}
                    >
                      {e.symbol}
                    </span>
                    <button className="text-start font-bold hover:underline" onClick={() => onOpen(e.atomicNumber)}>
                      {elementName(e.atomicNumber, e.name)}
                    </button>
                    <button
                      className="faint hover:text-[var(--c-actinide)]"
                      onClick={() => onRemove(e.atomicNumber)}
                      aria-label={`${t('app.close')} ${e.symbol}`}
                    >
                      ✕
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const values = picked.map(r.get);
              const allPresent = values.every((v) => v && v !== '—');
              const best = allPresent ? [...picked].sort((a, b) => numeric(r.get(a), r.get(b)))[0] : null;
              return (
                <tr key={r.key} className="border-t">
                  <td className="py-1.5 pe-2 align-top muted">{t(r.key)}</td>
                  {picked.map((e, i) => (
                    <td
                      key={e.atomicNumber}
                      className="tnum py-1.5 pe-3 align-top font-semibold"
                      style={best?.atomicNumber === e.atomicNumber ? { color: 'var(--accent)' } : undefined}
                    >
                      <span className="break-words">{values[i]}</span>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Compare helper that only ranks when both cells are numeric. */
function numeric(a: string, b: string): number {
  const na = Number.parseFloat(a.replace(/[^\d.-]/g, ''));
  const nb = Number.parseFloat(b.replace(/[^\d.-]/g, ''));
  if (Number.isNaN(na) || Number.isNaN(nb)) return 0;
  return na - nb;
}
