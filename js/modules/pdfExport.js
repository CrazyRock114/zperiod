// ====================================================================
// pdfExport.js — worksheet PDF export using jsPDF
// ====================================================================

import { jsPDF } from 'jspdf';

export function exportWorksheetPDF({ questions, includeAnswerKey, difficulty, type, count }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Zperiod Worksheet — Equation Practice', margin, y);
  y += 24;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Type: ${type}  ·  Questions: ${count}  ·  Difficulty: ${difficulty}`, margin, y);
  y += 8;
  doc.setDrawColor(150);
  doc.line(margin, y, W - margin, y);
  y += 16;

  // Name / Date line
  doc.setFontSize(12);
  doc.text('Name: ____________________________     Date: ____________', margin, y);
  y += 24;

  // Questions
  doc.setFontSize(12);
  questions.forEach((q, i) => {
    if (y > 760) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', 'bold');
    doc.text(`Question ${i + 1}`, margin, y);
    doc.setFont('helvetica', 'normal');
    y += 16;
    doc.setFontSize(13);
    doc.text(q.equation, margin + 16, y);
    y += 18;
    if (q.choices) {
      doc.setFontSize(11);
      const choiceLines = q.choices.map((c, idx) => `  ${String.fromCharCode(65 + idx)}. ${c}`);
      choiceLines.forEach(line => {
        if (y > 780) { doc.addPage(); y = margin; }
        doc.text(line, margin + 16, y);
        y += 14;
      });
    }
    y += 12;
    // Working space line
    if (y > 780) { doc.addPage(); y = margin; }
    doc.setDrawColor(200);
    doc.line(margin, y, W - margin, y);
    y += 18;
  });

  if (includeAnswerKey) {
    doc.addPage();
    y = margin;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Answer Key', margin, y);
    y += 22;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    questions.forEach((q, i) => {
      if (y > 760) { doc.addPage(); y = margin; }
      doc.setFont('helvetica', 'bold');
      doc.text(`${i + 1}.`, margin, y);
      doc.setFont('helvetica', 'normal');
      const answerLine = q.answerStr + (q.answer ? `  (${q.answer})` : '');
      doc.text(answerLine, margin + 24, y, { maxWidth: W - margin * 2 - 24 });
      y += 22;
    });
  }

  doc.save(`zperiod-worksheet-${type}-${count}q.pdf`);
}