/**
 * Molecular Shapes - Screen Practice Controller
 * Interactive VSEPR Quiz Mode with instant grading, score & streak tracking,
 * real-time 3D molecule inspection, and explanations.
 * Zero-CJK compliant.
 */

import { REAL_MOLECULES } from "./data.js";
import { t } from "./i18n.js";

export class ScreenPractice {
  constructor(stage) {
    this.stage = stage;
    this.score = 0;
    this.streak = 0;
    this.currentQuestion = null;
    this.answered = false;

    this.initDOM();
  }

  initDOM() {
    document.getElementById("quiz-next-btn")?.addEventListener("click", () => this.generateQuestion());
  }

  generateQuestion() {
    this.answered = false;

    // Pick a random molecule from library
    const randIdx = Math.floor(Math.random() * REAL_MOLECULES.length);
    const mol = REAL_MOLECULES[randIdx];

    // Pick question type (0: Molecular Geometry, 1: Electron Geometry, 2: Polarity, 3: Hybridization)
    const qTypes = ["molecular_geo", "electron_geo", "polarity", "hybridization"];
    const qType = qTypes[Math.floor(Math.random() * qTypes.length)];

    let promptText = "";
    let correctAnswer = "";
    let distractorPool = [];
    let explanation = "";

    if (qType === "molecular_geo") {
      promptText = `What is the molecular geometry of ${mol.formula} (${mol.name})?`;
      correctAnswer = mol.molecularGeometry;
      distractorPool = [
        "Linear",
        "Trigonal Planar",
        "Bent",
        "Tetrahedral",
        "Trigonal Pyramidal",
        "Trigonal Bipyramidal",
        "See-saw",
        "T-shaped",
        "Octahedral",
        "Square Pyramidal",
        "Square Planar"
      ];
      explanation = `${mol.formula} has ${mol.bondingCount} bonding pair(s) and ${mol.lonePairCount} lone pair(s) on central atom ${mol.centralAtom}. Its steric number is ${mol.stericNumber}, yielding a ${mol.molecularGeometry} molecular geometry.`;
    } else if (qType === "electron_geo") {
      promptText = `What is the electron-pair geometry of ${mol.formula}?`;
      correctAnswer = mol.electronGeometry;
      distractorPool = ["Linear", "Trigonal Planar", "Tetrahedral", "Trigonal Bipyramidal", "Octahedral"];
      explanation = `The steric number of ${mol.formula} is ${mol.stericNumber} (${mol.bondingCount} bonds + ${mol.lonePairCount} lone pairs), which corresponds to ${mol.electronGeometry} electron geometry.`;
    } else if (qType === "polarity") {
      promptText = `Is ${mol.formula} (${mol.name}) polar or non-polar?`;
      correctAnswer = mol.polarity;
      distractorPool = ["Polar", "Non-polar"];
      explanation = mol.polarity === "Polar"
        ? `${mol.formula} has a net dipole moment of ${mol.dipole} Debye because its bond polarities do not cancel out.`
        : `${mol.formula} is non-polar (${mol.dipole} D) due to high molecular symmetry where opposing bond dipoles cancel out.`;
    } else {
      const hybridMap = { 2: "sp", 3: "sp2", 4: "sp3", 5: "sp3d", 6: "sp3d2", 1: "s" };
      promptText = `What is the hybridization of the central atom in ${mol.formula}?`;
      correctAnswer = hybridMap[mol.stericNumber] || "sp3";
      distractorPool = ["sp", "sp2", "sp3", "sp3d", "sp3d2"];
      explanation = `Central atom ${mol.centralAtom} has steric number ${mol.stericNumber}, requiring ${mol.stericNumber} hybrid orbitals (${correctAnswer}).`;
    }

    // Assemble 4 distinct options
    const options = [correctAnswer];
    const filteredDistractors = distractorPool.filter((d) => d !== correctAnswer);
    // Shuffle distractors
    filteredDistractors.sort(() => 0.5 - Math.random());

    for (let i = 0; i < filteredDistractors.length && options.length < Math.min(4, distractorPool.length); i++) {
      options.push(filteredDistractors[i]);
    }
    // Shuffle options
    options.sort(() => 0.5 - Math.random());

    this.currentQuestion = {
      mol,
      promptText,
      correctAnswer,
      options,
      explanation
    };

    // Render molecule in 3D stage for user inspection
    this.stage.renderRealMolecule(mol);

    this.renderUI();
  }

  renderUI() {
    const promptEl = document.getElementById("quiz-prompt-text");
    if (promptEl) promptEl.textContent = this.currentQuestion.promptText;

    const optionsContainer = document.getElementById("quiz-options-container");
    if (!optionsContainer) return;

    optionsContainer.innerHTML = "";
    this.currentQuestion.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "quiz-opt-btn";
      btn.textContent = opt;
      btn.addEventListener("click", () => this.handleAnswer(opt, btn));
      optionsContainer.appendChild(btn);
    });

    // Reset feedback card
    const feedbackCard = document.getElementById("quiz-feedback-card");
    if (feedbackCard) feedbackCard.style.display = "none";

    const nextBtn = document.getElementById("quiz-next-btn");
    if (nextBtn) nextBtn.style.display = "none";

    // Update score/streak displays
    const scoreVal = document.getElementById("quiz-score-val");
    if (scoreVal) scoreVal.textContent = this.score;

    const streakVal = document.getElementById("quiz-streak-val");
    if (streakVal) streakVal.textContent = this.streak;
  }

  handleAnswer(selected, selectedBtn) {
    if (this.answered) return;
    this.answered = true;

    const isCorrect = selected === this.currentQuestion.correctAnswer;
    if (isCorrect) {
      this.score += 10;
      this.streak += 1;
      selectedBtn.classList.add("correct");
    } else {
      this.streak = 0;
      selectedBtn.classList.add("incorrect");
      // Highlight the right answer
      document.querySelectorAll(".quiz-opt-btn").forEach((btn) => {
        if (btn.textContent === this.currentQuestion.correctAnswer) {
          btn.classList.add("correct");
        }
      });
    }

    // Update score/streak
    const scoreVal = document.getElementById("quiz-score-val");
    if (scoreVal) scoreVal.textContent = this.score;

    const streakVal = document.getElementById("quiz-streak-val");
    if (streakVal) streakVal.textContent = this.streak;

    // Show feedback
    const feedbackCard = document.getElementById("quiz-feedback-card");
    const feedbackTitle = document.getElementById("quiz-feedback-title");
    const feedbackText = document.getElementById("quiz-feedback-text");
    if (feedbackCard && feedbackTitle && feedbackText) {
      feedbackCard.style.display = "flex";
      feedbackCard.className = `quiz-feedback-card ${isCorrect ? "success" : "failure"}`;
      feedbackTitle.textContent = isCorrect ? t("practice.correct") : t("practice.incorrect");
      feedbackText.textContent = this.currentQuestion.explanation;
    }

    const nextBtn = document.getElementById("quiz-next-btn");
    if (nextBtn) nextBtn.style.display = "inline-flex";
  }

  activate() {
    this.generateQuestion();
  }
}
