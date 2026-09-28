import { useCallback, useEffect, useState } from 'react';

export type Route =
  | { name: 'landing' }
  | { name: 'table'; element?: number }
  | { name: 'ions'; element?: number }
  | { name: 'tools'; tool: ToolId; arg?: string }
  | { name: 'worksheet' }
  | { name: 'learn' }
  | { name: 'settings'; section?: string }
  | { name: 'about' };

export type ToolId = 'balancer' | 'molar' | 'solubility' | 'lab' | 'spdf';

/** Encode a route into a location hash. */
export function routeToHash(r: Route): string {
  switch (r.name) {
    case 'landing':
      return '#/';
    case 'table':
      return r.element ? `#/table?e=${r.element}` : '#/table';
    case 'ions':
      return r.element ? `#/ions?e=${r.element}` : '#/ions';
    case 'tools': {
      const base = `#/tools/${r.tool}`;
      return r.arg ? `${base}?q=${encodeURIComponent(r.arg)}` : base;
    }
    case 'worksheet':
      return '#/worksheet';
    case 'learn':
      return '#/learn';
    case 'settings':
      return r.section ? `#/settings/${r.section}` : '#/settings';
    case 'about':
      return '#/about';
  }
}

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [path, query] = raw.split('?');
  const q = new URLSearchParams(query ?? '');
  const seg = path.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);

  if (!seg.length || seg[0] === '') return { name: 'landing' };

  switch (seg[0]) {
    case 'table':
      return { name: 'table', element: numeric(q.get('e')) };
    case 'ions':
      return { name: 'ions', element: numeric(q.get('e')) };
    case 'tools': {
      const tool = (seg[1] ?? 'balancer') as ToolId;
      const valid: ToolId[] = ['balancer', 'molar', 'solubility', 'lab', 'spdf'];
      return {
        name: 'tools',
        tool: valid.includes(tool) ? tool : 'balancer',
        arg: q.get('q') ?? undefined,
      };
    }
    case 'worksheet':
      return { name: 'worksheet' };
    case 'learn':
      return { name: 'learn' };
    case 'settings':
      return { name: 'settings', section: seg[1] };
    case 'about':
      return { name: 'about' };
    default:
      return { name: 'landing' };
  }
}

function numeric(v: string | null): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Hash router — no dependency, survives back/forward and deep links. */
export function useRouter() {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash));

  useEffect(() => {
    const onHash = () => setRoute(parseHash(location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((r: Route, replace = false) => {
    const h = routeToHash(r);
    if (location.hash === h) return;
    if (replace) history.replaceState(null, '', h);
    else location.hash = h;
    setRoute(replace ? parseHash(h) : r);
  }, []);

  const back = useCallback(() => {
    if (history.length > 1) history.back();
    else navigate({ name: 'landing' }, true);
  }, [navigate]);

  return { route, navigate, back };
}

/** Scroll to the top whenever the route changes. */
export function useScrollReset(route: Route) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [route.name, route.name === 'tools' ? route.tool : '']);
}
