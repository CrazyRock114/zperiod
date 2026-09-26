// ====================================================================
// toolLauncher.js — open chemistry tools in a shared modal
// ====================================================================

import { renderBalancerTool } from './equationBalancer.js';
import { renderMolarMassTool } from './molarMass.js';
import { renderSolubilityTool } from './solubility.js';
import { renderVirtualLabTool } from './virtualLab.js';

let _modalEl, _bodyEl, _closeBtn;

const RENDERERS = {
  'balancer': renderBalancerTool,
  'molar-mass': renderMolarMassTool,
  'solubility': renderSolubilityTool,
  'virtual-lab': renderVirtualLabTool
};

const TITLES = {
  'balancer': 'Equation Balancer',
  'molar-mass': 'Molar Mass Calculator',
  'solubility': 'Solubility Reference',
  'virtual-lab': 'Virtual Lab'
};

export function initToolLauncher() {
  _modalEl = document.getElementById('tool-modal');
  _bodyEl = document.getElementById('tool-modal-body');
  _closeBtn = document.getElementById('tool-modal-close');

  _closeBtn.addEventListener('click', close);
  _modalEl.addEventListener('click', (e) => {
    if (e.target === _modalEl) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && _modalEl.classList.contains('active')) close();
  });

  // Hook all .chem-tool-card buttons
  document.querySelectorAll('.chem-tool-card[data-tool]').forEach(card => {
    card.addEventListener('click', () => openTool(card.dataset.tool));
  });
}

export function openTool(toolId) {
  if (!_modalEl) return;
  const renderer = RENDERERS[toolId];
  if (!renderer) {
    console.warn('Unknown tool:', toolId);
    return;
  }
  _bodyEl.innerHTML = '';
  renderer(_bodyEl);
  _modalEl.classList.add('active');
  _modalEl.setAttribute('aria-hidden', 'false');
}

export function close() {
  if (!_modalEl) return;
  _modalEl.classList.remove('active');
  _modalEl.setAttribute('aria-hidden', 'true');
  _bodyEl.innerHTML = '';
}