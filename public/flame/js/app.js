/**
 * Flame Studio - Main Application Controller
 * Manages laboratory bench interactions, burner controls, spectroscope, and audio.
 * Zero-CJK compliant (all localized strings handled via i18n module).
 */

import { METAL_DATA, BURNER_STATES } from "./data.js";
import { FlameRenderer } from "./renderer.js";
import { FlameAudio } from "./audio.js";
import { applyTranslations, setLocale, getLocale, t } from "./i18n.js";

class FlameStudioApp {
  constructor() {
    this.canvas = document.getElementById("stage");
    this.renderer = new FlameRenderer(this.canvas);
    this.audio = new FlameAudio();

    this.selectedMetalId = "na"; // default to Sodium
    this.currentBurnerState = "roaring"; // default to non-luminous flame
    this.isSpectroscopeOpen = false;
    this.isCobaltActive = false;
    this.isMuted = false;

    this.init();
  }

  init() {
    // 1. Initialize i18n
    applyTranslations();

    // 2. Start renderer
    this.renderer.start();
    this.renderer.setAirHole(1.0); // start with roaring blue flame

    // 3. Bind UI DOM Events
    this.bindControls();
    this.bindReagentDishes();
    this.bindTopNav();
    this.updateSpectroscope();
    this.updateStatusBadge("bench.loopClean");

    // 4. Keyboard shortcuts
    window.addEventListener("keydown", (e) => {
      if (e.key === "c" || e.key === "C") this.toggleCobaltGlass();
      if (e.key === "s" || e.key === "S") this.toggleSpectroscope();
      if (e.key === "m" || e.key === "M") this.toggleAudio();
      if (e.key === " ") {
        e.preventDefault();
        this.runFlameTest();
      }
    });
  }

  bindTopNav() {
    // Cobalt Glass Toggle
    const cobaltBtn = document.getElementById("cobalt-glass-toggle");
    if (cobaltBtn) {
      cobaltBtn.addEventListener("click", () => this.toggleCobaltGlass());
    }

    // Spectroscope Toggle
    const spectroBtn = document.getElementById("spectroscope-toggle");
    if (spectroBtn) {
      spectroBtn.addEventListener("click", () => this.toggleSpectroscope());
    }

    // Audio Mute Toggle
    const audioBtn = document.getElementById("audio-toggle");
    if (audioBtn) {
      audioBtn.addEventListener("click", () => this.toggleAudio());
    }

    // Language Toggle
    const langBtn = document.getElementById("lang-toggle");
    if (langBtn) {
      langBtn.addEventListener("click", () => {
        const cur = getLocale();
        const next = cur === "en" ? "zh" : "en";
        setLocale(next);
        this.updateSpectroscope();
      });
    }

    // Clean Wire Loop Button
    const cleanBtn = document.getElementById("clean-loop-btn");
    if (cleanBtn) {
      cleanBtn.addEventListener("click", () => this.cleanLoop());
    }
  }

