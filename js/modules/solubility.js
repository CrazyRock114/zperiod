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
    return {
      result: 'Invalid',
      rationale: 'Please enter a valid chemical formula.',
      isPrecipitate: false,
      precipitateColor: null,
      hexColor: null
    };
  }
  const norm = formula.trim().replace(/\s+/g, '');

  // 1. Noble gases check (prevent 'Kr' false matching 'K')
  const nobleGases = ['He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn'];
  if (nobleGases.includes(norm)) {
    return {
      result: 'Non-ionic',
      rationale: `${norm} is a noble gas element, not an ionic compound.`,
      isPrecipitate: false,
      precipitateColor: null,
      hexColor: null
    };
  }

  // 2. Common molecular non-electrolytes
  if (['H2O', 'CO2', 'CO', 'CH4', 'O2', 'N2', 'H2'].includes(norm)) {
    return {
      result: 'Molecular',
      rationale: `${norm} is a covalent molecule, not an ionic salt.`,
      isPrecipitate: false,
      precipitateColor: null,
      hexColor: null
    };
  }

  // 3. Always soluble anions: Nitrate (NO3), Acetate (CH3COO, C2H3O2), Chlorate/Perchlorate
  const isAlwaysSolubleAnion = /NO3|CH3COO|C2H3O2|ClO3|ClO4/i.test(norm);
  if (isAlwaysSolubleAnion) {
    return {
      result: 'Soluble (aq)',
      rationale: 'All common nitrates, acetates, and chlorates are soluble in water.',
      isPrecipitate: false,
      precipitateColor: null,
      hexColor: null
    };
  }

  // 4. Always soluble cations: Group 1 (Li, Na, K, Rb, Cs) & Ammonium (NH4)
  // Ensure element boundaries (e.g. K not followed by lowercase letter, preventing Kr match)
  const isGroup1OrNH4 = /NH4|Li(?![a-z])|Na(?![a-z])|K(?![a-z])|Rb(?![a-z])|Cs(?![a-z])/.test(norm);
  if (isGroup1OrNH4) {
    return {
      result: 'Soluble (aq)',
      rationale: 'All salts of Group 1 alkali metals (Li⁺, Na⁺, K⁺, etc.) and ammonium (NH₄⁺) are soluble.',
      isPrecipitate: false,
      precipitateColor: null,
      hexColor: null
    };
  }

  // 5. Halides (Cl⁻, Br⁻, I⁻)
  const isHalide = /Cl(?![a-z0-9]*O)|Br(?![a-z0-9]*O)|I(?![a-z0-9]*O)/.test(norm) && !/ClO/i.test(norm);
  if (isHalide) {
    if (/Ag(?![a-z])/.test(norm)) {
      const isBr = /Br/.test(norm);
      const isI = /I(?![a-z])/.test(norm);
      const colorDesc = isI ? 'Yellow precipitate' : isBr ? 'Cream precipitate' : 'White precipitate';
      const hex = isI ? '#facc15' : isBr ? '#fef08a' : '#f8fafc';
      return {
        result: 'Insoluble (s)',
        rationale: `Silver halide (${norm}) is an insoluble precipitate. In qualitative analysis: AgCl is white, AgBr is cream, AgI is yellow.`,
        isPrecipitate: true,
        precipitateColor: colorDesc,
        hexColor: hex
      };
    }
    if (/Pb(?![a-z])/.test(norm)) {
      const isI = /I(?![a-z])/.test(norm);
      const colorDesc = isI ? 'Bright Golden-Yellow precipitate' : 'White precipitate (sparingly soluble)';
      const hex = isI ? '#facc15' : '#f8fafc';
      return {
        result: 'Insoluble (s)',
        rationale: `Lead(II) halide (${norm}) is insoluble in cold water (${isI ? 'PbI₂ forms bright golden-yellow spangles' : 'PbCl₂ dissolves in hot water'}).`,
        isPrecipitate: true,
        precipitateColor: colorDesc,
        hexColor: hex
      };
    }
    if (/Hg2(?![a-z0-9])/.test(norm)) {
      return {
        result: 'Insoluble (s)',
        rationale: 'Mercury(I) halides (e.g. Hg₂Cl₂) are insoluble precipitates.',
        isPrecipitate: true,
        precipitateColor: 'White precipitate',
        hexColor: '#f8fafc'
      };
    }
    return {
      result: 'Soluble (aq)',
      rationale: 'Most chlorides, bromides, and iodides are soluble, except with Ag⁺, Pb²⁺, and Hg₂²⁺.',
      isPrecipitate: false,
      precipitateColor: null,
      hexColor: null
    };
  }

  // 6. Sulfates (SO4²⁻)
  if (/SO4/i.test(norm)) {
    if (/Ba(?![a-z])/.test(norm)) {
      return {
        result: 'Insoluble (s)',
        rationale: 'Barium sulfate (BaSO₄) is a dense white insoluble precipitate (essential qualitative test for sulfate with BaCl₂/Ba(NO₃)₂ and dilute acid).',
        isPrecipitate: true,
        precipitateColor: 'Dense White precipitate',
        hexColor: '#f8fafc'
      };
    }
    if (/Pb(?![a-z])/.test(norm)) {
      return {
        result: 'Insoluble (s)',
        rationale: 'Lead(II) sulfate (PbSO₄) is an insoluble white precipitate.',
        isPrecipitate: true,
        precipitateColor: 'White precipitate',
        hexColor: '#f8fafc'
      };
    }
    if (/Ca(?![a-z])|Sr(?![a-z])/.test(norm)) {
      return {
        result: 'Slightly soluble (s/aq)',
        rationale: 'Calcium and strontium sulfates are sparingly / slightly soluble in water.',
        isPrecipitate: true,
        precipitateColor: 'White (sparingly soluble)',
        hexColor: '#f8fafc'
      };
    }
    return {
      result: 'Soluble (aq)',
      rationale: 'Most sulfates are soluble, with key exceptions being Ba²⁺, Pb²⁺, and sparingly soluble Ca²⁺/Sr²⁺.',
      isPrecipitate: false,
      precipitateColor: null,
      hexColor: null
    };
  }

  // 7. Carbonates (CO3²⁻) & Phosphates (PO4³⁻)
  if (/CO3|PO4/i.test(norm)) {
    const isCu = /Cu(?![a-z])/.test(norm);
    const colorDesc = isCu ? 'Green precipitate' : 'White precipitate (limestone/chalk)';
    const hex = isCu ? '#22c55e' : '#f8fafc';
    return {
      result: 'Insoluble (s)',
      rationale: 'Most carbonates and phosphates (e.g. CaCO₃, BaCO₃, CuCO₃) are insoluble precipitates (except Group 1 & NH₄⁺). CaCO₃ reacts with acid to release CO₂.',
      isPrecipitate: true,
      precipitateColor: colorDesc,
      hexColor: hex
    };
  }

  // Organic compounds with -OH (alcohols and carboxylic acids) are miscible/soluble, not metal hydroxide precipitates
  if (/^(?:CH3OH|C2H5OH|C\d+H\d+OH|HCOOH|CH3COOH|CH3CH2OH)$/i.test(norm)) {
    return {
      result: 'Soluble (miscible)',
      rationale: `${norm} is an organic compound (alcohol / carboxylic acid) miscible with water, not an insoluble metal hydroxide precipitate.`,
      isPrecipitate: false,
      precipitateColor: null,
      hexColor: null
    };
  }

  // 8. Hydroxides (OH⁻)
  if (/(?:\(OH\)|[A-Z][a-z]?OH)/.test(norm) && !/^(?:CH3OH|C2H5OH|C\d+H\d+OH|HCOOH|CH3COOH)$/i.test(norm)) {
    if (/Ba(?![a-z])/.test(norm)) {
      return {
        result: 'Soluble (aq)',
        rationale: 'Barium hydroxide Ba(OH)₂ is a soluble strong base.',
        isPrecipitate: false,
        precipitateColor: null,
        hexColor: null
      };
    }
    if (/Ca(?![a-z])|Sr(?![a-z])/.test(norm)) {
      return {
        result: 'Slightly soluble (s/aq)',
        rationale: 'Calcium hydroxide Ca(OH)₂ is slightly soluble in water (the filtered saturated solution is limewater, used to test CO₂).',
        isPrecipitate: true,
        precipitateColor: 'White (sparingly soluble / limewater)',
        hexColor: '#f8fafc'
      };
    }
    const isFe3 = /Fe/i.test(norm) && /3/.test(norm);
    const isFe2 = /Fe/i.test(norm) && !/3/.test(norm);
    const isCu = /Cu(?![a-z])/.test(norm);
    const colorDesc = isFe3
      ? 'Red-brown precipitate'
      : isFe2
      ? 'Dirty green precipitate'
      : isCu
      ? 'Light blue precipitate'
      : 'White precipitate';
    const hex = isFe3 ? '#b45309' : isFe2 ? '#15803d' : isCu ? '#38bdf8' : '#f8fafc';
    return {
      result: 'Insoluble (s)',
      rationale: 'Most metal hydroxides (e.g. Fe(OH)₃, Fe(OH)₂, Cu(OH)₂, Al(OH)₃, Mg(OH)₂) are insoluble precipitates.',
      isPrecipitate: true,
      precipitateColor: colorDesc,
      hexColor: hex
    };
  }

  // 9. Sulfides (S²⁻)
  if (/S(?![a-z])(?![0-9]*O)/.test(norm) && !/SO/i.test(norm)) {
    return {
      result: 'Insoluble (s)',
      rationale: 'Most transition metal sulfides (e.g. CuS, FeS, PbS, Ag₂S) are insoluble black precipitates.',
      isPrecipitate: true,
      precipitateColor: 'Black precipitate',
      hexColor: '#1e293b'
    };
  }

  return {
    result: 'See table',
    rationale: 'Look up the cation + anion pair in the table below.',
    isPrecipitate: false,
    precipitateColor: null,
    hexColor: null
  };
}

