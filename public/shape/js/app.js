/**
 * Molecular Shapes - Main Application Controller
 * Coordinates mode switching between Model, Real Molecules, VSEPR Guide, and Quiz.
 * Zero-CJK compliant.
 */

import { MoleculeStage } from "./stage.js";
import { ScreenModel } from "./screen-model.js";
import { ScreenReal } from "./screen-real.js";
import { ScreenPractice } from "./screen-practice.js";
import { applyTranslations, setLocale, getLocale } from "./i18n.js";

class MolecularShapesApp {
  constructor() {
    this.stage = null;
    this.screenModel = null;
    this.screenReal = null;
    this.screenPractice = null;
    this.currentMode = "model";

    this.init();
  }

  init() {
    // 1. Initialize i18n
    applyTranslations();

    // 2. Initialize 3D Stage
    const stageContainer = document.getElementById("stage-container");
    this.stage = new MoleculeStage(stageContainer);

    // 3. Initialize Screens
    this.screenModel = new ScreenModel(this.stage);
    this.screenReal = new ScreenReal(this.stage);
    this.screenPractice = new ScreenPractice(this.stage);

    // 4. Bind Top Navigation & Mode Switcher
    this.bindNav();
    this.bindModes();

    // Default to Model mode
    this.switchMode("model");
  }

  bindNav() {
    // Reset View Button
    document.getElementById("reset-view-btn")?.addEventListener("click", () => {
      this.stage?.resetView();
    });

    // Auto Rotate Button
    const autoRotateBtn = document.getElementById("auto-rotate-btn");
    if (autoRotateBtn) {
      let isAuto = false;
      autoRotateBtn.addEventListener("click", () => {
        isAuto = !isAuto;
        this.stage?.setAutoRotate(isAuto);
        autoRotateBtn.classList.toggle("active", isAuto);
      });
    }

    // Language Toggle
    document.getElementById("lang-toggle")?.addEventListener("click", () => {
      const cur = getLocale();
      const next = cur === "en" ? "zh" : "en";
      setLocale(next);
      // Re-render current mode to update localized texts
      if (this.currentMode === "model") this.screenModel?.update();
      if (this.currentMode === "real") this.screenReal?.renderList();
    });
  }

  bindModes() {
    document.querySelectorAll(".mode-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetMode = btn.dataset.tab;
        this.switchMode(targetMode);
      });
    });
  }

  switchMode(mode) {
    this.currentMode = mode;

    // Update tab buttons
    document.querySelectorAll(".mode-tab-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === mode);
    });

    // Update view visibility
    document.querySelectorAll(".screen-view").forEach((view) => {
      view.classList.toggle("active", view.id === `view-${mode}`);
    });

    // Trigger mode-specific activation
    if (mode === "model") {
      this.screenModel?.activate();
    } else if (mode === "real") {
      this.screenReal?.activate();
    } else if (mode === "learn") {
      // In learn mode, display benchmark methane tetrahedral
      this.screenModel?.activate();
    } else if (mode === "practice") {
      this.screenPractice?.activate();
    }
  }
}

// Bootstrap when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new MolecularShapesApp();
});
