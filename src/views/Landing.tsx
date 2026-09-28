import React, { useState } from 'react';
import { useI18n } from '../i18n';
import { useStore } from '../state/store';
import { useElements, useIons } from '../data';
import { LANGUAGES } from '../i18n/languages';
import type { Route } from '../router';

const FEATURES = [
  { key: 'table', icon: '▦', titleKey: 'landing.feature.table.title', bodyKey: 'landing.feature.table.body' },
  { key: 'atoms', icon: '⚛', titleKey: 'landing.feature.atoms.title', bodyKey: 'landing.feature.atoms.body' },
  { key: 'ions', icon: '±', titleKey: 'landing.feature.ions.title', bodyKey: 'landing.feature.ions.body' },
  { key: 'tools', icon: '⚗', titleKey: 'landing.feature.tools.title', bodyKey: 'landing.feature.tools.body' },
  { key: 'worksheet', icon: '▤', titleKey: 'landing.feature.worksheet.title', bodyKey: 'landing.feature.worksheet.body' },
  { key: 'learn', icon: '✦', titleKey: 'landing.feature.learn.title', bodyKey: 'landing.feature.learn.body' },
];

export function Landing({ navigate }: { navigate: (r: Route) => void }) {
  const { t, num } = useI18n();
  const { markLandingSeen } = useStore();
  const elements = useElements();
  const ions = useIons();
  const [showLang, setShowLang] = useState(false);

  const enter = (r: Route) => {
    markLandingSeen();
    navigate(r);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      {/* hero */}
      <section className="fade-up text-center">
        <span className="tag mb-5 inline-flex">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--c-metalloid)]" />
          v3.0.0 · {t('misc.new')}
        </span>

        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          {t('landing.hero.title')}
        </h1>
        <p className="muted mx-auto mt-4 max-w-2xl text-base sm:text-lg">{t('landing.hero.subtitle')}</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
          <button className="btn btn-primary px-6 py-3 text-[15px]" onClick={() => enter({ name: 'table' })}>
            {t('landing.hero.cta')}
          </button>
          <button className="btn btn-ghost px-5 py-3" onClick={() => setShowLang((v) => !v)}>
            🌐 {LANGUAGES.length} {t('nav.tools') === '' ? '' : t('landing.stats.languages')}
          </button>
        </div>

        {/* stats */}
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat value={elements.data ? num(elements.data.length) : '118'} label={t('landing.stats.elements')} />
          <Stat value={ions.data ? num(ions.data.length) : '50+' + '+'} label={t('landing.stats.ions')} />
          <Stat value={num(LANGUAGES.length)} label={t('landing.stats.languages')} />
          <Stat value={t('landing.stats.price')} label={t('misc.free')} />
        </div>

        {showLang && (
          <div className="fade-up mx-auto mt-6 max-w-3xl rounded-2xl border p-4 text-start" style={{ borderColor: 'var(--border)' }}>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide faint">{t('settings.language')}</p>
            <div className="flex flex-wrap gap-1.5">
              {LANGUAGES.map((l) => (
                <span key={l.code} className="chip text-[12px]" dir={l.dir}>
                  {l.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* features */}
      <section className="mt-16">
        <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
          {t('landing.feature.table.title') === 'Periodic Table' ? 'Everything you need for Chemistry' : ''}
        </h2>
        <p className="muted mx-auto mt-2 max-w-xl text-center text-sm">
          {elements.loading ? t('app.loading') : `${elements.data?.length ?? 118} elements · free · no sign-up`}
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <button
              key={f.key}
              onClick={() => enter(ROUTE_FOR[f.key])}
              className="surface card-shadow fade-up p-5 text-start transition-transform hover:-translate-y-0.5"
            >
              <span
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                {f.icon}
              </span>
              <h3 className="text-[15px] font-bold">{t(f.titleKey)}</h3>
              <p className="muted mt-1.5 text-[13px] leading-relaxed">{t(f.bodyKey)}</p>
            </button>
          ))}
        </div>
      </section>

      {/* cta */}
      <section className="mt-16 rounded-3xl p-8 text-center" style={{ background: 'linear-gradient(135deg, var(--accent-soft), var(--surface-2))' }}>
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {t('landing.feature.learn.title')}
        </h2>
        <p className="muted mx-auto mt-2 max-w-lg text-sm">{t('landing.feature.learn.body')}</p>
        <button className="btn btn-primary mt-6 px-6 py-3" onClick={() => enter({ name: 'table' })}>
          {t('landing.hero.cta')} →
        </button>
      </section>
    </div>
  );
}

const ROUTE_FOR: Record<string, Route> = {
  table: { name: 'table' },
  atoms: { name: 'table' },
  ions: { name: 'ions' },
  tools: { name: 'tools', tool: 'balancer' },
  worksheet: { name: 'worksheet' },
  learn: { name: 'learn' },
};

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="surface p-3.5">
      <div className="text-xl font-extrabold tracking-tight sm:text-2xl" style={{ color: 'var(--accent)' }}>
        {value}
      </div>
      <div className="mt-0.5 text-[11.5px] uppercase tracking-wide faint">{label}</div>
    </div>
  );
}
