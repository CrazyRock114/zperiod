// ====================================================================
// worksheet.js — wire up the Worksheet page UI
// ====================================================================

import {
  generateWorksheet,
  renderWorksheetQuestions,
  renderAnswerKey
} from './worksheetGenerator.js';
import { exportWorksheetPDF } from './pdfExport.js';

let _currentQuestions = [];

export function initWorksheet() {
  const generateBtn = document.getElementById('ws-generate');
  const printBtn = document.getElementById('ws-print');
  const answerKeyBtn = document.getElementById('ws-answer-key');
  const exportBtn = document.getElementById('ws-export-pdf');
  const outputEl = document.getElementById('ws-output');
  if (!generateBtn) return;

  generateBtn.addEventListener('click', () => {
    try {
      const type = document.getElementById('ws-type').value;
      const count = parseInt(document.getElementById('ws-count').value, 10);
      const difficultyMap = { Easy: 1, Medium: 2, Hard: 3 };
      const difficulty = difficultyMap[document.getElementById('ws-difficulty').value] || 2;
      const enabledTypes = [...document.querySelectorAll('.ws-reactions input:checked')]
        .map(cb => cb.value);
      if (!enabledTypes.length) {
        outputEl.innerHTML = `<p style="color:#ef4444;">⚠ Select at least one reaction type.</p>`;
        return;
      }
      _currentQuestions = generateWorksheet({ type, count, difficulty, enabledTypes });
      renderWorksheetQuestions(outputEl, _currentQuestions);
      printBtn.disabled = false;
      answerKeyBtn.disabled = false;
      exportBtn.disabled = false;
    } catch (e) {
      outputEl.innerHTML = `<p style="color:#ef4444;">⚠ ${e.message}</p>`;
    }
  });

  answerKeyBtn.addEventListener('click', () => {
    if (!_currentQuestions.length) return;
    const outputEl = document.getElementById('ws-output');
    const existing = outputEl.innerHTML;
    renderAnswerKey({ innerHTML: '' }, _currentQuestions);
    // Append after existing questions
    const div = document.createElement('div');
    renderAnswerKey(div, _currentQuestions);
    outputEl.appendChild(div.firstChild || div);
  });

  printBtn.addEventListener('click', () => window.print());

  exportBtn.addEventListener('click', () => {
    if (!_currentQuestions.length) return;
    const type = document.getElementById('ws-type').value;
    const count = _currentQuestions.length;
    const difficulty = document.getElementById('ws-difficulty').value;
    exportWorksheetPDF({
      questions: _currentQuestions,
      includeAnswerKey: true,
      type,
      count,
      difficulty
    });
  });
}