#!/usr/bin/env node
/**
 * App-level test in a REAL browser.
 *
 * This replaces a jsdom smoke suite that proved unreliable: jsdom could not
 * measure layout, computed font sizes or occlusion (which is exactly where the
 * reported bugs were), and its act()-wrapped route changes deadlocked in this
 * sandbox. Chromium tests the shipped artifact, so a pass here is a pass for
 * the deployed site.
 *
 *   node scripts/test-browser.mjs [baseUrl]
 *
 * Exits non-zero on the first failing assertion; screenshots go to .audit/.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://127.0.0.1:4173';
const OUT = '.audit';
mkdirSync(OUT, { recursive: true });

const failures = [];
let checks = 0;
function check(ok, what) {
  checks++;
  if (!ok) failures.push(what);
  return ok;
}

// Chromium ships its own CA store, which can lag the platform CDN's freshly
// issued certificate; the system store (curl) already trusts it. This only
// affects the test client.
const IGNORE_CERTS = process.env.TEST_IGNORE_CERTS === '1';

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });

/* ================================================================== */
/* 1. Every route must reach real content, fast, at every viewport     */
/* ================================================================== */

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 },
];
const ROUTES = ['#/table', '#/ions', '#/tools/balancer', '#/worksheet', '#/learn', '#/settings'];

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, ignoreHTTPSErrors: IGNORE_CERTS });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text().slice(0, 160)));
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR ' + String(e).slice(0, 160)));

  for (const hash of ROUTES) {
    const t0 = Date.now();
    await page.goto(`${BASE}/${hash}`, { waitUntil: 'domcontentloaded' });
    // "Ready" = no spinner AND real content. A spinner that never resolves is
    // the regression this assertion exists to catch.
    const ready = await page
      .waitForFunction(
        () => !document.querySelector('.animate-spin') && (document.body.innerText ?? '').length > 150,
        { timeout: 15000 },
      )
      .then(() => true)
      .catch(() => false);
    const ms = Date.now() - t0;
    check(ready, `${vp.name} ${hash}: never finished loading (spinner never resolved)`);
    check(!ready || ms < 5000, `${vp.name} ${hash}: slow to first paint (${ms} ms)`);

    // Nothing legible may render under the sticky nav.
    const underNav = await page.evaluate(() => {
      const nav = document.querySelector('header');
      if (!nav) return 0;
      const nb = nav.getBoundingClientRect();
      let n = 0;
      for (const el of document.querySelectorAll('main *')) {
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        if (r.top < nb.bottom - 1 && r.bottom > nb.top + 1 && el.textContent?.trim()) n++;
      }
      return n;
    });
    check(underNav === 0, `${vp.name} ${hash}: ${underNav} element(s) hidden under the nav bar`);

    // No body-level sideways scroll (the table scrolls inside its own box).
    const ov = await page.evaluate(() => {
      const d = document.documentElement;
      return d.scrollWidth - d.clientWidth;
    });
    check(ov <= 2, `${vp.name} ${hash}: page scrolls sideways by ${ov}px`);

    if (vp.name === 'desktop' || vp.name === 'mobile') {
      await page.screenshot({ path: `${OUT}/${vp.name}${hash.replace(/[#/]/g, '-')}.png` });
    }
  }
  check(consoleErrors.length === 0, `${vp.name}: ${consoleErrors.length} console error(s) — ${consoleErrors[0]}`);
  await ctx.close();
}

