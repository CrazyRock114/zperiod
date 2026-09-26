// ====================================================================
// periodicTable.js — render the 118-element grid
// ====================================================================

import { buildLayout, categoryClass, CATEGORIES } from '../data.js';

let _rendered = false;

export function renderPeriodicTable(container, elements, onElementClick) {
  if (_rendered) return; // idempotent
  const layout = buildLayout();
  const { grid, lanthanideIndicator, actinideIndicator } = layout;

  const frag = document.createDocumentFragment();

  // Render real elements
  for (const [pos, id] of grid.entries()) {
    const [row, col] = pos.split(',').map(Number);
    const el = elements[id];
    if (!el) continue;
    const node = createElementNode(el, row, col);
    frag.appendChild(node);
  }

  // Lanthanide indicator placeholder
  const lan = createSeriesIndicator(lanthanideIndicator, 'La-Lu', 'lanthanide', onElementClick);
  frag.appendChild(lan);

  // Actinide indicator placeholder
  const act = createSeriesIndicator(actinideIndicator, 'Ac-Lr', 'actinide', onElementClick);
  frag.appendChild(act);

  container.appendChild(frag);

  // Render legend
  const legendItems = container.parentElement.querySelector('.legend-items');
  if (legendItems && !legendItems.children.length) {
    for (const c of CATEGORIES) {
      const item = document.createElement('span');
      item.className = 'legend-item';
      const swatch = document.createElement('span');
      swatch.className = 'legend-swatch';
      swatch.style.borderLeftWidth = '3px';
      swatch.style.borderLeftStyle = 'solid';
      swatch.style.borderLeftColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--accent'); // default; will set inline per-cat below
      // Use a marker color for the swatch — extract from CSS gradient
      const catClass = categoryClass(c.type);
      const tmp = document.createElement('div');
      tmp.className = `element ${catClass}`;
      tmp.style.position = 'absolute';
      tmp.style.visibility = 'hidden';
      document.body.appendChild(tmp);
      const cs = getComputedStyle(tmp);
      const borderColor = cs.borderLeftColor;
      document.body.removeChild(tmp);
      swatch.style.background = borderColor;
      item.appendChild(swatch);
      const label = document.createElement('span');
      label.textContent = c.label;
      item.appendChild(label);
      legendItems.appendChild(item);
    }
  }

  _rendered = true;
}

function createElementNode(el, row, col) {
  const node = document.createElement('button');
  node.className = `element ${categoryClass(el.level1_basic?.type)}`;
  node.style.gridRow = row;
  node.style.gridColumn = col;
  node.dataset.elementId = el.id;
  node.dataset.symbol = el.symbol;
  node.dataset.pos = `${row},${col}`;
  node.setAttribute('aria-label', `${el.name} (${el.symbol}, atomic number ${el.id})`);

  const num = document.createElement('span');
  num.className = 'atomic-num';
  num.textContent = el.id;
  node.appendChild(num);

  const sym = document.createElement('span');
  sym.className = 'symbol';
  sym.textContent = el.symbol;
  node.appendChild(sym);

  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = el.name;
  node.appendChild(name);

  const mass = document.createElement('span');
  mass.className = 'mass';
  mass.textContent = el.level2_atomic?.mass?.highSchool || '';
  node.appendChild(mass);

  return node;
}

function createSeriesIndicator(indicator, label, series, onElementClick) {
  const node = document.createElement('button');
  node.className = `element cat-${series}`;
  node.style.gridRow = indicator.row;
  node.style.gridColumn = indicator.col;
  node.style.fontSize = '0.7em';
  node.style.padding = '4px';
  node.style.lineHeight = '1.1';
  node.style.cursor = 'pointer';
  node.dataset.series = series;
  node.title = `Click to focus ${series} series (elements ${indicator.fromIds[0]}–${indicator.toIds[0]})`;
  node.setAttribute('aria-label', `${series} indicator: ${label}`);

  const sym = document.createElement('span');
  sym.className = 'symbol';
  sym.style.fontSize = '1.1em';
  sym.textContent = label;
  node.appendChild(sym);

  // Click: scroll/highlight first element of series in grid (or open first element)
  node.addEventListener('click', () => {
    if (typeof onElementClick === 'function') onElementClick(indicator.fromIds[0]);
  });

  return node;
}

export function clearPeriodicTable(container) {
  container.innerHTML = '';
  _rendered = false;
}