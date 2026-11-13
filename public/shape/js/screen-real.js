/**
 * Molecular Shapes - Screen Real Controller
 * 44 Real Chemical Molecules Library with experimental measurements,
 * filtering, search, and dipole vector visualization.
 * Zero-CJK compliant.
 */

import { REAL_MOLECULES } from "./data.js";

export class ScreenReal {
  constructor(stage) {
    this.stage = stage;
    this.selectedMolId = "h2o"; // default to water
    this.currentFilter = "all";
    this.searchQuery = "";

    this.initDOM();
  }

  initDOM() {
    // Search input
    const searchInput = document.getElementById("real-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderList();
      });
    }

    // Filter pills
    document.querySelectorAll(".real-filter-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        document.querySelectorAll(".real-filter-pill").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        this.currentFilter = pill.dataset.filter;
        this.renderList();
      });
    });

    // Checkbox toggles
    const dipoleToggle = document.getElementById("toggle-dipole-checkbox");
    if (dipoleToggle) {
      dipoleToggle.checked = false;
      dipoleToggle.addEventListener("change", (e) => {
        this.stage.setShowDipole(e.target.checked);
      });
    }

    const angleToggle = document.getElementById("toggle-real-angle-checkbox");
    if (angleToggle) {
      angleToggle.checked = true;
      angleToggle.addEventListener("change", (e) => {
        this.stage.setShowAngles(e.target.checked);
      });
    }

    this.renderList();
    this.selectMolecule("h2o");
  }

  getFilteredMolecules() {
    return REAL_MOLECULES.filter((mol) => {
      // 1. Text search
      if (this.searchQuery) {
        const matchFormula = mol.formula.toLowerCase().includes(this.searchQuery);
        const matchName = mol.name.toLowerCase().includes(this.searchQuery);
        if (!matchFormula && !matchName) return false;
      }

      // 2. Category filter
      if (this.currentFilter === "all") return true;
      if (this.currentFilter === "polar") return mol.polarity === "Polar";
      if (this.currentFilter === "nonpolar") return mol.polarity === "Non-polar";
      if (this.currentFilter === "linear") return mol.molecularGeometry === "Linear";
      if (this.currentFilter === "planar") return mol.molecularGeometry === "Trigonal Planar";
      if (this.currentFilter === "tetra") return mol.electronGeometry === "Tetrahedral";
      if (this.currentFilter === "bipyramid") return mol.electronGeometry === "Trigonal Bipyramidal";
      if (this.currentFilter === "octa") return mol.electronGeometry === "Octahedral";

      return true;
    });
  }

  renderList() {
    const listContainer = document.getElementById("real-molecules-list");
    if (!listContainer) return;

    listContainer.innerHTML = "";
    const list = this.getFilteredMolecules();

    list.forEach((mol) => {
      const card = document.createElement("div");
      card.className = `real-mol-card ${mol.id === this.selectedMolId ? "active" : ""}`;
      card.dataset.id = mol.id;

      const isPolar = mol.polarity === "Polar";
      const polarityBadge = isPolar
        ? `<span class="badge-polarity polar">Polar (${mol.dipole} D)</span>`
        : `<span class="badge-polarity nonpolar">Non-polar</span>`;

      card.innerHTML = `
        <div class="mol-card-header">
          <span class="mol-formula">${mol.formula}</span>
          ${polarityBadge}
        </div>
        <div class="mol-name">${mol.name}</div>
        <div class="mol-geo-tag">${mol.molecularGeometry}</div>
      `;

      card.addEventListener("click", () => this.selectMolecule(mol.id));
      listContainer.appendChild(card);
    });
  }

  selectMolecule(id) {
    const mol = REAL_MOLECULES.find((m) => m.id === id);
    if (!mol) return;

    this.selectedMolId = id;

    // Highlight card
    document.querySelectorAll(".real-mol-card").forEach((c) => {
      c.classList.toggle("active", c.dataset.id === id);
    });

    // Update details panel
    const titleEl = document.getElementById("real-detail-title");
    if (titleEl) titleEl.textContent = `${mol.formula} - ${mol.name}`;

    const centralEl = document.getElementById("real-val-central");
    if (centralEl) centralEl.textContent = mol.centralAtom;

    const snEl = document.getElementById("real-val-sn");
    if (snEl) snEl.textContent = mol.stericNumber;

    const egEl = document.getElementById("real-val-eg");
    if (egEl) egEl.textContent = mol.electronGeometry;

    const mgEl = document.getElementById("real-val-mg");
    if (mgEl) mgEl.textContent = mol.molecularGeometry;

    const angleEl = document.getElementById("real-val-angle");
    if (angleEl) angleEl.textContent = mol.bondAngle;

    const lengthEl = document.getElementById("real-val-length");
    if (lengthEl) lengthEl.textContent = mol.bondLength;

    const dipoleEl = document.getElementById("real-val-dipole");
    if (dipoleEl) dipoleEl.textContent = `${mol.dipole} Debye (${mol.polarity})`;

    const descEl = document.getElementById("real-val-desc");
    if (descEl) descEl.textContent = mol.description;

    // Render in 3D
    this.stage.renderRealMolecule(mol);
  }

  activate() {
    this.renderList();
    this.selectMolecule(this.selectedMolId);
  }
}
