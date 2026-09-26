# Zperiod — Agent Operating Manual

Project-specific guidance for AI agents working on the Zperiod clone under `Documents/MiniMax/Science/zperiod/`.

## Project facts (always true)

- **Working directory**: `Documents/MiniMax/Science/zperiod/` (not `Projects/Zperiod/`). The latter is an orphan from a previous attempt and is never written to.
- **Build tool**: Vite 5 (vanilla JS, no React/Vue). Type: `module`. Entry: `index.html` → `js/main.js`.
- **Element data source**: extracted once from zperiod.app's bundle, frozen in `data/elements.json`. Do **not** edit individual element fields — re-run the extractor if upstream data changes.
- **CSS strategy**: a single import in `js/css-import.js` pulls in all four `.css` files. Vite picks them up via PostCSS. No CSS-in-JS, no CSS modules.
- **No global CSS frameworks** (no Tailwind, no Bootstrap). Everything is hand-written.

## Component conventions

- **Module pattern**: each `js/modules/*.js` exposes `init*` or `render*` functions, not classes. Side effects (DOM binding) happen in `init*`; pure logic lives in module-level functions.
- **Data flow**: `data.js` is the single source of truth for the 118-element dataset. Modules import `getById`, `getBySymbol`, `getAllElements`, `buildLayout`, `categoryClass` from there.
- **Modal pattern**: shared `<div class="modal-overlay">` containers are in `index.html`. Modules render into `#body` and call `.classList.add('active')` to open. Escape key + click-on-overlay always close.

## Adding new elements (rare)

1. Verify the upstream source (zperiod.app or NIST).
2. Add to `data/elements.json` following the existing 4-level nested structure (`level1_basic`, `level2_atomic`, `level3_properties`, `level4_history_stse`).
3. If layout position needs changing, update `buildLayout()` in `js/data.js`.
4. Re-run `npm run build` to confirm no breakage.

## Adding a new chemistry tool

1. Create `js/modules/<toolName>.js` exporting `render<ToolName>Tool(bodyEl)` (see `equationBalancer.js` for the contract).
2. Register it in `js/modules/toolLauncher.js` (both `RENDERERS` map and the `data-tool` selector binding).
3. Add a card in `index.html` under `.tools-grid` with `data-tool="<your-tool>"`.
4. Style in `css/tools.css` if the default isn't enough.

## Adding a new worksheet reaction type

Edit `js/modules/worksheetGenerator.js`:
- Add to `REACTION_POOL` under your new key.
- Add label to `TYPE_LABELS`.
- Add to the type selector checkboxes in `index.html` (`.ws-reactions` fieldset).

## Hard rules

- **Don't introduce React/Vue/Svelte** without an explicit user ask. The project is intentionally vanilla for educational simplicity.
- **Don't shadow or rewrite `data/elements.json`**. Re-extraction only.
- **Don't add a build step beyond Vite** (no Webpack, no Rollup configs).
- **Don't write to `Documents/MiniMax/Science/Projects/Zperiod/`** (orphan).
- **Keep `localStorage` keys namespaced** with `zperiod_*` to avoid clashing with any other site the user has open.
- **No emojis** in UI text. SVG icons only.
- **No new dependencies** without explicit user approval. Current deps: `three` (planned for v0.2), `jspdf` (used).

## File I/O conventions

- `data/elements.json` — frozen dataset, do not hand-edit individual elements.
- `css/` — additive; append new selectors to existing files rather than creating new ones unless a feature is self-contained.
- `js/modules/` — one module per concern; never consolidate unrelated modules.

## Deployment

When the user asks to deploy:

1. `npm run build` to produce `dist/`.
2. Use the `deploy-website` skill with `path: ./dist` and a project name like `zperiod`.
3. **Minimum deployment rule** (per user memory): only ship what is actually referenced from `index.html`. Don't dump the source tree to public. Run `du -sh dist/` first.

## What's deliberately not done yet

These are deferred to v0.2+ and **not** to be tackled without a fresh session ask:

- 3D atom model rendering (Three.js scene + electron shells / orbital probability density)
- Card layout customizer (presets, per-cell font / color / radius / background)
- 40-language i18n (start with EN + ZH)
- Ion reference (50+ monatomic + polyatomic ions)
- Mobile-first landing page (iPad portrait rotate-prompt + iPhone app teaser)
- Settings FAB + Changelog modal + "Send a Suggestion" feedback widget
- Reaction engine in the Virtual Lab (currently just particles)
- Save / share worksheet to URL

Each session should pick **at most one** of these tracks and ship a coherent chunk before stopping.

## Known issues

- `PeriodicTable.js` is idempotent — calling `renderPeriodicTable` twice is a no-op. To re-render (e.g. after a layout change), call `clearPeriodicTable` first.
- `equationBalancer.js` uses rational arithmetic for exact solutions. For very large systems (e.g. combustion of C₁₆H₃₄) the nullspace can be multi-dimensional; we pick the basis vector with smallest max coefficient. This is a heuristic, not always optimal — but matches the convention in published high-school chemistry worksheets.
- `virtualLab.js` is intentionally minimal. It tilts a beaker with bouncing particles; reactions are not modeled. See TODO in `js/modules/virtualLab.js`.