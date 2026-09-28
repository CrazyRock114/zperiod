/**
 * Worksheet generation, PDF export and printable HTML.
 *
 * `generateWorksheet` is deterministic: the same config and the same seed always
 * produce the same worksheet, in the same order, with no duplicated question.
 */

import { pickReactions, hashString, mulberry32, type Difficulty, type PickReactionsConfig } from './reactions';
import { balanceEquation, classifyReaction, explainReactionType, describeStoichiometry } from './equation';
import type { ExerciseType, ReactionTemplate, ReactionType, Worksheet, WorksheetConfig, WorksheetQuestion } from '../../types/chem';

export type { Worksheet, WorksheetConfig, WorksheetQuestion, ReactionTemplate, ReactionType, ExerciseType };

/* ------------------------------------------------------------------ */
/* Seed handling                                                       */
/* ------------------------------------------------------------------ */

/** Derive a numeric seed from the config plus an optional caller seed. */
export function worksheetSeed(config: WorksheetConfig, seed?: number | string): number {
  const base = [
    config.exerciseType,
    config.count,
    config.difficulty,
    config.title,
    config.locale,
    [...config.reactionTypes].sort().join(','),
  ].join('|');
  const configHash = hashString(base);
  const extra = seed === undefined ? 0 : (typeof seed === 'number' ? seed >>> 0 : hashString(String(seed)));
  return (configHash ^ Math.imul(extra + 0x9e3779b9, 0x85ebca6b)) >>> 0;
}

/* ------------------------------------------------------------------ */
/* Question building                                                   */
/* ------------------------------------------------------------------ */

const TYPE_LABELS: Record<ReactionType, string> = {
  synthesis: 'synthesis',
  decomposition: 'decomposition',
  'single-replacement': 'single replacement',
  'double-replacement': 'double replacement',
  combustion: 'combustion',
};

/** How many questions of each kind a worksheet needs. */
export function exerciseSplit(config: WorksheetConfig): { balance: number; identify: number } {
  if (config.exerciseType === 'balance') return { balance: config.count, identify: 0 };
  if (config.exerciseType === 'identify') return { balance: 0, identify: config.count };
  // combined: an even mix, with the odd extra question going to balancing.
  const balance = Math.ceil(config.count / 2);
  return { balance, identify: config.count - balance };
}

function buildQuestion(
  template: ReactionTemplate,
  type: 'balance' | 'identify',
  index: number,
): WorksheetQuestion {
  if (type === 'balance') {
    return {
      index,
      type: 'balance',
      reactionType: template.type,
      prompt: `Balance this equation:\n${template.unbalanced}`,
      answer: template.balanced,
      explanation: describeExplanation(template),
      difficulty: template.difficulty,
    };
  }

  const explanation = explainReactionType(template.balancedPlain, template.type);
  return {
    index,
    type: 'identify',
    reactionType: template.type,
    prompt: `Name the type of reaction:\n${template.balanced}`,
    answer: TYPE_LABELS[template.type],
    explanation: explanation || `This is a ${TYPE_LABELS[template.type]} reaction.`,
    difficulty: template.difficulty,
  };
}

function describeExplanation(template: ReactionTemplate): string {
  const balanced = balanceEquation(template.balancedPlain);
  const products = balanced.ok ? describeStoichiometry(balanced) : '';
  const pattern = explainReactionType(template.balancedPlain, template.type);
  const bits = [pattern];
  if (products) bits.push(`It produces ${products}.`);
  return bits.filter(Boolean).join(' ');
}

/* ------------------------------------------------------------------ */
/* generateWorksheet                                                   */
/* ------------------------------------------------------------------ */

export const DEFAULT_WORKSHEET_CONFIG: WorksheetConfig = {
  exerciseType: 'combined',
  count: 10,
  reactionTypes: ['synthesis', 'decomposition', 'single-replacement', 'double-replacement', 'combustion'],
  difficulty: 'easy',
  includeAnswerKey: true,
  includeSolutions: false,
  title: 'Chemical Equations Worksheet',
  locale: 'en',
};

/**
 * Build a worksheet.
 *
 * Deduplicates by reaction, honours `count` / `reactionTypes` / `difficulty`,
 * and is fully deterministic for a given `(config, seed)` pair.
 */
