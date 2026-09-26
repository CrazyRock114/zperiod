# Zperiod — Interactive Periodic Table Clone

A from-scratch clone of [zperiod.app](https://zperiod.app), the Grade 9-12 chemistry learning platform: 118 elements, 3D atom models, chemistry tools, and worksheet generator. This first build delivers the desktop app skeleton + all four core chemistry tools + worksheet studio with PDF export. Mobile + 3D atom + card customizer + 40-language i18n are scheduled for the next sessions.

## What's in v0.1.0

### ✅ Working now
- **118-element periodic table** with category color-coding (Alkali, Alkaline Earth, Transition Metal, Lanthanide, Actinide, Metalloid, Nonmetal, Halogen, Noble Gas, Post-transition Metal)
- **Element detail modal** — 4-level data (basic / atomic / properties / history), isotopes, oxidation states, common uses, hazards, and chemistry notes
- **Dark / light theme** toggle, persisted in localStorage
- **Welcome modal** on first visit
- **4 chemistry tools**, all in working order:
  1. **Equation Balancer** — pure-JS rational arithmetic, Gaussian elimination over nullspace. Handles nested parentheses, multiple reactants/products, redox. Tries `H2 + O2 -> H2O`, `Fe + O2 -> Fe2O3`, `C2H6 + O2 -> CO2 + H2O`, `KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2`, etc.
  2. **Molar Mass Calculator** — same parser as balancer; element-by-element breakdown with subtotals. Handles `Ca(OH)2`, `Fe2(SO4)3`, `K3[Fe(CN)6]`, etc.
  3. **Solubility Reference** — Grade-9-12 rules with examples for the 10 most-tested anions + cation notes. Quick-check input for common compounds.
  4. **Virtual Lab** — 2D Canvas beaker with adjustable tilt / particle density / speed. Placeholder for the full reaction engine (next session).
- **Worksheet Studio** — Generate balanced-equation practice worksheets. 3 exercise modes (Balance / Identify Type / Combined), 5 reaction types (Synthesis / Decomposition / Single / Double Replacement / Combustion), 5/10/20/30 question counts, 3 difficulty levels. **PDF export** with answer key.

### 🚧 Next sessions (planned)
- 3D atom models (Three.js WebGL — Bohr shells + orbital probability density)
- Card layout customizer (presets / per-cell font size / color / radius / background tint)
- i18n framework — start with EN + ZH; expand toward the full 40-language matrix
- Ion reference (50+ monatomic + polyatomic ions, flame-test hints)
- Mobile-first landing page (iPad portrait rotate-prompt + iPhone app teaser)
- Settings FAB + Changelog modal + Feedback ("Send a Suggestion")
- Apple-style polished animations (Vite + native, no React)

## Quick Start

```bash
npm install
npm run dev          # start dev server at http://localhost:5173
npm run build        # production build to dist/
npm run preview      # preview production build at http://localhost:4173
```

## Project Structure

```
zperiod/
├── data/
│   └── elements.json            # 118 elements, parsed from zperiod.app's bundle
├── public/
│   └── logo.svg                  # Zperiod logo
├── css/
│   ├── base.css                  # Tokens, layout, navigation, modal overlay
│   ├── grid.css                  # Periodic table grid + element cards
│   ├── modal.css                 # Element detail + tool modals
│   └── tools.css                 # Chemistry tools + Worksheet page
├── js/
│   ├── main.js                   # Entry point
│   ├── css-import.js             # Central CSS imports
│   ├── data.js                   # Loader + period/group layout map
│   └── modules/
│       ├── periodicTable.js      # Renders the 18×10 grid
│       ├── elementModal.js       # Element detail card
│       ├── theme.js              # Dark/light toggle
│       ├── welcome.js            # First-visit modal
│       ├── navigation.js         # Top-nav page switcher
│       ├── toolLauncher.js       # Opens chemistry tools in shared modal
│       ├── equationBalancer.js   # Parser + linear-algebra balancer
│       ├── molarMass.js          # Molar mass calculator
│       ├── solubility.js         # Solubility reference
│       ├── virtualLab.js         # 2D Canvas beaker (basic particle sim)
│       ├── worksheet.js          # Worksheet page wiring
│       ├── worksheetGenerator.js # Question pool + generator
│       └── pdfExport.js          # jsPDF export
├── index.html
├── package.json
└── vite.config.js
```

## Data Source

The 118-element dataset is **extracted from zperiod.app's production JS bundle** (`assets/index-DDOWLW_R.js`). The bundle embeds the full `nr = { 1: {…}, 2: {…}, … }` object inline. Extraction is done via brace-matching over the minified file, then `eval` to obtain a live object (handles `.98`, `undefined`, `NaN`), then `JSON.stringify` with all non-finite numbers mapped to `null`.

If you need to re-extract (e.g. bundle hash changes), see `scripts/extract-elements.js` (TODO: not yet committed; inline script in chat history).

## License

MIT — derived dataset is factual element data (atomic masses, configurations, etc.) and is in the public domain.

## Acknowledgments

- [zperiod.app](https://zperiod.app) by Philip Zhao (zperiod.app)
- [Zperiod legacy repo](https://github.com/Zhilips/Zperiod) on GitHub (MIT) — referenced for project structure
- [Three.js](https://threejs.org/) (planned for v0.2 3D atom models)
- [jsPDF](https://github.com/parallax/jsPDF) — worksheet PDF export