import React, { useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { LANGUAGES } from '../i18n/languages';
import { useStore, useDueReviews, type ThemeMode } from '../state/store';
import { useElements } from '../data';
import type { DensityUnit, EnergyUnit, TemperatureUnit } from '../types/chem';
import { FeedbackForm } from '../components/FeedbackForm';

const TEMPS: Array<[TemperatureUnit, string]> = [
  ['C', 'settings.celsius'],
  ['F', 'settings.fahrenheit'],
  ['K', 'settings.kelvin'],
];
const DENSITIES: Array<[DensityUnit, string]> = [
  ['gcm3', 'g/cm³'],
  ['kgm3', 'kg/m³'],
  ['lbft3', 'lb/ft³'],
];
const ENERGIES: Array<[EnergyUnit, string]> = [
  ['kjmol', 'kJ/mol'],
  ['ev', 'eV'],
];
const THEMES: Array<[ThemeMode, string]> = [
  ['light', 'settings.theme.light'],
  ['dark', 'settings.theme.dark'],
  ['system', 'settings.theme.system'],
];

export function SettingsView() {
  const { t, num } = useI18n();
  const s = useStore();
  const { due, learning } = useDueReviews();
  const elements = useElements();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const exportData = () => {
    const blob = new Blob([s.exportAll()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zperiod-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  const importData = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      const ok = s.importAll(String(r.result ?? ''));
      setImportMsg(ok ? t('app.saved') : t('app.error'));
      setTimeout(() => setImportMsg(null), 2500);
    };
    r.readAsText(file);
  };

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 sm:px-5">
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t('settings.title')}</h1>
        <p className="muted mt-1 text-sm">{t('settings.subtitle')}</p>
      </header>

      <div className="flex flex-col gap-4">
        {/* language */}
        <Card title={t('settings.language')} hint={t('settings.languageHint')}>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => s.setLang(l.code)}
                dir={l.dir}
                className="truncate rounded-lg px-2.5 py-2 text-start text-[12.5px] font-semibold transition-colors"
                style={{
                  background: l.code === s.lang ? 'var(--accent)' : 'var(--surface-2)',
                  color: l.code === s.lang ? '#fff' : 'var(--text-1)',
                }}
              >
                {l.name}
              </button>
            ))}
          </div>
        </Card>

        {/* units */}
        <Card title={t('settings.units')}>
          <Row label={t('settings.temperature')}>
            <Segmented
              value={s.units.temperature}
              options={TEMPS}
              onChange={(v) => s.setUnits({ temperature: v as TemperatureUnit })}
              t={t}
            />
          </Row>
          <Row label={t('settings.density')}>
            <Segmented
              value={s.units.density}
              options={DENSITIES}
              onChange={(v) => s.setUnits({ density: v as DensityUnit })}
              t={t}
            />
          </Row>
          <Row label={t('settings.energy')}>
            <Segmented
              value={s.units.energy}
              options={ENERGIES}
              onChange={(v) => s.setUnits({ energy: v as EnergyUnit })}
              t={t}
            />
          </Row>
        </Card>

        {/* appearance */}
        <Card title={t('settings.appearance')}>
          <Row label={t('settings.theme')}>
            <Segmented
              value={s.theme}
              options={THEMES}
              onChange={(v) => s.setTheme(v as ThemeMode)}
              t={t}
            />
          </Row>
          <Row label={t('settings.motion')} hint={t('settings.motionHint')}>
            <Toggle on={s.reduceMotion} onChange={s.setReduceMotion} onLabel={t('misc.on')} offLabel={t('misc.off')} />
          </Row>
          <Row label="3D">
            <Toggle on={s.reduce3d} onChange={s.setReduce3d} onLabel={t('misc.on')} offLabel={t('misc.off')} />
          </Row>
        </Card>

        {/* favorites */}
        <Card title={t('settings.favorites')} hint={t('settings.favoritesHint')}>
          {s.favorites.length === 0 ? (
            <p className="muted text-xs">{t('misc.none')}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {s.favorites.map((z) => {
                const e = elements.data?.find((x) => x.atomicNumber === z);
                return (
                  <button key={z} className="chip" onClick={() => s.toggleFavorite(z)} title={t('app.close')}>
                    {e?.symbol ?? z} <span className="faint">{z}</span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* data */}
        <Card title={t('settings.data')}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Stat label={t('settings.favorites')} value={num(s.favorites.length)} />
            <Stat label={t('learn.progress')} value={num(s.lessonsDone.length)} />
            <Stat label={t('learn.dueNow')} value={num(due.length + learning.length)} />
            <Stat label={t('feedback.inbox')} value={num(s.feedback.length)} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button className="btn btn-subtle h-9 text-xs" onClick={exportData}>
              ↓ {t('settings.exportData')}
            </button>
            <button className="btn btn-ghost h-9 text-xs" onClick={() => fileRef.current?.click()}>
              ↑ {t('settings.importData')}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importData(f);
                e.target.value = '';
              }}
            />
            <button
              className="btn btn-ghost h-9 text-xs"
              style={{ color: 'var(--c-actinide)' }}
              onClick={() => {
                if (confirm(t('settings.clearDataConfirm'))) s.clearAll();
              }}
            >
              ✕ {t('settings.clearData')}
            </button>
          </div>
          {importMsg && <p className="mt-2 text-[12px] faint">{importMsg}</p>}
        </Card>

        {/* feedback */}
        <Card title={t('feedback.title')} hint={t('feedback.subtitle')}>
          <FeedbackForm />
        </Card>

        {/* about */}
        <Card title={t('settings.about')}>
          <p className="muted text-xs leading-relaxed">{t('footer.privacy')}</p>
          <p className="mt-2 text-[12px] faint">
            {t('settings.version')} v3.0.0 · {num(elements.data?.length ?? 118)} {t('landing.stats.elements')} ·{' '}
            {num(LANGUAGES.length)} {t('landing.stats.languages')}
          </p>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface p-4 sm:p-5">
      <h2 className="text-sm font-extrabold">{title}</h2>
      {hint && <p className="muted mt-0.5 text-[11.5px]">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b py-2.5 last:border-b-0" style={{ borderColor: 'var(--border)' }}>
      <div>
        <p className="text-[12.5px] font-semibold">{label}</p>
        {hint && <p className="faint text-[11.5px]">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Segmented({
  value,
  options,
  onChange,
  t,
}: {
  value: string;
  options: Array<[string, string]>;
  onChange: (v: string) => void;
  t: (k: string) => string;
}) {
  return (
    <div className="flex gap-0.5 rounded-lg p-0.5" style={{ background: 'var(--surface-2)' }}>
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className="rounded-md px-2.5 py-1.5 text-[11.5px] font-bold transition-colors"
          style={{
            background: v === value ? 'var(--surface-1)' : 'transparent',
            color: v === value ? 'var(--accent)' : 'var(--text-2)',
            boxShadow: v === value ? 'var(--shadow-card)' : undefined,
          }}
        >
          {t(label) === label ? label : t(label)}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  on,
  onChange,
  onLabel,
  offLabel,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="rounded-lg px-3 py-1.5 text-[11.5px] font-bold transition-colors"
      style={{
        background: on ? 'var(--accent)' : 'var(--surface-2)',
        color: on ? '#fff' : 'var(--text-2)',
        minWidth: 62,
      }}
    >
      {on ? onLabel : offLabel}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg p-2.5" style={{ background: 'var(--surface-2)' }}>
      <div className="tnum text-lg font-extrabold leading-none">{value}</div>
      <div className="mt-1 text-[11.5px] uppercase tracking-wide faint">{label}</div>
    </div>
  );
}
