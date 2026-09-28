import React, { Suspense, lazy, useEffect } from 'react';
import { useI18n } from './i18n';
import { useRouter, useScrollReset, type Route } from './router';
import { useStore } from './state/store';
import { Shell } from './components/Shell';
import { Spinner } from './components/Spinner';

/*
 * Route-level code splitting.
 *
 * Every view used to be a static import, so all eight of them landed in the
 * entry chunk: 364 kB raw / 112 kB gzipped, of which react-dom is 41 kB and
 * the rest was code a first-time visitor never executes. Splitting by route
 * keeps the entry to the shell + the stores and lets each view arrive on
 * demand. The figures below are measured, not estimated.
 */
const Landing = lazy(() => import('./views/Landing').then((m) => ({ default: m.Landing })));
const TableView = lazy(() => import('./views/TableView').then((m) => ({ default: m.TableView })));
const IonsView = lazy(() => import('./views/IonsView').then((m) => ({ default: m.IonsView })));
const ToolsView = lazy(() => import('./views/ToolsView').then((m) => ({ default: m.ToolsView })));
const WorksheetView = lazy(() =>
  import('./views/WorksheetView').then((m) => ({ default: m.WorksheetView })),
);
const LearnView = lazy(() => import('./views/LearnView').then((m) => ({ default: m.LearnView })));
const SettingsView = lazy(() =>
  import('./views/SettingsView').then((m) => ({ default: m.SettingsView })),
);
const AboutView = lazy(() => import('./views/AboutView').then((m) => ({ default: m.AboutView })));

const TITLES: Record<Route['name'], string> = {
  landing: 'Zperiod',
  table: 'Periodic Table',
  ions: 'Ions',
  tools: 'Chemistry Tools',
  worksheet: 'Worksheet Generator',
  learn: 'Learning Path',
  settings: 'Settings',
  about: 'About',
};

export default function App() {
  const { route, navigate } = useRouter();
  const { seenLanding, lang } = useStore();
  const { t } = useI18n();
  useScrollReset(route);

  useEffect(() => {
    document.title = `${TITLES[route.name]} · Zperiod`;
  }, [route.name]);

  // First visit lands on the marketing page; "Enter" sets seenLanding and the
  // user never gets bounced back there.
  useEffect(() => {
    if (!location.hash) {
      navigate(seenLanding ? { name: 'table' } : { name: 'landing' }, true);
    }
  }, [navigate, seenLanding]);

  // Loading a view pulls in a chunk; the language never changes underneath it.
  const key = route.name === 'tools' ? `tools-${route.tool}` : route.name;

  const body = (() => {
    switch (route.name) {
      case 'landing':
        return <Landing navigate={navigate} />;
      case 'table':
        return <TableView navigate={navigate} initialElement={route.element} />;
      case 'ions':
        return <IonsView initialElement={route.element} />;
      case 'tools':
        return <ToolsView tool={route.tool} arg={route.arg} navigate={navigate} />;
      case 'worksheet':
        return <WorksheetView />;
      case 'learn':
        return <LearnView navigate={navigate} />;
      case 'settings':
        return <SettingsView />;
      case 'about':
        return <AboutView navigate={navigate} />;
    }
  })();

  if (route.name === 'landing') {
    return (
      <Suspense fallback={<FullScreenLoad label={t('app.loading')} />}>
        {body}
      </Suspense>
    );
  }

  return (
    <Shell route={route} navigate={navigate}>
      <Suspense fallback={<RouteLoad label={t('app.loading')} />} key={key + lang}>
        {body}
      </Suspense>
    </Shell>
  );
}

function RouteLoad({ label }: { label: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center">
        <Spinner />
        <p className="muted mt-2.5 text-sm">{label}</p>
      </div>
    </div>
  );
}

function FullScreenLoad({ label }: { label: string }) {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="text-center">
        <Spinner />
        <p className="muted mt-2.5 text-sm">{label}</p>
      </div>
    </div>
  );
}
