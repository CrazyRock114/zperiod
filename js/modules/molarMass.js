// ====================================================================
// molarMass.js — molar mass calculator
// ====================================================================

import { parseCompound } from './equationBalancer.js';
import { getBySymbol, getAllElements } from '../data.js';

export function calculateMolarMass(formula) {
  const counts = parseCompound(formula);
  let total = 0;
  const breakdown = [];
  for (const [sym, n] of Object.entries(counts)) {
    const el = getBySymbol(sym);
    if (!el) throw new Error(`Unknown element: ${sym}`);
    const mass = parseFloat(el.level2_atomic?.mass?.highSchool);
    if (!Number.isFinite(mass)) throw new Error(`No atomic mass for ${sym}`);
    breakdown.push({ symbol: sym, count: n, atomicMass: mass, subtotal: n * mass });
    total += n * mass;
  }
  return { total, breakdown };
}

export function renderMolarMassTool(bodyEl) {
  bodyEl.innerHTML = `
    <div class="tool-modal-header">
      <span class="tool-num-badge">2</span>
      <h2>Molar Mass Calculator</h2>
    </div>
    <div class="tool-row">
      <label for="mm-input">Enter a chemical formula:</label>
      <input id="mm-input" class="tool-input" type="text" value="H2SO4" placeholder="e.g. Ca(OH)2">
    </div>
    <div class="tool-actions">
      <button class="btn-primary" id="mm-calc">Calculate</button>
      <button class="btn-secondary" id="mm-example">Try example</button>
    </div>
    <div id="mm-output" class="tool-output">Enter a chemical formula above and click <b>Calculate</b>.</div>
  `;
  const input = bodyEl.querySelector('#mm-input');
  const out = bodyEl.querySelector('#mm-output');
  bodyEl.querySelector('#mm-calc').addEventListener('click', () => {
    try {
      const r = calculateMolarMass(input.value);
      out.className = 'tool-output success';
      out.innerHTML = `<div class="formula-preview">${input.value} = ${r.total.toFixed(4)} g/mol</div>
        <table class="coeffs-table">
          <thead><tr><th>Element</th><th>Count</th><th>Atomic mass</th><th>Subtotal</th></tr></thead>
          <tbody>${r.breakdown.map(b => `
            <tr>
              <td><b>${b.symbol}</b></td>
              <td>${b.count}</td>
              <td>${b.atomicMass}</td>
              <td>${b.subtotal.toFixed(4)}</td>
            </tr>
          `).join('')}
          <tr><td colspan="3"><b>Total</b></td><td><b>${r.total.toFixed(4)}</b></td></tr>
          </tbody>
        </table>`;
    } catch (e) {
      out.className = 'tool-output error';
      out.textContent = `⚠ ${e.message}`;
    }
  });
  bodyEl.querySelector('#mm-example').addEventListener('click', () => {
    const all = getAllElements();
    const examples = [
      'H2O', 'CO2', 'NaCl', 'C6H12O6', 'Ca(OH)2', 'Fe2(SO4)3',
      'C8H10N4O2', 'Al2(SO4)3', 'K3[Fe(CN)6]', 'CH3COOH'
    ];
    input.value = examples[Math.floor(Math.random() * examples.length)];
  });
}