// ====================================================================
// worksheetGenerator.js — generate balanced equation practice problems
// ====================================================================
// Picks reactants from a curated pool of common reactions, hides the
// stoichiometric coefficients, and asks the user to fill them in.
// Supports multiple reaction types and three difficulty levels.
// ====================================================================

import { balanceEquation } from './equationBalancer.js';
import { formatBalanced } from './equationBalancer.js';

// Reactions are stored with reactant + product *formulas*. They are
// auto-balanced at generation time so we don't have to maintain
// pre-balanced coefficients.
const REACTION_POOL = {
  synthesis: [
    { reactants: ['H2', 'O2'], products: ['H2O'], difficulty: 1 },
    { reactants: ['Mg', 'O2'], products: ['MgO'], difficulty: 1 },
    { reactants: ['Na', 'Cl2'], products: ['NaCl'], difficulty: 1 },
    { reactants: ['N2', 'H2'], products: ['NH3'], difficulty: 2 },
    { reactants: ['Al', 'O2'], products: ['Al2O3'], difficulty: 1 },
    { reactants: ['C', 'O2'], products: ['CO2'], difficulty: 1 },
    { reactants: ['Fe', 'S'], products: ['FeS'], difficulty: 1 },
    { reactants: ['CaO', 'H2O'], products: ['Ca(OH)2'], difficulty: 1 },
    { reactants: ['SO3', 'H2O'], products: ['H2SO4'], difficulty: 2 },
    { reactants: ['P2O5', 'H2O'], products: ['H3PO4'], difficulty: 2 }
  ],
  decomposition: [
    { reactants: ['H2O'], products: ['H2', 'O2'], difficulty: 1 },
    { reactants: ['HgO'], products: ['Hg', 'O2'], difficulty: 1 },
    { reactants: ['KClO3'], products: ['KCl', 'O2'], difficulty: 2 },
    { reactants: ['NaCl'], products: ['Na', 'Cl2'], difficulty: 1 },
    { reactants: ['CaCO3'], products: ['CaO', 'CO2'], difficulty: 1 },
    { reactants: ['H2CO3'], products: ['H2O', 'CO2'], difficulty: 2 },
    { reactants: ['NaHCO3'], products: ['Na2CO3', 'H2O', 'CO2'], difficulty: 2 },
    { reactants: ['NH4NO3'], products: ['N2O', 'H2O'], difficulty: 3 },
    { reactants: ['Pb(NO3)2'], products: ['PbO', 'NO2', 'O2'], difficulty: 3 }
  ],
  'single-replacement': [
    { reactants: ['Zn', 'HCl'], products: ['ZnCl2', 'H2'], difficulty: 1 },
    { reactants: ['Mg', 'HCl'], products: ['MgCl2', 'H2'], difficulty: 1 },
    { reactants: ['Fe', 'CuSO4'], products: ['FeSO4', 'Cu'], difficulty: 2 },
    { reactants: ['Al', 'CuCl2'], products: ['AlCl3', 'Cu'], difficulty: 2 },
    { reactants: ['Cl2', 'NaBr'], products: ['NaCl', 'Br2'], difficulty: 2 },
    { reactants: ['Br2', 'NaI'], products: ['NaBr', 'I2'], difficulty: 2 }
  ],
  'double-replacement': [
    { reactants: ['NaCl', 'AgNO3'], products: ['AgCl', 'NaNO3'], difficulty: 1 },
    { reactants: ['NaOH', 'HCl'], products: ['NaCl', 'H2O'], difficulty: 1 },
    { reactants: ['BaCl2', 'Na2SO4'], products: ['BaSO4', 'NaCl'], difficulty: 2 },
    { reactants: ['Pb(NO3)2', 'NaI'], products: ['PbI2', 'NaNO3'], difficulty: 2 },
    { reactants: ['CaCO3', 'HCl'], products: ['CaCl2', 'H2O', 'CO2'], difficulty: 2 },
    { reactants: ['Na2S', 'HCl'], products: ['NaCl', 'H2S'], difficulty: 2 }
  ],
  combustion: [
    { reactants: ['CH4', 'O2'], products: ['CO2', 'H2O'], difficulty: 1 },
    { reactants: ['C2H6', 'O2'], products: ['CO2', 'H2O'], difficulty: 2 },
    { reactants: ['C3H8', 'O2'], products: ['CO2', 'H2O'], difficulty: 2 },
    { reactants: ['C4H10', 'O2'], products: ['CO2', 'H2O'], difficulty: 2 },
    { reactants: ['C2H4', 'O2'], products: ['CO2', 'H2O'], difficulty: 3 },
    { reactants: ['C6H12O6', 'O2'], products: ['CO2', 'H2O'], difficulty: 3 },
    { reactants: ['C8H18', 'O2'], products: ['CO2', 'H2O'], difficulty: 3 }
  ]
};

