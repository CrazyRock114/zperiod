// ====================================================================
// main.js — application entry point
// ====================================================================

import './css-import.js'; // injected by CSS loader (no-op placeholder)
import { loadElements } from './data.js';
import { renderPeriodicTable } from './modules/periodicTable.js';
import { openElement, initElementModal } from './modules/elementModal.js';
import { initTheme } from './modules/theme.js';
import { initWelcome } from './modules/welcome.js';
import { initNavigation } from './modules/navigation.js';
import { initToolLauncher } from './modules/toolLauncher.js';
import { initWorksheet } from './modules/worksheet.js';

// Bootstrap
async function bootstrap() {
  try {
    const elements = await loadElements();
    // Render periodic table
    const tableEl = document.getElementById('periodic-table');
    renderPeriodicTable(tableEl, elements, (id) => openElement(id));

    // Initialize UI controllers
    initTheme();
    initWelcome();
    initNavigation();
    initElementModal();
    initToolLauncher();
    initWorksheet();
  } catch (e) {
    console.error('Bootstrap failed:', e);
    document.getElementById('main-container').innerHTML =
      `<div style="padding:40px;text-align:center;color:var(--text-secondary);">
        <h2>Failed to load</h2>
        <p>${e.message}</p>
      </div>`;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}