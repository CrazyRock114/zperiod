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
  { cation: 'Group 1 (Li⁺, Na⁺, K⁺, Rb⁺, Cs⁺)', note: 'Always soluble' },
  { cation: 'NH₄⁺', note: 'Always soluble' },
  { cation: 'NO₃⁻', note: 'Always soluble' },
  { cation: 'CH₃COO⁻', note: 'Always soluble' },
  { cation: 'Ag⁺', note: 'Forms insoluble Cl, Br, I, S, CO₃' },
  { cation: 'Pb²⁺', note: 'Forms insoluble Cl, Br, I, SO₄, S, CO₃' },
  { cation: 'Ba²⁺', note: 'Forms insoluble SO₄ (BaSO₄ used in gravimetric analysis)' }
];

// Look up solubility for a compound by parsing its cation + anion (heuristic).
export function lookupSolubility(formula) {
  const norm = formula.trim();
  // Known decompositions: alkali + O²⁻, hydrides, etc.
  // Heuristic: if any of the always-soluble anions, mark soluble.
  for (const anion of ALWAYS_SOLUBLE) {
    if (norm.includes(anion.replace(/[⁻⁺]/g, ''))) {
      return { result: 'Soluble', rationale: `Contains always-soluble ion ${anion}` };
    }
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