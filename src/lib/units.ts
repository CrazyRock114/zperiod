/**
 * Unit conversion layer.
 *
 * Everything is stored in SI in the data files. These helpers render SI values
 * into whatever unit system the user picked in Settings.
 */

import type { UnitPrefs, TemperatureUnit, DensityUnit, EnergyUnit } from '../types/chem';

export function convertTemperature(kelvin: number, to: TemperatureUnit): number {
  switch (to) {
    case 'K':
      return kelvin;
    case 'C':
      return kelvin - 273.15;
    case 'F':
      return (kelvin - 273.15) * (9 / 5) + 32;
  }
}

export function temperatureSymbol(u: TemperatureUnit): string {
  return u === 'K' ? 'K' : u === 'C' ? '°C' : '°F';
}

export function convertDensity(gcm3: number, to: DensityUnit): number {
  switch (to) {
    case 'gcm3':
      return gcm3;
    case 'kgm3':
      return gcm3 * 1000;
    case 'lbft3':
      return gcm3 * 62.4279606;
  }
}

export function densitySymbol(u: DensityUnit): string {
  return u === 'gcm3' ? 'g/cm³' : u === 'kgm3' ? 'kg/m³' : 'lb/ft³';
}

export function convertEnergy(ev: number, to: EnergyUnit): number {
  switch (to) {
    case 'ev':
      return ev;
    case 'kjmol':
      return ev * 96.485332;
  }
}

export function energySymbol(u: EnergyUnit): string {
  return u === 'ev' ? 'eV' : 'kJ/mol';
}

/** Electron affinity is stored as kJ/mol, positive = energy released. */
export function convertElectronAffinity(kjmol: number, to: EnergyUnit): number {
  return to === 'ev' ? kjmol / 96.485332 : kjmol;
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

/**
 * Significant figures that adapt to magnitude: 1.008 stays 1.008, not 1.01.
 * Trailing zeros from toFixed are trimmed so 1.0080 prints as 1.008 and
 * 55.845000 as 55.845 — atomic weights must not lose a digit to padding.
 */
export function smartNum(v: number, sf = 4): string {
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a === 0) return '0';
  const trim = (x: string) => (x.includes('.') ? x.replace(/0+$/, '').replace(/\.$/, '') : x);
  if (a >= 10000 || a < 0.001) return v.toExponential(2).replace('e+', ' × 10^');
  if (a >= 1000) return trim(v.toFixed(Math.max(0, sf - 4)));
  if (a >= 100) return trim(v.toFixed(Math.max(0, sf - 3)));
  if (a >= 1) return trim(v.toFixed(Math.max(0, sf - 2)));
  if (a >= 0.01) return trim(v.toFixed(Math.max(0, sf - 1)));
  return trim(v.toPrecision(sf));
}

export function fmt(v: number | null | undefined, sf = 4): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return smartNum(v, sf);
}

export function fmtTemp(kelvin: number | null, u: TemperatureUnit, sf = 3): string {
  if (kelvin === null || !Number.isFinite(kelvin)) return '—';
  const v = convertTemperature(kelvin, u);
  const out = Math.abs(v) >= 1000 ? v.toFixed(0) : v.toFixed(sf).replace(/\.?0+$/, '');
  return `${out} ${temperatureSymbol(u)}`;
}

export function fmtDensity(gcm3: number | null, u: DensityUnit, sf = 4): string {
  if (gcm3 === null || !Number.isFinite(gcm3)) return '—';
  return `${fmt(convertDensity(gcm3, u), sf)} ${densitySymbol(u)}`;
}

export function fmtEnergy(ev: number | null, u: EnergyUnit, sf = 4): string {
  if (ev === null || !Number.isFinite(ev)) return '—';
  return `${fmt(convertEnergy(ev, u), sf)} ${energySymbol(u)}`;
}

/** Localised number formatting, degrading to plain digits where Intl is absent. */
export function nfmt(v: number, locale: string, opts?: Intl.NumberFormatOptions): string {
  try {
    return new Intl.NumberFormat(locale, opts).format(v);
  } catch {
    return String(v);
  }
}

/** Localised date formatting. */
export function dfmt(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function isMetric(u: UnitPrefs): boolean {
  return u.temperature !== 'F' && u.density !== 'lbft3';
}
