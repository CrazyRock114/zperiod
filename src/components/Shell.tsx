import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { LANGUAGES } from '../i18n/languages';
import { useStore } from '../state/store';
import { routeToHash, type Route, type ToolId } from '../router';

const NAV: Array<{ route: Route; labelKey: string; icon: string; match: string }> = [
  { route: { name: 'table' }, labelKey: 'nav.table', icon: '▦', match: 'table' },
  { route: { name: 'ions' }, labelKey: 'nav.ions', icon: '±', match: 'ions' },
  { route: { name: 'tools', tool: 'balancer' }, labelKey: 'nav.tools', icon: '⚗', match: 'tools' },
  { route: { name: 'worksheet' }, labelKey: 'nav.worksheet', icon: '▤', match: 'worksheet' },
  { route: { name: 'learn' }, labelKey: 'nav.learn', icon: '✦', match: 'learn' },
  { route: { name: 'settings' }, labelKey: 'nav.settings', icon: '⚙', match: 'settings' },
];

export function Shell({
  route,
  navigate,
  children,
}: {
  route: Route;
  navigate: (r: Route) => void;
  children: React.ReactNode;
}) {
  const { t, lang } = useI18n();
  const { favorites } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMenuOpen(false), [route.name]);

  const active = route.name;
  const current = route.name === 'tools' ? `tools:${route.tool}` : active;

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm">
        {t('app.skipToContent')}
      </a>

      <header
        className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{ background: 'color-mix(in srgb, var(--surface-0) 82%, transparent)', borderColor: 'var(--border)' }}
      >
        <div className="mx-auto flex max-w-[1800px] items-center gap-2 px-3 py-2.5 sm:px-5">
          <button
            className="flex shrink-0 items-center gap-2"
            onClick={() => navigate({ name: 'table' })}
            aria-label={t('app.name')}
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg text-base font-black text-white"
              style={{ background: 'linear-gradient(135deg, var(--accent), #4bb8d8)' }}
            >
              Z
            </span>
            <span className="hidden text-[15px] font-extrabold tracking-tight sm:block">{t('app.name')}</span>
          </button>

          {/* desktop nav */}
          <nav ref={navRef} className="mx-auto hidden items-center gap-0.5 md:flex">
            {NAV.map((n) => {
              const on = n.match === active || (n.match === 'tools' && active === 'tools');
              return (
                <button
                  key={n.match}
                  onClick={() => navigate(n.route)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors"
                  style={{
                    background: on ? 'var(--accent-soft)' : 'transparent',
                    color: on ? 'var(--accent)' : 'var(--text-2)',
                  }}
                  aria-current={on ? 'page' : undefined}
                >
                  <span aria-hidden className="text-[13px]">{n.icon}</span>
                  {t(n.labelKey)}
                  {n.match === 'ions' && null}
                </button>
              );
            })}
          </nav>

          <div className="ms-auto flex items-center gap-1.5 md:ms-0">
            <LangMenu />
            <a
              className="btn btn-ghost hidden h-8 px-2.5 text-xs sm:inline-flex"
              href="https://github.com"
              target="_blank"
              rel="noreferrer noopener"
              title={t('footer.built')}
            >
              ★
            </a>
            <button
              className="btn btn-ghost h-8 w-8 px-0 md:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={t('app.menu')}
              aria-expanded={menuOpen}
            >
              ☰
            </button>
          </div>
        </div>

        {/* mobile nav */}
        {menuOpen && (
          <div className="border-t px-3 py-2 md:hidden" style={{ borderColor: 'var(--border)' }}>
            {NAV.map((n) => (
              <button
                key={n.match}
                onClick={() => navigate(n.route)}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-start text-sm font-semibold"
                style={{ color: n.match === active ? 'var(--accent)' : 'var(--text-1)' }}
              >
                <span aria-hidden>{n.icon}</span>
                {t(n.labelKey)}
              </button>
            ))}
            {favorites.length > 0 && (
              <p className="px-3 pt-1 text-[12px] faint">
                ★ {favorites.length} {t('settings.favorites')}
              </p>
            )}
          </div>
        )}
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="mt-10 border-t py-6 text-center text-[12px] faint" style={{ borderColor: 'var(--border)' }}>
        <p>
          {t('app.name')} · {t('footer.privacy')} · {t('footer.notAffiliated')}
        </p>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Language menu                                                       */
/* ------------------------------------------------------------------ */

function LangMenu() {
  const { t, lang } = useI18n();
  const { setLang } = useStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const list = LANGUAGES.filter(
    (l) => !q || l.name.toLowerCase().includes(q.toLowerCase()) || l.code.toLowerCase().includes(q.toLowerCase()),
  );

  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        className="btn btn-ghost h-8 gap-1.5 px-2.5 text-xs"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('settings.language')}
      >
        <span aria-hidden>🌐</span>
        <span className="hidden sm:inline">{current.code}</span>
      </button>
      {open && (
        <div
          className="absolute end-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border shadow-2xl"
          style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}
        >
          <div className="border-b p-2" style={{ borderColor: 'var(--border)' }}>
            <input
              className="input py-1.5 text-xs"
              placeholder={t('app.search')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
          </div>
          <ul className="thin-scroll max-h-80 overflow-y-auto" role="listbox" aria-label={t('settings.language')}>
            {list.map((l) => (
              <li key={l.code}>
                <button
                  role="option"
                  aria-selected={l.code === lang}
                  onClick={() => {
                    setLang(l.code);
                    setOpen(false);
                    setQ('');
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start text-[13px] hover:bg-[var(--surface-2)]"
                  style={l.code === lang ? { color: 'var(--accent)', fontWeight: 700 } : undefined}
                  dir={l.dir}
                >
                  <span>{l.name}</span>
                  <span className="text-[11.5px] faint">{l.code}</span>
                </button>
              </li>
            ))}
            {!list.length && <li className="px-3 py-4 text-center text-xs faint">{t('app.noResults')}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