const TYPE_LABELS = {
  synthesis: 'Synthesis',
  decomposition: 'Decomposition',
  'single-replacement': 'Single Replacement',
  'double-replacement': 'Double Replacement',
  combustion: 'Combustion'
};

function pickReaction(types, difficulty) {
  const pool = [];
  for (const t of types) {
    for (const r of (REACTION_POOL[t] || [])) {
      if (r.difficulty <= difficulty) pool.push({ type: t, ...r });
    }
  }
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// For 'identify' mode, distractors come from all reaction types except
// the correct one.
function identifyDistractors(correctType) {
  return Object.keys(TYPE_LABELS).filter(t => t !== correctType);
}

export function generateWorksheet({ type, count, difficulty, enabledTypes }) {
  const questions = [];
  for (let i = 0; i < count; i++) {
    const picked = pickReaction(enabledTypes, difficulty);
    if (!picked) throw new Error('No matching reactions for the selected filters');
    const balanced = balanceEquation(
      picked.reactants.join(' + ') + ' -> ' + picked.products.join(' + ')
    );
    const answerStr = formatBalanced(balanced);

    let q = { balanced, answerStr };
    if (type === 'balance') {
      q.equation = formatBalanced({
        reactants: picked.reactants.map(c => ({ compound: c, coefficient: 1 })),
        products: picked.products.map(c => ({ compound: c, coefficient: 1 }))
      });
      q.prompt = 'Balance this equation:';
      q.mode = 'balance';
    } else if (type === 'identify') {
      q.equation = answerStr;
      q.prompt = 'What type of reaction is this?';
      q.mode = 'identify';
      q.choices = shuffle([
        TYPE_LABELS[picked.type],
        ...identifyDistractors(picked.type).slice(0, 3).map(t => TYPE_LABELS[t])
      ]);
      q.answer = TYPE_LABELS[picked.type];
    } else {
      // combined — both: balance and identify
      q.equation = formatBalanced({
        reactants: picked.reactants.map(c => ({ compound: c, coefficient: 1 })),
        products: picked.products.map(c => ({ compound: c, coefficient: 1 }))
      });
      q.prompt = 'Balance AND identify the reaction type:';
      q.mode = 'combined';
      q.choices = shuffle([
        TYPE_LABELS[picked.type],
        ...identifyDistractors(picked.type).slice(0, 3).map(t => TYPE_LABELS[t])
      ]);
      q.answer = TYPE_LABELS[picked.type];
    }
    questions.push(q);
  }
  return questions;
}

export function renderWorksheetQuestions(container, questions) {
  container.innerHTML = questions.map((q, i) => {
    let html = `<div class="ws-question">
      <h4>Question ${i + 1} — ${q.prompt}</h4>
      <div class="equation">${q.equation}</div>`;
    if (q.choices) {
      html += `<div class="ws-choices">${q.choices.map(c => `<span class="ws-choice">${c}</span>`).join('')}</div>`;
    }
    html += `</div>`;
    return html;
  }).join('');
}

export function renderAnswerKey(container, questions) {
  container.innerHTML = `<div class="ws-answer-key">
    <h4 style="margin:0 0 8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Answer Key</h4>
    ${questions.map((q, i) => `<div><b>${i + 1}.</b> ${q.answerStr}${q.answer ? ` &nbsp;·&nbsp; ${q.answer}` : ''}</div>`).join('')}
  </div>`;
}