export function renderSolubilityTool(bodyEl) {
  bodyEl.innerHTML = `
    <div class="tool-modal-header">
      <span class="tool-num-badge">3</span>
      <h2>Solubility Reference</h2>
    </div>
    <p style="color:var(--text-secondary);font-size:14px;line-height:1.6;">
      High-school solubility rules: classify common ionic compounds by whether they dissolve in water.
      Essential for Cambridge 0620 Paper 5/6 qualitative analysis and precipitation reactions.
    </p>

    <!-- Sky G8 Focus Compounds Fast Quick-Check Pills -->
    <div class="g8-sol-presets" style="margin: 16px 0; padding: 12px 14px; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 8px;">
      <div style="font-size: 12px; font-weight: 700; color: #3b82f6; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
        <span>⚡ Sky G8 Unit 2: Key Precipitates & Solubility Quick Check</span>
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 6px;">
        <button type="button" class="btn-sol-pill" data-compound="BaSO4" style="font-size: 11px; padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06); color: inherit; cursor: pointer;">
          ⚪ BaSO₄ (White ppt)
        </button>
        <button type="button" class="btn-sol-pill" data-compound="CaCO3" style="font-size: 11px; padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06); color: inherit; cursor: pointer;">
          ⚪ CaCO₃ (White ppt)
        </button>
        <button type="button" class="btn-sol-pill" data-compound="AgCl" style="font-size: 11px; padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06); color: inherit; cursor: pointer;">
          ⚪ AgCl (White ppt)
        </button>
        <button type="button" class="btn-sol-pill" data-compound="PbI2" style="font-size: 11px; padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06); color: inherit; cursor: pointer;">
          🟡 PbI₂ (Yellow ppt)
        </button>
        <button type="button" class="btn-sol-pill" data-compound="Cu(OH)2" style="font-size: 11px; padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06); color: inherit; cursor: pointer;">
          🔵 Cu(OH)₂ (Blue ppt)
        </button>
        <button type="button" class="btn-sol-pill" data-compound="Fe(OH)3" style="font-size: 11px; padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06); color: inherit; cursor: pointer;">
          🟤 Fe(OH)₃ (Red-brown ppt)
        </button>
        <button type="button" class="btn-sol-pill" data-compound="NaCl" style="font-size: 11px; padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06); color: inherit; cursor: pointer;">
          💧 NaCl (Soluble)
        </button>
      </div>
    </div>

    <div class="tool-row">
      <label for="sol-input">Enter a compound formula (instant lookup):</label>
      <input id="sol-input" class="tool-input" type="text" value="AgCl" placeholder="e.g. BaSO4, CaCO3, AgCl, PbI2">
    </div>
    <div class="tool-actions">
      <button class="btn-primary" id="sol-check">Check Solubility</button>
    </div>
    <div id="sol-output" class="tool-output"></div>

    <h3 style="margin-top:24px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-tertiary);">Anion rules</h3>
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
  `;

  const input = bodyEl.querySelector('#sol-input');
  const out = bodyEl.querySelector('#sol-output');
  const checkBtn = bodyEl.querySelector('#sol-check');

  function update() {
    const val = input.value.trim();
    if (!val) {
      out.className = 'tool-output';
      out.innerHTML = 'Enter a compound formula above to check solubility.';
      return;
    }
    const info = lookupSolubility(val);
    const isSoluble = info.result.startsWith('Soluble');
    const isInsoluble = info.result.startsWith('Insoluble');

    out.className = `tool-output ${isSoluble ? 'success' : isInsoluble ? 'error' : ''}`;
    let colorBadge = '';
    if (info.precipitateColor) {
      colorBadge = `
        <div style="margin-top:6px; display:inline-flex; align-items:center; gap:8px; padding:3px 10px; border-radius:6px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15);">
          <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${info.hexColor || '#fff'}; border:1px solid rgba(0,0,0,0.3); box-shadow:0 0 4px ${info.hexColor || '#fff'}"></span>
          <span style="font-size:12px; font-weight:700; color:var(--text-primary);">Precipitate Color: ${info.precipitateColor}</span>
        </div>
      `;
    }
    out.innerHTML = `
      <div style="font-size:15px; font-weight:bold; margin-bottom:4px;">${info.result}</div>
      ${colorBadge}
      <div style="margin-top:6px; font-size:13px; line-height:1.5; color:var(--text-secondary);">${info.rationale}</div>
    `;
  }

  // Real-time instant check on typing
  input.addEventListener('input', update);
  checkBtn.addEventListener('click', update);

  // Quick pills click
  bodyEl.querySelectorAll('.btn-sol-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = btn.getAttribute('data-compound');
      update();
    });
  });

  // Initial trigger
  update();
}