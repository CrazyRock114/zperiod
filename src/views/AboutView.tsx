import React from 'react';
import { useI18n } from '../i18n';
import { LANGUAGES } from '../i18n/languages';
import { useElements, useIons } from '../data';
import { FeedbackForm } from '../components/FeedbackForm';
import type { Route } from '../router';

const VERSIONS = [
  { v: '3.0.0', date: '2026-07-21', items: [
    ['NEW', 'SPDF Orbital Atlas', 'atom.spdf.title'],
    ['TOOL', 'Custom Layouts', 'table.layout'],
    ['LEARN', 'Learning Path & Spaced Review', 'learn.title'],
    ['ARCHIVE', 'Richer Element Archive', 'element.summary'],
  ] },
  { v: '2.5.1', date: '2026-04-29', items: [
    ['TOOL', 'Performance Enhancements', 'tools.title'],
  ] },
  { v: '2.5.0', date: '2026-03-14', items: [
    ['TOOL', 'Identify Type & Combined worksheet modes', 'worksheet.combined'],
  ] },
  { v: '2.4.0', date: '2026-02-02', items: [
    ['LANG', '8 new languages', 'settings.language'],
  ] },
];

export function AboutView({ navigate }: { navigate: (r: Route) => void }) {
  const { t, num } = useI18n();
  const elements = useElements();
  const ions = useIons();

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 sm:px-5">
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t('nav.about')}</h1>
        <p className="muted mt-1 text-sm">{t('app.tagline')}</p>
      </header>

      {/* numbers */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Big value={num(elements.data?.length ?? 118)} label={t('landing.stats.elements')} />
        <Big value={num(ions.data?.length ?? 0)} label={t('landing.stats.ions')} />
        <Big value={num(LANGUAGES.length)} label={t('landing.stats.languages')} />
        <Big value="5" label={t('nav.tools')} />
      </div>

      <section className="surface mt-5 p-5">
        <h2 className="text-sm font-extrabold">{t('settings.about')}</h2>
        <p className="muted mt-2 text-[13px] leading-relaxed">{t('footer.privacy')}</p>
        <p className="mt-2 text-[12px] faint">{t('footer.notAffiliated')}</p>
      </section>

      {/* changelog */}
      <section className="mt-5">
        <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide faint">
          {t('misc.new')} · v3.0.0
        </h2>
        <div className="flex flex-col gap-3">
          {VERSIONS.map((rel) => (
            <div key={rel.v} className="surface p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-extrabold">v{rel.v}</span>
                <span className="tag tnum">{rel.date}</span>
              </div>
              <ul className="space-y-1.5">
                {rel.items.map(([tag, label, key]) => (
                  <li key={label} className="flex items-baseline gap-2 text-[12.5px]">
                    <span
                      className="rounded px-1.5 py-0.5 text-[12px] font-black tracking-wide"
                      style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                    >
                      {tag}
                    </span>
                    <span>{label}</span>
                    <span className="faint">· {t(key)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* languages */}
      <section className="surface mt-5 p-5">
        <h2 className="text-sm font-extrabold">{t('settings.language')}</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {LANGUAGES.map((l) => (
            <button key={l.code} className="chip text-[12px]" dir={l.dir} onClick={() => navigate({ name: 'settings', section: l.code })}>
              {l.name}
            </button>
          ))}
        </div>
      </section>

      {/* feedback */}
      <section className="surface mt-5 p-5">
        <h2 className="text-sm font-extrabold">{t('feedback.title')}</h2>
        <p className="muted mt-0.5 text-[11.5px]">{t('feedback.subtitle')}</p>
        <div className="mt-3">
          <FeedbackForm />
        </div>
      </section>
    </div>
  );
}

function Big({ value, label }: { value: string; label: string }) {
  return (
    <div className="surface p-3.5">
      <div className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--accent)' }}>
        {value}
      </div>
      <div className="mt-0.5 text-[11.5px] uppercase tracking-wide faint">{label}</div>
    </div>
  );
}