/* ================================================================== */
/* 2. Typography: nothing meaningful below 11 px                        */
/* ================================================================== */

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: IGNORE_CERTS });
  const page = await ctx.newPage();
  for (const hash of ROUTES) {
    await page.goto(`${BASE}/${hash}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.querySelector('.animate-spin'), { timeout: 15000 }).catch(() => {});
    const tiny = await page.evaluate(() =>
      [...document.querySelectorAll('main *')]
        .filter((e) => {
          const t = e.textContent?.trim();
          if (!t || e.children.length > 0) return false;
          if (e.tagName === 'SUP') return false; // footnote marks are 8px by design
          return parseFloat(getComputedStyle(e).fontSize) < 11;
        })
        .map((e) => `${e.tagName}.${e.className} ${parseFloat(getComputedStyle(e).fontSize)}px "${e.textContent.trim().slice(0, 18)}"`),
    );
    check(tiny.length === 0, `${hash}: ${tiny.length} text node(s) under 11 px — e.g. ${tiny[0]}`);
  }
  await ctx.close();
}

/* ================================================================== */
/* 3. The periodic table                                               */
/* ================================================================== */

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: IGNORE_CERTS });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/#/table`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('.ptable .cell').length === 118, {
    timeout: 15000,
  });
  check(
    await page.evaluate(() => document.querySelectorAll('.ptable .cell').length === 118),
    'table: 118 cells not rendered',
  );

  const geo = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.ptable .cell')];
    const r0 = cells[0].getBoundingClientRect();
    const names = cells.map((c) => c.querySelector('.cell-name')).filter(Boolean);
    const grid = [...document.querySelectorAll('.ptable')].find((g) => g.querySelector('.cell'));
    const g = grid.getBoundingClientRect();
    const col = (c) => Math.round((c.getBoundingClientRect().left - g.left) / (g.width / 18));
    const bySym = {};
    for (const c of cells) {
      const s = [...c.querySelectorAll('span')].map((x) => x.textContent.trim()).find((x) => /^[A-Z][a-z]?$/.test(x));
      if (s) bySym[s] = c;
    }
    return {
      cell: { w: Math.round(r0.width), h: Math.round(r0.height) },
      nameFont: names[0] ? getComputedStyle(names[0]).fontSize : null,
      // A name split across lines means it was hyphenated mid-word.
      hyphenated: names.filter((n) => n.getClientRects().length > 1).map((n) => n.textContent.trim()),
      alignment: { H: col(bySym.H), He: col(bySym.He), Fe: col(bySym.Fe), La: col(bySym.La), Lu: col(bySym.Lu), Ac: col(bySym.Ac) },
      markers: [...document.querySelectorAll('.fblock-marker')].map((m) => m.textContent.trim()),
      legends: document.querySelectorAll('.ptable ~ *, [class*="LEGEND"]').length,
      hOverflow: (() => {
        const el = document.querySelector('.overflow-x-auto');
        return el ? el.scrollWidth - el.clientWidth : 0;
      })(),
    };
  });

  check(geo.cell.w >= 40, `table: cells only ${geo.cell.w}px wide`);
  check(geo.hyphenated.length === 0, `table: name(s) wrapped mid-word: ${geo.hyphenated.slice(0, 4).join(', ')}`);
  check(parseFloat(geo.nameFont) >= 10.5, `table: element name renders at ${geo.nameFont}`);
  check(geo.alignment.H === 0 && geo.alignment.He === 17, `table: period 1 misaligned (H=${geo.alignment.H}, He=${geo.alignment.He})`);
  check(geo.alignment.La === 2 && geo.alignment.Lu === 16, `table: lanthanide row misaligned (La=${geo.alignment.La}, Lu=${geo.alignment.Lu})`);
  check(geo.markers.length === 2, `table: expected 2 f-block pointers, found ${geo.markers.length} (${geo.markers})`);

  // --- the detail panel must dock, not cover the grid
  await page.click('.ptable .cell >> nth=0');
  await page.waitForTimeout(600);
  const panel = await page.evaluate(() => {
    const a = document.querySelector('aside[role="dialog"]');
    const g = document.querySelector('.ptable');
    if (!a) return { present: false };
    const ar = a.getBoundingClientRect();
    const gr = g.getBoundingClientRect();
    const nav = document.querySelector('header').getBoundingClientRect();
    return {
      present: true,
      overlap: Math.max(0, Math.min(ar.right, gr.right) - Math.max(ar.left, gr.left)),
      clippedByNav: ar.top < nav.bottom - 1,
    };
  });
  check(panel.present, 'table: detail panel did not open');
  check(panel.overlap === 0, `table: detail panel covers ${panel.overlap}px of the grid`);
  check(!panel.clippedByNav, 'table: detail panel header is clipped by the nav bar');
  await page.screenshot({ path: `${OUT}/table-panel.png` });

  // --- the hover tooltip must sit next to the cell, not in the corner
  await page.hover('.ptable .cell >> nth=57');
  await page.waitForTimeout(500);
  const tip = await page.evaluate(() => {
    const t = document.querySelector('[role="tooltip"]');
    if (!t) return { present: false };
    const b = t.getBoundingClientRect();
    const s = document.querySelector('[data-testid="table-search"]');
    const sb = s ? s.getBoundingClientRect() : null;
    return {
      present: true,
      x: Math.round(b.x),
      y: Math.round(b.y),
      coversSearch: sb ? !(b.bottom < sb.top || b.top > sb.bottom || b.right < sb.left || b.left > sb.right) : false,
      inViewport: b.top >= 0 && b.left >= 0 && b.bottom <= innerHeight && b.right <= innerWidth,
    };
  });
  check(tip.present, 'table: hover tooltip did not appear');
  check(tip.y > 100, `table: tooltip pinned to the top-left (y=${tip.y}) — positioning regression`);
  check(!tip.coversSearch, 'table: tooltip covers the search box');
  check(tip.inViewport, 'table: tooltip renders outside the viewport');
  await ctx.close();
}

