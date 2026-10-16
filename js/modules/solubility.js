// ====================================================================
// solubility.js — solubility rules reference (high-school chemistry)
// ====================================================================

// Solubility is reported as:
//   "soluble" → aqueous (aq) — forms solution
//   "insoluble" → solid precipitate (s) — falls out
//   "slightly soluble" → typically treated as insoluble in homework
//   "decomposes" → reacts with water (e.g. Na2O → NaOH)
//
// We expose a small set of canonical rules plus a quick-lookup matrix
// for common cation × anion combinations (the ones a Grade-9-12 student
// is expected to memorize). Anything outside the matrix gets a fallback
// "check specific source" message.

const ALWAYS_SOLUBLE = [
  'Li⁺', 'Na⁺', 'K⁺', 'NH₄⁺',                 // Group 1 + ammonium
  'NO₃⁻', 'ClO₃⁻', 'ClO₄⁻', 'CH₃COO⁻'         // nitrate, chlorate, perchlorate, acetate
];

const USUALLY_SOLUBLE_BUT_NOTABLE = {
  'Cl⁻': { insolubleWith: ['Ag⁺', 'Pb²⁺', 'Hg₂²⁺'] },
  'Br⁻': { insolubleWith: ['Ag⁺', 'Pb²⁺', 'Hg₂²⁺'] },
  'I⁻':  { insolubleWith: ['Ag⁺', 'Pb²⁺', 'Hg₂²⁺'] },
  'SO₄²⁻': { insolubleWith: ['Ba²⁺', 'Pb²⁺', 'Sr²⁺', 'Ca²⁺'] }, // Ca slightly
  'OH⁻': { insolubleWith: ['Mg²⁺', 'Ca²⁺', 'Sr²⁺', 'Ba²⁺', 'Al³⁺', 'Fe³⁺'] },
  'S²⁻': { insolubleWith: ['Cu²⁺', 'Pb²⁺', 'Hg²⁺', 'Ag⁺', 'Fe²⁺', 'Fe³⁺'] },
  'CO₃²⁻': { insolubleWith: ['Group 1', 'NH₄⁺'], note: 'Group 1 + NH₄⁺ soluble; others insoluble' },
  'PO₄³⁻': { insolubleWith: ['Group 1', 'NH₄⁺'], note: 'Group 1 + NH₄⁺ soluble; others insoluble' }
};

const ANION_TABLE = [
  { anion: 'NO₃⁻', name: 'Nitrate', soluble: 'Always',  example: 'NaNO₃' },
  { anion: 'Cl⁻',   name: 'Chloride', soluble: 'Usually (Ag, Pb, Hg₂ exceptions)', example: 'NaCl (sol); AgCl (insol)' },
  { anion: 'Br⁻',   name: 'Bromide', soluble: 'Usually (Ag, Pb, Hg₂ exceptions)', example: 'KBr (sol); AgBr (insol)' },
  { anion: 'I⁻',    name: 'Iodide', soluble: 'Usually (Ag, Pb, Hg₂ exceptions)', example: 'KI (sol); AgI (insol)' },
  { anion: 'SO₄²⁻', name: 'Sulfate', soluble: 'Usually (Ba, Pb, Sr, Ca exceptions)', example: 'MgSO₄ (sol); BaSO₄ (insol)' },
  { anion: 'OH⁻',   name: 'Hydroxide', soluble: 'Group 1, NH₄⁺, Ba, Sr (slightly); others insoluble', example: 'NaOH (sol); Cu(OH)₂ (insol)' },
  { anion: 'S²⁻',   name: 'Sulfide', soluble: 'Group 1, NH₄⁺; otherwise insoluble', example: 'Na₂S (sol); CuS (insol)' },
  { anion: 'CO₃²⁻', name: 'Carbonate', soluble: 'Group 1, NH₄⁺; otherwise insoluble', example: 'Na₂CO₃ (sol); CaCO₃ (insol)' },
  { anion: 'PO₄³⁻', name: 'Phosphate', soluble: 'Group 1, NH₄⁺; otherwise insoluble', example: 'Na₃PO₄ (sol); Ca₃(PO₄)₂ (insol)' },
  { anion: 'CH₃COO⁻', name: 'Acetate', soluble: 'Usually', example: 'NaCH₃COO (sol); AgCH₃COO (slightly)' }
];