export function generateWorksheet(config: WorksheetConfig, seed?: number | string): Worksheet {
  const resolved: WorksheetConfig = {
    ...DEFAULT_WORKSHEET_CONFIG,
    ...config,
    reactionTypes: config.reactionTypes?.length
      ? [...config.reactionTypes]
      : [...DEFAULT_WORKSHEET_CONFIG.reactionTypes],
  };

  const wanted = exerciseSplit(resolved);
  const total = wanted.balance + wanted.identify;
  const numericSeed = worksheetSeed(resolved, seed);

  // Take a generous slice of the bank, then interleave it deterministically so
  // the two exercise types alternate when possible.
  const pickConfig: PickReactionsConfig = {
    count: total * 3,
    reactionTypes: resolved.reactionTypes,
    difficulty: resolved.difficulty as Difficulty,
    seed: numericSeed,
  };
  const pool = pickReactions(pickConfig);

  // A stable secondary shuffle: the type index first, then the seeded rank.
  const ordered = pool
    .map((template, rank) => ({
      template,
      rank,
      typeIndex: resolved.reactionTypes.indexOf(template.type),
    }))
    .sort((a, b) => a.typeIndex - b.typeIndex || a.rank - b.rank);

  const questions: WorksheetQuestion[] = [];
  const used = new Set<string>();

  /** Take the next unused template from the ordered pool. */
  const take = (): ReactionTemplate | null => {
    for (const { template } of ordered) {
      if (used.has(template.balancedPlain)) continue;
      used.add(template.balancedPlain);
      return template;
    }
    return null;
  };

  // Interleave the two exercise kinds so a `combined` worksheet alternates
  // between them instead of grouping every balance before every name-the-type.
  let balanceLeft = wanted.balance;
  let identifyLeft = wanted.identify;
  let balanceFirst = true;

  while (balanceLeft > 0 || identifyLeft > 0) {
    const wantBalance = balanceLeft > 0 && identifyLeft > 0 ? balanceFirst : balanceLeft > 0;
    if (wantBalance) balanceFirst = !balanceFirst;

    const template = take();
    if (!template) break;

    if (wantBalance) {
      questions.push(buildQuestion(template, 'balance', questions.length + 1));
      balanceLeft -= 1;
    } else {
      questions.push(buildQuestion(template, 'identify', questions.length + 1));
      identifyLeft -= 1;
    }
  }

  questions.sort((a, b) => a.index - b.index);
  questions.forEach((q, i) => {
    q.index = i + 1;
  });

  return {
    config: resolved,
    questions,
    createdAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

const FALLBACK_LABELS: Record<string, string> = {
  'worksheet.title': 'Chemical Equations Worksheet',
  'worksheet.name': 'Name',
  'worksheet.date': 'Date',
  'worksheet.class': 'Class',
  'worksheet.instructions': 'Balance each equation and name the type of reaction.',
  'worksheet.answerKey': 'Answer Key',
  'worksheet.workedSolutions': 'Worked Solutions',
  'worksheet.question': 'Question',
  'worksheet.answer': 'Answer',
  'worksheet.explanation': 'Why',
  'worksheet.balance': 'balance',
  'worksheet.identify': 'reaction type',
  'worksheet.generatedBy': 'Generated by Zperiod',
  'worksheet.page': 'Page',
};

function label(t: ((key: string) => string) | undefined, key: string): string {
  const fallback = FALLBACK_LABELS[key] ?? key;
  if (!t) return fallback;
  try {
    const value = t(key);
    if (typeof value === 'string' && value !== '' && value !== key) return value;
  } catch {
    // A missing translation must never break the export.
  }
  return fallback;
}

/* ------------------------------------------------------------------ */
/* PDF export                                                          */
/* ------------------------------------------------------------------ */

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 42;
const COL_GAP = 18;

/** jsPDF is loaded lazily so importing this module stays cheap. */
async function loadJsPdf(): Promise<any> {
  const mod = await import('jspdf');
  const ctor = (mod as any)?.jsPDF ?? (mod as any)?.default ?? (mod as any)?.default?.jsPDF;
  if (typeof ctor !== 'function') throw new Error('jspdf did not export a constructor');
  return ctor;
}

/**
 * Render a worksheet to a real, multi-page PDF.
 *
 * A4, two columns, automatic page breaks, an optional answer key page and an
 * optional worked-solutions page. Sized so that 50 questions fit comfortably.
 */
export async function exportWorksheetToPdf(
  worksheet: Worksheet,
  t: (key: string) => string = (key) => key,
): Promise<Blob> {
  const JsPdf = await loadJsPdf();
  const doc = new JsPdf({ unit: 'pt', format: 'a4', compress: true });

  const columnWidth = (A4.width - MARGIN * 2 - COL_GAP) / 2;
  const title = worksheet.config.title || label(t, 'worksheet.title');

  let page = 1;
  let column = 0;
  let y = 0;

  const newPage = (): void => {
    doc.addPage();
    page += 1;
    column = 0;
    y = MARGIN + 24;
  };

  const ensureSpace = (needed: number): void => {
    if (column === 0 && y > MARGIN) return;
    if (y + needed > A4.height - MARGIN) {
      if (column === 0) newPage();
      else {
        column = 1;
        y = MARGIN + 24;
      }
    }
  };

  const colX = (): number => MARGIN + column * (columnWidth + COL_GAP);

  const drawHeader = (): void => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(title, MARGIN, MARGIN + 8);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${label(t, 'worksheet.generatedBy')} · ${label(t, 'worksheet.page')} ${page}`, A4.width - MARGIN, MARGIN + 8, {
      align: 'right',
    });
    doc.setDrawColor(200, 200, 200);
    doc.line(MARGIN, MARGIN + 16, A4.width - MARGIN, MARGIN + 16);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    let x = MARGIN;
    const baseline = MARGIN + 32;
    for (const [key, width] of [
      [label(t, 'worksheet.name'), columnWidth],
      [label(t, 'worksheet.date'), columnWidth * 0.45],
    ] as Array<[string, number]>) {
      doc.text(`${key}: ${'_'.repeat(Math.max(6, Math.floor(width / 6)))}`, x, baseline);
      x += width;
    }

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    const instruction = label(t, worksheet.config.exerciseType === 'balance'
      ? 'worksheet.instructionsBalance'
      : worksheet.config.exerciseType === 'identify'
        ? 'worksheet.instructionsIdentify'
        : 'worksheet.instructionsCombined');
    const lines = doc.splitTextToSize(instruction, A4.width - MARGIN * 2) as string[];
    let iy = baseline + 18;
    for (const line of lines) {
      doc.text(line, MARGIN, iy);
      iy += 12;
    }
    y = iy + 6;
  };

  drawHeader();

  for (const question of worksheet.questions) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);

    const stem =
      question.type === 'balance'
        ? `${label(t, 'worksheet.balance')}:`
        : `${label(t, 'worksheet.identify')}:`;
    const head = `${question.index}. ${stem}`;
    const lines = doc.splitTextToSize(question.prompt, columnWidth - 14) as string[];
    const blockHeight = 14 + lines.length * 12 + 14;

    ensureSpace(blockHeight);
    const x = colX();
    doc.setFont('helvetica', 'bold');
    doc.text(head, x, y);
    doc.setFont('helvetica', 'normal');
    let ly = y + 13;
    for (const line of lines) {
      doc.text(line, x + 8, ly);
      ly += 12;
    }
    doc.setDrawColor(230, 230, 230);
    doc.line(x, ly - 2, x + columnWidth, ly - 2);
    y = ly + 12;
  }

  const newSection = (heading: string): void => {
    doc.addPage();
    page += 1;
    column = 0;
    y = MARGIN + 24;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(heading, MARGIN, y);
    doc.setDrawColor(200, 200, 200);
    doc.line(MARGIN, y + 6, A4.width - MARGIN, y + 6);
    y += 24;
  };

  if (worksheet.config.includeAnswerKey) {
    newSection(label(t, 'worksheet.answerKey'));
    for (const question of worksheet.questions) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      const text = `${question.index}. ${question.answer}`;
      const lines = doc.splitTextToSize(text, columnWidth - 14) as string[];
      const blockHeight = lines.length * 12 + 8;
      ensureSpace(blockHeight);
      doc.setFont('helvetica', 'bold');
      doc.text(`${question.index}.`, colX(), y);
      doc.setFont('helvetica', 'normal');
      let ly = y;
      for (const line of lines) {
        doc.text(line, colX() + 22, ly);
        ly += 12;
      }
      y = ly + 6;
    }
  }

  if (worksheet.config.includeSolutions) {
    newSection(label(t, 'worksheet.workedSolutions'));
    for (const question of worksheet.questions) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const body = question.explanation ? `${question.answer} — ${question.explanation}` : question.answer;
      const lines = doc.splitTextToSize(body, columnWidth - 30) as string[];
      const blockHeight = lines.length * 11 + 10;
      ensureSpace(blockHeight);
      doc.setFont('helvetica', 'bold');
      doc.text(`${question.index}.`, colX(), y);
      doc.setFont('helvetica', 'normal');
      let ly = y;
      for (const line of lines) {
        doc.text(line, colX() + 24, ly);
        ly += 11;
      }
      y = ly + 6;
    }
  }

  return doc.output('blob') as Blob;
}

/* ------------------------------------------------------------------ */
/* Printable HTML                                                      */
/* ------------------------------------------------------------------ */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * A self-contained HTML document for `window.print()`.
 *
 * Includes `@page` rules, a print-only stylesheet, the questions, and the
 * optional answer key / worked solutions sections.
 */
export function buildPrintableHtml(
  worksheet: Worksheet,
  t: (key: string) => string = (key) => key,
): string {
  const title = escapeHtml(worksheet.config.title || label(t, 'worksheet.title'));
  const instruction = escapeHtml(label(t, worksheet.config.exerciseType === 'balance'
      ? 'worksheet.instructionsBalance'
      : worksheet.config.exerciseType === 'identify'
        ? 'worksheet.instructionsIdentify'
        : 'worksheet.instructionsCombined'));

  const questionItems = worksheet.questions
    .map((q) => {
      const stem = q.type === 'balance' ? label(t, 'worksheet.balance') : label(t, 'worksheet.identify');
      const prompt = q.prompt
        .split('\n')
        .map((line) => `<span class="eq">${escapeHtml(line)}</span>`)
        .join('<br/>');
      return `<li class="q ${q.type}"><span class="n">${q.index}.</span> <em>${escapeHtml(stem)}</em><br/>${prompt}</li>`;
    })
    .join('\n');

  const answerItems = worksheet.questions
    .map(
      (q) =>
        `<li><span class="n">${q.index}.</span> <span class="eq">${escapeHtml(q.answer)}</span>${
          q.explanation ? `<div class="why">${escapeHtml(q.explanation)}</div>` : ''
        }</li>`,
    )
    .join('\n');

  const answerSection = worksheet.config.includeAnswerKey
    ? `<section class="answers"><h2>${escapeHtml(label(t, 'worksheet.answerKey'))}</h2><ol>${answerItems}</ol></section>`
    : '';

  const solutionSection = worksheet.config.includeSolutions
    ? `<section class="answers"><h2>${escapeHtml(label(t, 'worksheet.workedSolutions'))}</h2><ol>${worksheet.questions
        .map(
          (q) =>
            `<li><span class="n">${q.index}.</span> <span class="eq">${escapeHtml(q.answer)}</span><div class="why">${escapeHtml(
              q.explanation ?? '',
            )}</div></li>`,
        )
        .join('\n')}</ol></section>`
    : '';

  return `<!doctype html>
<html lang="${escapeHtml(worksheet.config.locale || 'en')}" dir="ltr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  @page { size: A4 portrait; margin: 14mm; }
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    font: 11pt/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #111; margin: 0; padding: 16px; background: #fff;
  }
  h1 { font-size: 17pt; margin: 0 0 4px; }
  h2 { font-size: 13pt; margin: 0 0 10px; }
  .meta { display: flex; gap: 28px; font-size: 10pt; margin: 6px 0 10px; }
  .meta span { flex: 1; border-bottom: 1px solid #999; padding-bottom: 2px; }
  .instructions { font-style: italic; font-size: 10pt; margin-bottom: 12px; }
  .columns { column-count: 2; column-gap: 18mm; }
  ol { margin: 0; padding: 0; list-style: none; }
  li.q { break-inside: avoid; page-break-inside: avoid; margin: 0 0 10px; }
  li.q .n { display: inline-block; min-width: 1.6em; font-weight: 700; }
  li.q em { color: #444; font-style: normal; font-size: 9pt; text-transform: uppercase; letter-spacing: .04em; }
  .eq { font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; white-space: pre-wrap; }
  .answers { break-before: page; page-break-before: always; }
  .answers .why { color: #444; font-size: 9pt; margin-top: 2px; }
  .footer { margin-top: 14px; font-size: 8pt; color: #666; }
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
  }
  @media screen {
    body { max-width: 210mm; margin: 0 auto; }
    .toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
    button { font: inherit; padding: 6px 12px; border-radius: 6px; border: 1px solid #bbb; background: #f6f6f6; cursor: pointer; }
  }
</style>
</head>
<body>
<div class="toolbar no-print">
  <button type="button" onclick="window.print()">Print / Save as PDF</button>
</div>
<header>
  <h1>${title}</h1>
  <div class="meta">
    <span>${escapeHtml(label(t, 'worksheet.name'))}:</span>
    <span>${escapeHtml(label(t, 'worksheet.date'))}:</span>
  </div>
  <div class="instructions">${instruction}</div>
</header>
<main class="columns">
  <ol>${questionItems}</ol>
</main>
${answerSection}
${solutionSection}
<div class="footer">${escapeHtml(label(t, 'worksheet.generatedBy'))} · ${escapeHtml(title)}</div>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* Small helpers used by the UI                                        */
/* ------------------------------------------------------------------ */

/** Reaction type -> the English label used in prompts and answers. */
export function reactionTypeLabel(type: ReactionType): string {
  return TYPE_LABELS[type];
}

/** The type a balanced equation would be classified as, or null. */
export function worksheetAnswerType(balancedPlain: string): ReactionType | null {
  return classifyReaction(balancedPlain);
}

/** Open the printable document in a new window and trigger the print dialog. */
export function printWorksheet(
  worksheet: Worksheet,
  t: (key: string) => string = (key) => key,
): boolean {
  if (typeof window === 'undefined') return false;
  const html = buildPrintableHtml(worksheet, t);
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  win.focus();
  return true;
}

export { mulberry32, hashString };