/* ================================================================== */
/* 4. The tools                                                       */
/* ================================================================== */

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: IGNORE_CERTS });
  const page = await ctx.newPage();

  // --- balancer: unique vs under-determined
  await page.goto(`${BASE}/#/tools/balancer`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('textarea');
  const balance = async (eq) => {
    const ta = page.locator('textarea');
    await ta.fill(eq);
    await page.waitForTimeout(700);
    return page.evaluate(() => {
      const t = document.body.innerText;
      const note = document.querySelector('[data-testid="ambiguity-note"]');
      return { text: t, hasNote: !!note, noteText: note?.textContent ?? '' };
    });
  };

  const octane = await balance('C3H8 + O2 -> CO2 + H2O');
  check(/1C₃H₈/.test(octane.text) || /1C3H8/.test(octane.text), 'balancer: octane not balanced to 1:5:3:4');
  check(!octane.hasNote, 'balancer: a uniquely-determined equation was flagged as ambiguous');

  const under = await balance('CH4 + O2 -> CO2 + H2O + C');
  check(under.hasNote, 'balancer: under-determined equation was NOT flagged');
  check(under.noteText.length > 20, 'balancer: the ambiguity note is empty');

  // A coefficient of 1 must never appear on a non-leading species.
  const al = await balance('2Al(OH)3 -> Al2O3 + 3H2O');
  check(!/1Al₂O₃|1Al2O3/.test(al.text), 'balancer: printed a spurious "1" on a unit-coefficient product');

  // --- molar mass
  await page.goto(`${BASE}/#/tools/molar`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input.font-mono');
  await page.locator('input.font-mono').fill('Ca(OH)2');
  await page.waitForTimeout(700);
  check((await page.evaluate(() => document.body.innerText)).includes('74.09'), 'molar mass: Ca(OH)2 is not 74.09');

  // --- solubility: formula verdict + reference chart
  await page.goto(`${BASE}/#/tools/solubility`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input.font-mono');
  await page.locator('input.font-mono').fill('CaCO3');
  await page.waitForTimeout(700);
  const sol = await page.evaluate(() => {
    const chart = document.querySelector('table');
    const cells = chart ? [...chart.querySelectorAll('tbody button')] : [];
    return {
      text: document.body.innerText,
      chartCells: cells.length,
      marks: [...new Set(cells.map((c) => c.textContent.trim()))],
    };
  });
  check(/[Ii]nsoluble/.test(sol.text), 'solubility: CaCO3 not classified insoluble');
  check(sol.chartCells === 132, `solubility: chart has ${sol.chartCells} cells, expected 132`);
  check(sol.marks.includes('●') && sol.marks.includes('○'), 'solubility: chart has no insoluble cells');

  // --- virtual lab actually animates
  await page.goto(`${BASE}/#/tools/lab`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas');
  const labMoved = await page.evaluate(async () => {
    const c = document.querySelector('canvas');
    if (!c) return false;
    const snap = () => c.toDataURL().length;
    const a = snap();
    await new Promise((r) => setTimeout(r, 900));
    return snap() !== a;
  });
  check(labMoved, 'virtual lab: the simulation is not rendering (canvas never changes)');

  // --- SPDF atlas draws a point cloud
  await page.goto(`${BASE}/#/tools/spdf`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 20000 });
  await page.waitForTimeout(2500);
  const spdf = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return { drew: false, size: 0 };
    return { drew: c.width > 0 && c.height > 0, size: c.toDataURL().length };
  });
  check(spdf.drew && spdf.size > 5000, 'SPDF atlas: canvas is blank (no orbital rendered)');

  // --- worksheet: generate + underfill warning
  await page.goto(`${BASE}/#/worksheet`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="rtype-combustion"]');
  for (const rt of ['synthesis', 'decomposition', 'single-replacement', 'double-replacement']) {
    const b = page.locator(`[data-testid="rtype-${rt}"]`);
    if (await b.count()) await b.click();
  }
  await page.locator('[data-testid="count-50"]').click();
  await page.locator('button', { hasText: /Generate|Regenerate/ }).first().click();
  await page.waitForSelector('ol li', { timeout: 15000 });
  const ws = await page.evaluate(() => ({
    questions: document.querySelectorAll('ol li').length,
    underfill: !!document.querySelector('[data-testid="underfill-note"]'),
    rawKeys: /\{[a-z][a-zA-Z0-9_]*\}/.test(document.body.innerText),
  }));
  check(ws.questions > 0, 'worksheet: no questions generated');
  check(ws.underfill, 'worksheet: asking for 50 combustion questions should warn that the pool is exhausted');
  check(!ws.rawKeys, 'worksheet: a raw i18n key leaked into the page');
  await ctx.close();
}