const CATION_NOTES = [
  { cation: 'Group 1 (Li⁺, Na⁺, K⁺, Rb⁺, Cs⁺)', note: 'All common salts are soluble' },
  { cation: 'Ammonium (NH₄⁺)', note: 'All common salts are soluble' },
  { cation: 'Silver (Ag⁺)', note: 'Forms insoluble halides (AgCl, AgBr, AgI), Ag₂S, Ag₂CO₃' },
  { cation: 'Lead (Pb²⁺)', note: 'Forms insoluble halides (PbCl₂, PbI₂), PbSO₄, PbS, PbCO₃' },
  { cation: 'Barium (Ba²⁺)', note: 'Forms insoluble BaSO₄ (white precipitate), BaCO₃' },
  { cation: 'Calcium (Ca²⁺)', note: 'Forms insoluble CaCO₃ (limestone), CaSO₄ (slightly soluble), Ca(OH)₂ (limewater)' }
];

// Look up solubility for a compound by evaluating canonical high-school rules.
export function lookupSolubility(formula) {
  if (!formula || typeof formula !== 'string') {
    return { result: 'Invalid', rationale: 'Please enter a valid chemical formula.' };
  }
  const norm = formula.trim().replace(/\s+/g, '');

  // 1. Noble gases check (prevent 'Kr' false matching 'K')
  const nobleGases = ['He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn'];
  if (nobleGases.includes(norm)) {
    return {
      result: 'Non-ionic',
      rationale: `${norm} is a noble gas element, not an ionic compound.`
    };
  }

  // 2. Common molecular non-electrolytes
  if (['H2O', 'CO2', 'CO', 'CH4', 'O2', 'N2', 'H2'].includes(norm)) {
    return {
      result: 'Molecular',
      rationale: `${norm} is a covalent molecule, not an ionic salt.`
    };
  }

  // 3. Always soluble anions: Nitrate (NO3), Acetate (CH3COO, C2H3O2), Chlorate/Perchlorate
  const isAlwaysSolubleAnion = /NO3|CH3COO|C2H3O2|ClO3|ClO4/i.test(norm);
  if (isAlwaysSolubleAnion) {
    return {
      result: 'Soluble (aq)',
      rationale: 'All common nitrates, acetates, and chlorates are soluble in water.'
    };
  }

  // 4. Always soluble cations: Group 1 (Li, Na, K, Rb, Cs) & Ammonium (NH4)
  // Ensure element boundaries (e.g. K not followed by lowercase letter, preventing Kr match)
  const isGroup1OrNH4 = /NH4|Li(?![a-z])|Na(?![a-z])|K(?![a-z])|Rb(?![a-z])|Cs(?![a-z])/.test(norm);
  if (isGroup1OrNH4) {
    return {
      result: 'Soluble (aq)',
      rationale: 'All salts of Group 1 alkali metals (Li⁺, Na⁺, K⁺, etc.) and ammonium (NH₄⁺) are soluble.'
    };
  }

  // 5. Halides (Cl⁻, Br⁻, I⁻)
  const isHalide = /Cl(?![a-z0-9]*O)|Br(?![a-z0-9]*O)|I(?![a-z0-9]*O)/.test(norm) && !/ClO/i.test(norm);
  if (isHalide) {
    if (/Ag(?![a-z])/.test(norm)) {
      return {
        result: 'Insoluble (s)',
        rationale: 'Silver halides (AgCl, AgBr, AgI) are insoluble precipitates (AgCl is white, AgBr cream, AgI yellow).'
      };
    }
    if (/Pb(?![a-z])/.test(norm)) {
      return {
        result: 'Insoluble (s)',
        rationale: 'Lead(II) halides (PbCl₂, PbBr₂, PbI₂) are insoluble in cold water (PbI₂ forms bright yellow precipitate).'
      };
    }
    if (/Hg(?![a-z])/.test(norm)) {
      return {
        result: 'Insoluble (s)',
        rationale: 'Mercury(I) halides (e.g. Hg₂Cl₂) are insoluble precipitates.'
      };
    }
    return {
      result: 'Soluble (aq)',
      rationale: 'Most chlorides, bromides, and iodides are soluble, except with Ag⁺, Pb²⁺, and Hg₂²⁺.'
    };
  }

  // 6. Sulfates (SO4²⁻)
  if (/SO4/i.test(norm)) {
    if (/Ba(?![a-z])/.test(norm)) {
      return {
        result: 'Insoluble (s)',
        rationale: 'Barium sulfate (BaSO₄) is a dense white insoluble precipitate (standard qualitative test for sulfate).'
      };
    }
    if (/Pb(?![a-z])/.test(norm)) {
      return {
        result: 'Insoluble (s)',
        rationale: 'Lead(II) sulfate (PbSO₄) is an insoluble white precipitate.'
      };
    }
    if (/Ca(?![a-z])|Sr(?![a-z])/.test(norm)) {
      return {
        result: 'Slightly soluble (s/aq)',
        rationale: 'Calcium and strontium sulfates are sparingly / slightly soluble in water.'
      };
    }
    return {
      result: 'Soluble (aq)',
      rationale: 'Most sulfates are soluble, with key exceptions being Ba²⁺, Pb²⁺, and sparingly soluble Ca²⁺/Sr²⁺.'
    };
  }

  // 7. Carbonates (CO3²⁻) & Phosphates (PO4³⁻)
  if (/CO3|PO4/i.test(norm)) {
    return {
      result: 'Insoluble (s)',
      rationale: 'Most carbonates and phosphates (e.g. CaCO₃, BaCO₃, CuCO₃) are insoluble precipitates (except Group 1 & NH₄⁺).'
    };
  }

  // 8. Hydroxides (OH⁻)
  if (/OH/i.test(norm)) {
    if (/Ba(?![a-z])/.test(norm)) {
      return {
        result: 'Soluble (aq)',
        rationale: 'Barium hydroxide Ba(OH)₂ is a soluble strong base.'
      };
    }
    if (/Ca(?![a-z])|Sr(?![a-z])/.test(norm)) {
      return {
        result: 'Slightly soluble (s/aq)',
        rationale: 'Calcium hydroxide Ca(OH)₂ is slightly soluble (saturated solution is limewater).'
      };
    }
    return {
      result: 'Insoluble (s)',
      rationale: 'Most metal hydroxides (e.g. Fe(OH)₃, Fe(OH)₂, Cu(OH)₂, Al(OH)₃, Mg(OH)₂) are insoluble precipitates.'
    };
  }

  // 9. Sulfides (S²⁻)
  if (/S(?![a-z0-9]*O)/.test(norm) && !/SO/i.test(norm)) {
    return {
      result: 'Insoluble (s)',
      rationale: 'Most transition metal sulfides (e.g. CuS, FeS, PbS, Ag₂S) are insoluble precipitates.'
    };
  }

  return { result: 'See table', rationale: 'Look up the cation + anion pair in the table below.' };
}