  bindControls() {
    // Air collar slider
    const collarSlider = document.getElementById("air-collar-slider");
    const flameStateText = document.getElementById("flame-state-text");
    const flameTempText = document.getElementById("flame-temp-text");

    if (collarSlider) {
      collarSlider.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        this.renderer.setAirHole(val);
        this.audio.updateBurner(val);

        if (val < 0.35) {
          flameStateText.textContent = t("burner.safety");
          flameTempText.textContent = "300 °C (Safety Flame)";
        } else if (val < 0.75) {
          flameStateText.textContent = t("burner.gentle");
          flameTempText.textContent = "700 °C (Medium Blue)";
        } else {
          flameStateText.textContent = t("burner.roaring");
          flameTempText.textContent = "1350 °C (Roaring Blue)";
        }
      });
    }

    // Burner Preset Buttons
    document.querySelectorAll(".flame-preset-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".flame-preset-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const preset = btn.dataset.preset;
        const state = BURNER_STATES[preset];
        if (state && collarSlider) {
          collarSlider.value = state.airHole;
          collarSlider.dispatchEvent(new Event("input"));
        }
      });
    });

    // Action Buttons
    const dipBtn = document.getElementById("dip-sample-btn");
    if (dipBtn) {
      dipBtn.addEventListener("click", () => this.dipSample(this.selectedMetalId));
    }

    const burnBtn = document.getElementById("burn-flame-btn");
    if (burnBtn) {
      burnBtn.addEventListener("click", () => this.runFlameTest());
    }

    const autoBtn = document.getElementById("auto-sequence-btn");
    if (autoBtn) {
      autoBtn.addEventListener("click", () => this.runAutoSequence());
    }
  }

  bindReagentDishes() {
    document.querySelectorAll(".dish-card").forEach((dish) => {
      dish.addEventListener("click", () => {
        document.querySelectorAll(".dish-card").forEach((d) => d.classList.remove("selected"));
        dish.classList.add("selected");
        this.selectedMetalId = dish.dataset.metal;
        this.updateSpectroscope();
      });
    });

    // HCl dish click -> clean
    const hclDish = document.getElementById("hcl-dish");
    if (hclDish) {
      hclDish.addEventListener("click", () => this.cleanLoop());
    }
  }

  cleanLoop() {
    this.audio.init();
    this.renderer.setLoopPosition("acid");
    this.updateStatusBadge("bench.loopClean");
    setTimeout(() => {
      this.renderer.setLoopPosition("bench");
    }, 600);
  }

  dipSample(metalId) {
    this.audio.init();
    const metal = METAL_DATA[metalId];
    if (!metal) return;

    this.renderer.setLoopPosition("sample", metal.id);
    this.updateStatusBadge("bench.loopLoaded", metal.compound);
    setTimeout(() => {
      this.renderer.setLoopPosition("bench", metal.id);
    }, 600);
  }

  runFlameTest() {
    this.audio.init();
    const metal = METAL_DATA[this.selectedMetalId];
    if (!metal) return;

    // Move wire into flame
    this.renderer.setLoopPosition("flame", metal.id);
    this.renderer.setActiveIon(metal);
    this.updateStatusBadge("bench.loopBurning", metal.compound);

    // Audio crackle
    this.audio.playCrackle(0.7, 3.5);

    // After duration, return to bench
    setTimeout(() => {
      if (this.renderer.loopState === "flame") {
        this.renderer.setLoopPosition("bench");
        this.updateStatusBadge("bench.loopClean");
      }
    }, metal.durationMs);
  }

  runAutoSequence() {
    // 1. Clean in HCl
    this.cleanLoop();

    // 2. Dip in sample
    setTimeout(() => {
      this.dipSample(this.selectedMetalId);

      // 3. Insert into flame
      setTimeout(() => {
        this.runFlameTest();
      }, 700);
    }, 700);
  }

  toggleCobaltGlass() {
    this.isCobaltActive = !this.isCobaltActive;
    this.renderer.setCobaltGlass(this.isCobaltActive);
    const btn = document.getElementById("cobalt-glass-toggle");
    if (btn) {
      btn.classList.toggle("active", this.isCobaltActive);
      btn.setAttribute("aria-pressed", this.isCobaltActive ? "true" : "false");
    }
  }

  toggleSpectroscope() {
    this.isSpectroscopeOpen = !this.isSpectroscopeOpen;
    const panel = document.getElementById("spectroscope-panel");
    const btn = document.getElementById("spectroscope-toggle");
    if (panel) {
      panel.classList.toggle("open", this.isSpectroscopeOpen);
    }
    if (btn) {
      btn.classList.toggle("active", this.isSpectroscopeOpen);
      btn.setAttribute("aria-pressed", this.isSpectroscopeOpen ? "true" : "false");
    }
  }

  toggleAudio() {
    this.audio.init();
    this.isMuted = this.audio.toggleMute();
    const btn = document.getElementById("audio-toggle");
    if (btn) {
      btn.classList.toggle("muted", this.isMuted);
      btn.setAttribute("aria-pressed", this.isMuted ? "false" : "true");
    }
  }

  updateStatusBadge(transKey, extra = "") {
    const badge = document.getElementById("loop-status-text");
    if (!badge) return;
    const base = t(transKey);
    badge.textContent = extra ? `${base} ${extra}` : base;
  }

  updateSpectroscope() {
    const metal = METAL_DATA[this.selectedMetalId];
    if (!metal) return;

    const canvas = document.getElementById("spectrum-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Continuous Solar Spectrum Background (380nm to 780nm)
    const minWl = 380;
    const maxWl = 780;
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0.0, "rgb(60, 0, 100)");    // 380nm
    grad.addColorStop(0.12, "rgb(0, 0, 255)");     // 430nm
    grad.addColorStop(0.28, "rgb(0, 220, 255)");   // 490nm
    grad.addColorStop(0.42, "rgb(0, 255, 0)");     // 550nm
    grad.addColorStop(0.52, "rgb(255, 255, 0)");   // 590nm
    grad.addColorStop(0.68, "rgb(255, 120, 0)");   // 650nm
    grad.addColorStop(0.9, "rgb(255, 0, 0)");      // 740nm
    grad.addColorStop(1.0, "rgb(80, 0, 0)");       // 780nm

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, 14);

    // 2. Black slit backdrop for emission lines
    ctx.fillStyle = "#050508";
    ctx.fillRect(0, 14, w, h - 14);

    // 3. Draw discrete emission lines
    metal.spectralLines.forEach((line) => {
      const x = ((line.wavelength - minWl) / (maxWl - minWl)) * w;
      const alpha = 0.35 + line.intensity * 0.65;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(x, 14);
      ctx.lineTo(x, h - 18);
      ctx.stroke();

      // Spectral wavelength label
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.globalAlpha = 0.9;
      ctx.fillText(`${Math.round(line.wavelength)}`, x, h - 5);
      ctx.restore();
    });

    // Update Spectroscope Information Card
    const infoContainer = document.getElementById("spectrum-lines-list");
    if (infoContainer) {
      infoContainer.innerHTML = "";
      metal.spectralLines.forEach((l) => {
        const div = document.createElement("div");
        div.className = "spectral-line-item";
        div.innerHTML = `
          <span class="line-swatch" style="background:${l.color}"></span>
          <span class="line-label">${l.label}</span>
          <span class="line-intensity">Rel. Int: ${(l.intensity * 100).toFixed(0)}%</span>
        `;
        infoContainer.appendChild(div);
      });
    }

    // Update syllabus note
    const noteEl = document.getElementById("spectrum-note");
    if (noteEl) {
      noteEl.textContent = metal.igcseNote;
    }
  }
}

// Bootstrap once DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new FlameStudioApp();
});