/* ================================================================== */
/* 5. Ions: charge rendering + salt chemistry                           */
/* ================================================================== */

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: IGNORE_CERTS });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/#/ions`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid^="ion-"]', { timeout: 15000 });
  const ions = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid^="ion-"]')].slice(0, 40).map((e) => e.textContent),
  );
  const cations = ions.filter((t) => /⁺/.test(t));
  check(cations.length > 0, 'ions: no cation rendered with a superscript plus');
  check(
    !ions.some((t) => /\d(?![⁺⁻])/.test(t.split('\n')[0] ?? '')),
    'ions: a charge is rendered as a bare superscript digit (e.g. "Na¹")',
  );

  await page.locator('[data-testid="ion-Na-+1"]').click();
  await page.waitForTimeout(700);
  const detail = await page.evaluate(() => document.body.innerText);
  check(/g\/mol/.test(detail), 'ions: the detail panel has no salt molar mass');
  await page.screenshot({ path: `${OUT}/ion-detail.png` });
  await ctx.close();
}

/* ================================================================== */
/* 6. Learning path, settings, RTL                                     */
/* ================================================================== */

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: IGNORE_CERTS });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/#/learn`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const learn = await page.evaluate(() => document.body.innerText);
  check(/Periodic Table|Atomic Structure|周期表/.test(learn), 'learn: no real lesson titles (raw keys?)');
  check(!/\bTitle\b.*\bSummary\b/.test(learn), 'learn: lesson titles fell back to humanised keys');

  // language switching
  await page.goto(`${BASE}/#/settings`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 15000 });
  await page.getByRole('button', { name: '简体中文', exact: true }).click();
  await page.waitForFunction(() => document.documentElement.lang === 'zh-Hans', { timeout: 10000 });
  check((await page.evaluate(() => document.body.innerText)).match(/[一-鿿]/) !== null, 'i18n: Chinese did not render');

  // Hard reload: a hash-only goto is a same-document navigation and leaves the
  // app mounted, which made this assertion order-dependent. A reload re-reads
  // the persisted language and proves the preference actually survives.
  await page.goto(`${BASE}/#/table`, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('.ptable .cell').length === 118, { timeout: 15000 });
  await page.waitForFunction(() => /[一-鿿]/.test(document.body.innerText), { timeout: 10000 })
    .catch(() => {});
  const zh = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    hasCJK: /[一-鿿]/.test(document.body.innerText),
    firstCell: document.querySelector('.ptable .cell')?.textContent ?? '',
  }));
  check(zh.lang === 'zh-Hans', `i18n: language reverted to "${zh.lang}" after reload`);
  check(zh.hasCJK, 'i18n: the table did not render in Chinese');
  check(/[一-鿿]/.test(zh.firstCell), `i18n: element name is not localised (first cell "${zh.firstCell}")`);
  check(
    !(await page.evaluate(() => /\{[a-z][a-zA-Z0-9_]*\}/.test(document.body.innerText))),
    'i18n: a raw {placeholder} reached the DOM',
  );

  await page.goto(`${BASE}/#/settings`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'العربية', exact: true }).click();
  await page.waitForFunction(() => document.documentElement.lang === 'ar', { timeout: 10000 });
  check(
    await page.evaluate(() => document.documentElement.dir === 'rtl'),
    'i18n: Arabic did not switch the document to RTL',
  );
  check(
    (await page.evaluate(() => document.body.innerText)).match(/[؀-ۿ]/) !== null,
    'i18n: Arabic text did not render',
  );
  await ctx.close();
}

await browser.close();

console.log(`${checks - failures.length}/${checks} checks passed`);
if (failures.length) {
  console.log(`\n${failures.length} failure(s):`);
  for (const f of failures) console.log('  ✗ ' + f);
  process.exitCode = 1;
} else {
  console.log('all checks passed');
}
