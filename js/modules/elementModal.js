// ====================================================================
// elementModal.js — element detail modal
// ====================================================================

import { getById } from '../data.js';

let _modalEl, _bodyEl, _closeBtn, _onClose = null;

export function initElementModal() {
  _modalEl = document.getElementById('element-modal');
  _bodyEl = document.getElementById('element-modal-body');
  _closeBtn = document.getElementById('element-modal-close');

  _closeBtn.addEventListener('click', close);
  _modalEl.addEventListener('click', (e) => {
    if (e.target === _modalEl) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && _modalEl.classList.contains('active')) close();
  });
}

export function openElement(id, onClose) {
  if (!_modalEl) initElementModal();
  const el = getById(id);
  if (!el) return;

  _onClose = onClose;
  _bodyEl.innerHTML = renderElementModal(el);
  _modalEl.classList.add('active');
  _modalEl.setAttribute('aria-hidden', 'false');
}

export function close() {
  if (!_modalEl) return;
  _modalEl.classList.remove('active');
  _modalEl.setAttribute('aria-hidden', 'true');
  if (typeof _onClose === 'function') _onClose();
  _onClose = null;
}

function renderElementModal(el) {
  const L1 = el.level1_basic || {};
  const L2 = el.level2_atomic || {};
  const L3 = el.level3_properties || {};
  const L4 = el.level4_history_stse || {};
  const physical = L3.physical || {};
  const electronic = L3.electronic || {};
  const history = L4.history || {};

  return `
    <div class="element-modal-hero">
      <div class="element-modal-left">
        <div class="element-modal-symbol">
          <span class="big-symbol">${el.symbol}</span>
          <span class="atomic-num-big">${el.id}</span>
        </div>
        <h2 class="element-modal-name">${el.name}</h2>
        <div class="element-modal-meta">
          <span class="meta-pill">${L1.type || 'Unknown'}</span>
          <span class="meta-pill">Group ${L1.group || '—'}</span>
          <span class="meta-pill">Period ${L1.period || '—'}</span>
          <span class="meta-pill">${L1.phaseAtSTP || '—'}</span>
          ${L1.valenceElectrons != null ? `<span class="meta-pill">${L1.valenceElectrons} valence e⁻</span>` : ''}
        </div>
        <div class="element-modal-3d">
          <div class="atom-placeholder">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="13"/></svg>
            <span>3D atom model — coming in v0.2 (Three.js WebGL)</span>
            <small style="opacity:0.7;">For now: ${electronic.configuration || '—'}</small>
          </div>
        </div>
      </div>
    </div>

    <div class="element-modal-body">
      ${L1.commonIons ? `<section class="level-section"><h4>Common Ions</h4><p>${escapeHtml(L1.commonIons)}</p></section>` : ''}
      ${L1.commonOxidationStates ? `<section class="level-section"><h4>Common Oxidation States</h4><p>${escapeHtml(L1.commonOxidationStates)}</p></section>` : ''}

      <section class="level-section">
        <h4>Subatomic Particles</h4>
        <div class="props-grid">
          ${prop('Protons', L2.protons)}
          ${prop('Electrons (neutral)', L2.electronsNeutral)}
          ${prop('Atomic Mass (high-school)', L2.mass?.highSchool || '—')}
        </div>
        ${L2.naturalIsotopes?.length ? `
          <h4 style="margin-top:16px;">Natural Isotopes</h4>
          <div class="isotope-list">
            ${L2.naturalIsotopes.map(iso => `
              <span class="isotope"><b>${iso.name}</b><span>${iso.neutron} · ${iso.percent}</span></span>
            `).join('')}
          </div>
        ` : ''}
      </section>

      <section class="level-section">
        <h4>Properties &amp; Structure</h4>
        <div class="props-grid">
          ${prop('Electron Configuration', electronic.configuration)}
          ${prop('Oxidation States (common)', (electronic.oxidationStates?.common || []).join(', ') || '—')}
          ${prop('Electronegativity', physical.electronegativity ?? '—')}
          ${prop('1st Ionization', physical.firstIonization || '—')}
          ${prop('Density', physical.density || '—')}
          ${prop('Melting Point', physical.meltingPoint || '—')}
          ${prop('Boiling Point', physical.boilingPoint || '—')}
          ${prop('Electron Affinity', physical.electronAffinity || '—')}
          ${prop('Atomic Radius', physical.atomicRadius || '—')}
          ${prop('Specific Heat', physical.specificHeat || '—')}
        </div>
      </section>

      ${L4.stseContext?.length ? `
        <section class="level-section">
          <h4>STSE Context</h4>
          <div class="list-section"><ul>${L4.stseContext.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>
        </section>
      ` : ''}

      <section class="level-section">
        <h4>History</h4>
        <div class="props-grid">
          ${prop('Discovered', history.discoveryYear || '—')}
          ${prop('Discovered By', history.discoveredBy || '—')}
          ${prop('Named By', history.namedBy || '—')}
        </div>
      </section>

      ${L4.commonUses?.length ? `
        <section class="level-section">
          <h4>Common Uses</h4>
          <div class="list-section"><ul>${L4.commonUses.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>
        </section>
      ` : ''}

      ${L4.hazards?.length ? `
        <section class="level-section">
          <h4>Hazards</h4>
          <div class="list-section"><ul>${L4.hazards.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>
        </section>
      ` : ''}

      ${el.chemistryNotes ? `<div class="notes-box">${escapeHtml(el.chemistryNotes)}</div>` : ''}
      ${el.biologicalRole ? `<div class="notes-box" style="margin-top:8px;">${escapeHtml(el.biologicalRole)}</div>` : ''}
    </div>
  `;
}

function prop(label, value) {
  return `<div class="prop"><span class="prop-label">${label}</span><span class="prop-value">${value ?? '—'}</span></div>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}