export function renderSolubilityTool(bodyEl) {
  bodyEl.innerHTML = `
    <div class="tool-modal-header">
      <span class="tool-num-badge">3</span>
      <h2>Solubility Reference</h2>
    </div>
    <p style="color:var(--text-secondary);font-size:14px;line-height:1.6;">
      High-school solubility rules: classify common ionic compounds by whether they dissolve in water.
      Memorize the rules in the first column — they apply to virtually every problem you'll see.
    </p>

    <h3 style="margin-top:18px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-tertiary);">Anion rules</h3>
    <table class="coeffs-table">
      <thead><tr><th>Anion</th><th>Name</th><th>Solubility</th><th>Example</th></tr></thead>
      <tbody>
        ${ANION_TABLE.map(a => `
          <tr>
            <td><b>${a.anion}</b></td>
            <td>${a.name}</td>
            <td>${a.soluble}</td>
            <td>${a.example}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h3 style="margin-top:24px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-tertiary);">Cation notes</h3>
    <table class="coeffs-table">
      <thead><tr><th>Cation</th><th>Note</th></tr></thead>
      <tbody>
        ${CATION_NOTES.map(c => `
          <tr><td><b>${c.cation}</b></td><td>${c.note}</td></tr>
        `).join('')}
      </tbody>
    </table>

    <h3 style="margin-top:24px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-tertiary);">Quick check</h3>
    <div class="tool-row">
      <label for="sol-input">Enter a compound formula:</label>
      <input id="sol-input" class="tool-input" type="text" value="AgCl" placeholder="e.g. PbSO4, Na2CO3">
    </div>
    <button class="btn-primary" id="sol-check">Check</button>
    <div id="sol-output" class="tool-output"></div>
  `;
  const input = bodyEl.querySelector('#sol-input');
  const out = bodyEl.querySelector('#sol-output');
  bodyEl.querySelector('#sol-check').addEventListener('click', () => {
    const { result, rationale } = lookupSolubility(input.value);
    out.className = 'tool-output';
    out.innerHTML = `<b>${result}</b><br>${rationale}`;
  });
}