/**
 * Real-browser audit. jsdom cannot measure layout, computed font sizes or
 * occlusion, which is exactly where the reported bugs were.
 *
 *   node scripts/audit-browser.mjs [baseUrl]
 *
 * Screenshots land in .audit/ and the JSON report on stdout.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://127.0.0.1:4173';
const OUT = '.audit';
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 },
];

const ROUTES = [
  { hash: '#/table', name: 'table' },
  { hash: '#/ions', name: 'ions' },
  { hash: '#/tools/balancer', name: 'balancer' },
  { hash: '#/worksheet', name: 'worksheet' },
  { hash: '#/learn', name: 'learn' },
  { hash: '#/settings', name: 'settings' },
];

const problems = [];
const report = { timings: {}, layout: {}, tiny: [] };

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200));
  });
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR ' + String(e).slice(0, 200)));

  for (const route of ROUTES) {
    const t0 = Date.now();
    await page.goto(`${BASE}/${route.hash}`, { waitUntil: 'domcontentloaded' });

    // "Loaded" = the route's own content is on screen, not merely that HTML
    // arrived. A spinner that never resolves is the bug we are hunting.
    const ready = await page
      .waitForFunction(
        () => {
          const spinner = document.querySelector('.animate-spin');
          const txt = document.body.innerText ?? '';
          return !spinner && txt.length > 120;
        },
        { timeout: 20000 },
      )
      .then(() => true)
      .catch(() => false);

    const ms = Date.now() - t0;
    report.timings[`${vp.name} ${route.name}`] = { ms, ready };

    if (!ready) {
      problems.push(`${vp.name} ${route.name}: content never appeared within 20 s (still spinning)`);
      await page.screenshot({ path: `${OUT}/${vp.name}-${route.name}-STUCK.png`, fullPage: false });
      continue;
    }
    if (ms > 3000) {
      problems.push(`${vp.name} ${route.name}: slow to first paint (${ms} ms)`);
    }

    // ---- occlusion: is anything hidden underneath a fixed/sticky bar? ----
    const occl = await page.evaluate(() => {
      const nav = document.querySelector('header');
      if (!nav) return [];
      const nb = nav.getBoundingClientRect();
      const out = [];
      for (const el of document.querySelectorAll('main *')) {
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        // Only elements actually in the viewport's top strip under the nav.
        if (r.top < nb.bottom && r.bottom > nb.top && r.top >= -2) {
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
          if (el.textContent?.trim()) {
            out.push({
              tag: el.tagName,
              cls: (el.className || '').toString().slice(0, 60),
              text: el.textContent.trim().slice(0, 40),
              top: Math.round(r.top),
            });
          }
        }
        if (out.length > 6) break;
      }
      return out;
    });
    if (occl.length) {
      problems.push(`${vp.name} ${route.name}: ${occl.length} element(s) under the nav bar`);
      report.layout[`${vp.name} ${route.name} navOverlap`] = occl;
    }

    // ---- horizontal overflow ----
    const overflow = await page.evaluate(() => {
      const de = document.documentElement;
      return { scrollW: de.scrollWidth, clientW: de.clientWidth };
    });
    if (overflow.scrollW > overflow.clientW + 2) {
      report.layout[`${vp.name} ${route.name} overflow`] = overflow;
    }

    if (vp.name === 'desktop' || vp.name === 'mobile') {
      await page.screenshot({ path: `${OUT}/${vp.name}-${route.name}.png`, fullPage: false });
    }
  }

  if (consoleErrors.length) {
    report.layout[`${vp.name} console`] = consoleErrors.slice(0, 5);
    problems.push(`${vp.name}: ${consoleErrors.length} console error(s): ${consoleErrors[0]}`);
  }
  await ctx.close();
}

/* ---- dedicated table measurements ---- */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/#/table`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('.ptable .cell').length === 118, {
    timeout: 20000,
  }).catch(() => problems.push('table: 118 cells never rendered'));

  const cells = await page.evaluate(() => {
    const out = [];
    for (const sel of ['.ptable .cell']) {
      for (const el of document.querySelectorAll(sel)) {
        for (const s of el.querySelectorAll('span')) {
          const cs = getComputedStyle(s);
          const fs = parseFloat(cs.fontSize);
          if (fs < 11 && s.textContent?.trim()) {
            out.push({ fs, text: s.textContent.trim().slice(0, 14) });
          }
        }
      }
    }
    const cell = document.querySelector('.ptable .cell');
    const r = cell?.getBoundingClientRect();
    return {
      tinySpans: out.slice(0, 12),
      tinyCount: out.length,
      cellSize: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null,
      gridWidth: Math.round(document.querySelector('.ptable')?.getBoundingClientRect().width ?? 0),
      totalCells: document.querySelectorAll('.ptable .cell').length,
    };
  });
  report.layout.table = cells;
  if (cells.tinyCount > 0) {
    problems.push(`table: ${cells.tinyCount} span(s) render below 11 px (smallest ${Math.min(...cells.tinySpans.map((t) => t.fs))} px)`);
  }
  if (cells.cellSize && cells.cellSize.w < 40) {
    problems.push(`table: cells only ${cells.cellSize.w} px wide — too small to read`);
  }
  await page.screenshot({ path: `${OUT}/table-detail.png` });

  // open an element and check the panel does not cover the grid
  await page.click('.ptable .cell >> nth=0');
  await page.waitForTimeout(600);
  const withPanel = await page.evaluate(() => {
    const aside = document.querySelector('aside[role="dialog"]');
    const grid = document.querySelector('.ptable');
    if (!aside || !grid) return { panel: !!aside };
    const a = aside.getBoundingClientRect();
    const g = grid.getBoundingClientRect();
    const overlapX = Math.max(0, Math.min(a.right, g.right) - Math.max(a.left, g.left));
    return {
      panel: true,
      panelZ: getComputedStyle(aside).zIndex,
      navZ: getComputedStyle(document.querySelector('header')).zIndex,
      gridRight: Math.round(g.right),
      panelLeft: Math.round(a.left),
      overlapPx: Math.round(overlapX),
      headerClipped: a.top < document.querySelector('header').getBoundingClientRect().bottom,
    };
  });
  report.layout.tablePanel = withPanel;
  if (withPanel.panel) {
    if (withPanel.overlapPx > 0) {
      problems.push(`table: detail panel overlaps the grid by ${withPanel.overlapPx} px on a 1440 px screen`);
    }
    if (withPanel.headerClipped) {
      problems.push('table: detail panel header is clipped by the nav bar');
    }
    // A lower z-index is fine as long as the panel actually clears the nav;
    // it is docked below the nav on purpose and offsets itself for exactly
    // this reason. Only a real clip is a defect.
  }
  await page.screenshot({ path: `${OUT}/table-panel.png` });
  await ctx.close();
}

await browser.close();

report.problems = problems;
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));

console.log('=== first-paint timings ===');
for (const [k, v] of Object.entries(report.timings)) {
  console.log(`  ${k.padEnd(22)} ${String(v.ms).padStart(6)} ms  ${v.ready ? 'ok' : 'STUCK'}`);
}
console.log('\n=== table measurements ===');
console.log(JSON.stringify(report.layout.table, null, 2));
console.log('\n=== detail panel vs grid ===');
console.log(JSON.stringify(report.layout.tablePanel, null, 2));
console.log(`\n=== ${problems.length} problem(s) ===`);
for (const p of problems) console.log('  ✗ ' + p);
process.exitCode = problems.length ? 1 : 0;
