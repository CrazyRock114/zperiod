# Zperiod

An interactive periodic table and chemistry workspace for Grade 9–12: 118
elements, 3D atoms and orbital probability clouds, 66 ions, five chemistry
tools, a worksheet studio with PDF export, 40 languages, and a spaced-repetition
learning path.

A replica of [zperiod.app](https://zperiod.app).

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # -> dist/
npm run serve      # serve the built site on :4173
```

## Scripts

| script | what it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `verify` → `tsc` → `vite build` |
| `npm test` | 170 unit tests (chemistry engine + orbital physics) |
| `npm run test:browser` | 146 assertions in real Chromium against the built site |
| `npm run verify` | data repairs, data checks, i18n checks, unit tests, typecheck |
| `npm run check:data` | validates `src/data/*.json` (118 elements, ions, solubility) |
| `npm run check:i18n` | validates all 40 locale dictionaries |
| `npm run audit:browser` | measures load time, type sizes, occlusion, overflow |

`test:browser` needs a served build:

```bash
npm run build
npm run serve &            # :4173
TEST_IGNORE_CERTS=1 npm run test:browser   # add the flag for a freshly-issued CDN cert
```

## Architecture

```
src/
├─ types/chem.ts          the domain contract everything else is written against
├─ data/
│  ├─ elements.json       118 elements, full reference data
│  ├─ ions.json           66 monatomic + polyatomic ions
│  ├─ solubility.json     42 aqueous-solubility rules
│  ├─ lessons.ts          10-lesson learning path with quizzes
│  └─ elementNames/*.json element names in 40 languages
├─ lib/
│  ├─ chem/               formula parser, balancer, molar mass,
│  │                      solubility, 488-reaction bank, worksheet + PDF
│  ├─ chem3d/             real spherical harmonics, Laguerre radial
│  │                      functions, Slater screening, SPDF point sampling
│  └─ units.ts            temperature / density / energy conversion
├─ i18n/                 40 dictionaries, lazy-loaded, RTL-aware
├─ state/store.tsx        settings, favourites, SM-2 review cards, layout
├─ components/            table, detail panel, 3D atom, orbital atlas,
│                         virtual lab, solubility chart, compare tray
└─ views/                 route-level, code-split
```

## Notable implementation details

**The balancer is exact.** Gaussian elimination over rationals, never floats, so
`H2 + O2 -> H2O` is `2 : 1 : 2` and not `1 : 0.5 : 1`. Rank-deficient equations
(`C + O2 -> CO + CO2`) are reported as under-determined rather than silently
answered with one arbitrary member of the solution family.

**The orbital renderer is real physics.** Point clouds satisfy
`P(r,θ,φ) = R²(r)·|Y(θ,φ)|² > threshold` with the hydrogen-like radial function
from the generalised Laguerre polynomials and exact real spherical harmonics for
s, p, d and f. `src/lib/chem3d/__tests__/cross-check.test.ts` verifies the
implementation against independently derived closed forms.

**The data is checked, not trusted.** `scripts/fix-*.mjs` repair known generator
defects idempotently and `scripts/check-data.mjs` asserts element counts,
electron configurations, phase-at-STP consistency, isotope abundance sums and
ion arithmetic.

**Everything is lazy.** The entry chunk is ~53 kB gzipped; three.js (116 kB),
jsPDF (114 kB), the 118-element dataset and every locale arrive only when used.

## Data sources

Element data is compiled from NIST / CIAAW standard references. Ions and
solubility rules are the conventional textbook tables. IUPAC/CIAAW
isotopic-composition tables are published to two decimals and do not always sum
to 100 %; those residuals are documented rather than "corrected".

## License

MIT
