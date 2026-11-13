/**
 * Molecular Shapes - Screen Model Controller
 * Interactive theoretical VSEPR model assembly.
 * Dynamically adjusts bonding atoms & lone pairs with real-time 3D relaxation.
 * Zero-CJK compliant.
 */

import { calculateVSEPR } from "./vsepr.js";
import { t } from "./i18n.js";

export class ScreenModel {
  constructor(stage) {
    this.stage = stage;
    this.bondingCount = 2;
    this.lonePairCount = 0;

    this.initDOM();
  }

  initDOM() {
    // Buttons for adjusting bonding pairs
    document.getElementById("add-bond-btn")?.addEventListener("click", () => this.changeBonding(1));
    document.getElementById("sub-bond-btn")?.addEventListener("click", () => this.changeBonding(-1));

    // Buttons for adjusting lone pairs
    document.getElementById("add-lp-btn")?.addEventListener("click", () => this.changeLonePair(1));
    document.getElementById("sub-lp-btn")?.addEventListener("click", () => this.changeLonePair(-1));

    // Reset button
    document.getElementById("model-reset-btn")?.addEventListener("click", () => {
      this.bondingCount = 2;
      this.lonePairCount = 0;
      this.update();
    });

    // Checkbox toggles
    const lpToggle = document.getElementById("toggle-lp-checkbox");
    if (lpToggle) {
      lpToggle.checked = true;
      lpToggle.addEventListener("change", (e) => {
        this.stage.setShowLonePairs(e.target.checked);
      });
    }

    const angleToggle = document.getElementById("toggle-angle-checkbox");
    if (angleToggle) {
      angleToggle.checked = true;
      angleToggle.addEventListener("change", (e) => {
        this.stage.setShowAngles(e.target.checked);
      });
    }

    this.update();
  }

  changeBonding(delta) {
    const nextB = this.bondingCount + delta;
    const nextSN = nextB + this.lonePairCount;
    if (nextB >= 1 && nextB <= 6 && nextSN >= 2 && nextSN <= 6) {
      this.bondingCount = nextB;
      this.update();
    }
  }

  changeLonePair(delta) {
    const nextL = this.lonePairCount + delta;
    const nextSN = this.bondingCount + nextL;
    if (nextL >= 0 && nextL <= 4 && nextSN >= 2 && nextSN <= 6) {
      this.lonePairCount = nextL;
      this.update();
    }
  }

  update() {
    const sn = this.bondingCount + this.lonePairCount;
    const vsepr = calculateVSEPR(this.bondingCount, this.lonePairCount);

    // Update count labels
    const bCountEl = document.getElementById("bond-count-val");
    if (bCountEl) bCountEl.textContent = this.bondingCount;

    const lpCountEl = document.getElementById("lp-count-val");
    if (lpCountEl) lpCountEl.textContent = this.lonePairCount;

    const snValEl = document.getElementById("model-sn-val");
    if (snValEl) snValEl.textContent = sn;

    // Update VSEPR result badges
    const egValEl = document.getElementById("model-eg-val");
    if (egValEl) egValEl.textContent = vsepr.electronGeometry;

    const mgValEl = document.getElementById("model-mg-val");
    if (mgValEl) mgValEl.textContent = vsepr.molecularGeometry;

    const angleValEl = document.getElementById("model-angle-val");
    if (angleValEl) angleValEl.textContent = `${vsepr.idealAngle}°`;

    const hybridValEl = document.getElementById("model-hybrid-val");
    if (hybridValEl) hybridValEl.textContent = vsepr.hybridization;

    const axeValEl = document.getElementById("model-axe-val");
    if (axeValEl) axeValEl.textContent = vsepr.formulaAXE;

    // Render 3D model
    this.stage.renderVseprModel(this.bondingCount, this.lonePairCount);
  }

  activate() {
    this.update();
  }
}
